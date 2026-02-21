import { prisma, Prisma } from '@hums/database';
import type {
  PaymentMethod,
  PaymentTransactionStatus,
  PaymentSession,
  PaymentTransaction,
} from '@hums/database';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { smsService } from './sms.service.js';
import { notificationService } from './notification.service.js';
import crypto from 'crypto';

// ===========================================
// Types
// ===========================================

export interface PaymentRequest {
  amount: number;
  currency?: string;
  method: PaymentMethod;
  studentId: string;
  invoiceId?: string;
  description?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  sessionId?: string;
  status: PaymentTransactionStatus;
  redirectUrl?: string;
  error?: string;
}

export interface MobileMoneyRequest {
  sessionId: string;
  phone: string;
  provider: PaymentMethod;
}

export interface MobileMoneyResponse {
  success: boolean;
  transactionId?: string;
  status: PaymentTransactionStatus;
  message?: string;
  error?: string;
}

export interface WebhookPayload {
  provider: string;
  transactionId: string;
  status: string;
  amount?: number;
  phone?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  signature?: string;
}

// ===========================================
// Payment Gateway Service Class
// ===========================================

class PaymentGatewayService {
  private readonly sessionTimeout: number;
  private readonly webhookSecret: string;

  constructor() {
    this.sessionTimeout = parseInt(env.PAYMENT_SESSION_TIMEOUT); // 10 minutes
    this.webhookSecret = env.PAYMENT_WEBHOOK_SECRET;
  }

  /**
   * Get available payment methods
   */
  getAvailableMethods(): { method: PaymentMethod; name: string; icon: string; enabled: boolean }[] {
    return [
      {
        method: 'EVC_PLUS',
        name: 'EVC Plus',
        icon: 'mobile',
        enabled: !!env.EVC_MERCHANT_ID,
      },
      {
        method: 'ZAAD',
        name: 'Zaad',
        icon: 'mobile',
        enabled: !!env.ZAAD_MERCHANT_ID,
      },
      {
        method: 'SAHAL',
        name: 'Sahal',
        icon: 'mobile',
        enabled: !!env.SAHAL_MERCHANT_ID,
      },
      {
        method: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        icon: 'bank',
        enabled: true,
      },
      {
        method: 'CARD',
        name: 'Credit/Debit Card',
        icon: 'card',
        enabled: false, // Not yet implemented
      },
    ];
  }

  /**
   * Create a payment session
   */
  async createPaymentSession(
    studentId: string,
    amount: number,
    invoiceId?: string,
    currency: string = 'USD'
  ): Promise<PaymentSession> {
    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // If invoice specified, validate it
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw AppError.notFound('Invoice not found');
      }

      if (invoice.studentId !== studentId) {
        throw AppError.forbidden('Invoice does not belong to this student');
      }
    }

    // Create session
    const session = await prisma.paymentSession.create({
      data: {
        studentId,
        invoiceId,
        amount: new Prisma.Decimal(amount),
        currency,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + this.sessionTimeout),
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        invoice: true,
      },
    });

    return session;
  }

  /**
   * Get payment session
   */
  async getPaymentSession(sessionId: string): Promise<PaymentSession | null> {
    return prisma.paymentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        invoice: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Initiate payment
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { amount, currency = 'USD', method, studentId, invoiceId, metadata } = request;

    // Validate student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Create or get session
    let session = await prisma.paymentSession.findFirst({
      where: {
        studentId,
        invoiceId: invoiceId || null,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      session = await this.createPaymentSession(studentId, amount, invoiceId, currency);
    }

    // Create transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        sessionId: session.id,
        studentId,
        invoiceId,
        amount: new Prisma.Decimal(amount),
        currency,
        method,
        provider: method,
        status: 'PENDING',
        metadata: metadata || Prisma.JsonNull,
      },
    });

    return {
      success: true,
      transactionId: transaction.id,
      sessionId: session.id,
      status: 'PENDING',
    };
  }

  /**
   * Initiate mobile money payment (EVC Plus, ZAAD, SAHAL)
   */
  async initiateMobileMoneyPayment(request: MobileMoneyRequest): Promise<MobileMoneyResponse> {
    const { sessionId, phone, provider } = request;

    // Get session
    const session = await prisma.paymentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { user: true } },
        invoice: true,
      },
    });

    if (!session) {
      throw AppError.notFound('Payment session not found');
    }

    if (session.status !== 'PENDING') {
      throw AppError.badRequest('Payment session is not in pending state');
    }

    if (new Date() > session.expiresAt) {
      throw AppError.badRequest('Payment session has expired');
    }

    // Normalize phone number
    const normalizedPhone = this.normalizePhone(phone);

    // Create transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        sessionId,
        studentId: session.studentId,
        invoiceId: session.invoiceId,
        amount: session.amount,
        currency: session.currency,
        method: provider,
        provider,
        phone: normalizedPhone,
        status: 'PROCESSING',
      },
    });

    // Update session status
    await prisma.paymentSession.update({
      where: { id: sessionId },
      data: { status: 'PROCESSING' },
    });

    // Initiate payment with provider
    try {
      const result = await this.processProviderPayment(
        provider,
        normalizedPhone,
        Number(session.amount),
        transaction.id
      );

      if (result.success) {
        // Update transaction with provider ID
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            providerTxnId: result.providerTxnId,
            status: 'PROCESSING',
          },
        });

        return {
          success: true,
          transactionId: transaction.id,
          status: 'PROCESSING',
          message: 'Payment initiated. Please confirm on your phone.',
        };
      } else {
        // Mark as failed
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            errorMessage: result.error,
          },
        });

        await prisma.paymentSession.update({
          where: { id: sessionId },
          data: { status: 'PENDING' }, // Allow retry
        });

        return {
          success: false,
          transactionId: transaction.id,
          status: 'FAILED',
          error: result.error,
        };
      }
    } catch (error: any) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      return {
        success: false,
        transactionId: transaction.id,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  /**
   * Process webhook callback from payment provider
   */
  async handleWebhook(provider: string, payload: WebhookPayload): Promise<void> {
    // Verify webhook signature
    if (payload.signature && !this.verifyWebhookSignature(provider, payload)) {
      throw AppError.unauthorized('Invalid webhook signature');
    }

    // Find transaction by provider transaction ID or our transaction ID
    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { providerTxnId: payload.transactionId },
          { id: payload.transactionId },
        ],
      },
      include: {
        session: true,
        student: { include: { user: true } },
        invoice: true,
      },
    });

    if (!transaction) {
      console.warn(`Transaction not found for webhook: ${payload.transactionId}`);
      return;
    }

    // Map provider status to our status
    const status = this.mapProviderStatus(payload.status);

    // Update transaction
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        errorMessage: status === 'FAILED' ? payload.status : null,
      },
    });

    // Update session
    if (transaction.sessionId) {
      await prisma.paymentSession.update({
        where: { id: transaction.sessionId },
        data: {
          status,
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });
    }

    // If completed, create payment record and send notifications
    if (status === 'COMPLETED') {
      await this.handleSuccessfulPayment(transaction);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<{
    status: PaymentTransactionStatus;
    transaction?: PaymentTransaction;
  }> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        session: true,
        student: { include: { user: true } },
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction not found');
    }

    // If still processing, check with provider
    if (transaction.status === 'PROCESSING' && transaction.providerTxnId) {
      const providerStatus = await this.checkProviderStatus(
        transaction.provider as PaymentMethod,
        transaction.providerTxnId
      );

      if (providerStatus !== transaction.status) {
        await prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: {
            status: providerStatus,
            completedAt: providerStatus === 'COMPLETED' ? new Date() : null,
          },
        });

        if (transaction.sessionId) {
          await prisma.paymentSession.update({
            where: { id: transaction.sessionId },
            data: {
              status: providerStatus,
              completedAt: providerStatus === 'COMPLETED' ? new Date() : null,
            },
          });
        }

        if (providerStatus === 'COMPLETED') {
          await this.handleSuccessfulPayment(transaction);
        }

        return { status: providerStatus };
      }
    }

    return { status: transaction.status, transaction };
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        session: true,
        student: { include: { user: true } },
        invoice: true,
        payment: true,
      },
    });
  }

  /**
   * Get transactions by invoice
   */
  async getTransactionsByInvoice(invoiceId: string): Promise<PaymentTransaction[]> {
    return prisma.paymentTransaction.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get transactions by student
   */
  async getTransactionsByStudent(
    studentId: string,
    options?: { page?: number; limit?: number; status?: PaymentTransactionStatus }
  ) {
    const { page = 1, limit = 20, status } = options || {};
    const skip = (page - 1) * limit;

    const where: any = { studentId };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          invoice: true,
          payment: true,
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel payment session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = await prisma.paymentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw AppError.notFound('Session not found');
    }

    if (session.status === 'COMPLETED') {
      throw AppError.badRequest('Cannot cancel completed session');
    }

    await prisma.paymentSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
    });

    // Cancel any pending transactions
    await prisma.paymentTransaction.updateMany({
      where: {
        sessionId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: { status: 'CANCELLED' },
    });
  }

  // ===========================================
  // Private Methods
  // ===========================================

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[^\d+]/g, '');
    if (normalized.startsWith('0')) {
      normalized = '+252' + normalized.substring(1);
    }
    if (!normalized.startsWith('+')) {
      if (normalized.length === 9 && normalized.match(/^[67]/)) {
        normalized = '+252' + normalized;
      }
    }
    return normalized;
  }

  /**
   * Process payment with provider
   */
  private async processProviderPayment(
    provider: PaymentMethod,
    phone: string,
    amount: number,
    reference: string
  ): Promise<{ success: boolean; providerTxnId?: string; error?: string }> {
    // In development, simulate payment
    if (env.NODE_ENV === 'development') {
      console.log(`[PAYMENT DEV] Provider: ${provider}`);
      console.log(`[PAYMENT DEV] Phone: ${phone}`);
      console.log(`[PAYMENT DEV] Amount: ${amount}`);
      console.log(`[PAYMENT DEV] Reference: ${reference}`);

      return {
        success: true,
        providerTxnId: `${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    // Production: Call actual provider APIs
    switch (provider) {
      case 'EVC_PLUS':
        return this.initiateEVCPayment(phone, amount, reference);
      case 'ZAAD':
        return this.initiateZAADPayment(phone, amount, reference);
      case 'SAHAL':
        return this.initiateSAHALPayment(phone, amount, reference);
      default:
        return { success: false, error: 'Unsupported payment provider' };
    }
  }

  /**
   * Initiate EVC Plus payment
   */
  private async initiateEVCPayment(
    _phone: string,
    _amount: number,
    _reference: string
  ): Promise<{ success: boolean; providerTxnId?: string; error?: string }> {
    try {
      // EVC Plus API integration would go here
      // This is a placeholder for the actual API call
      // const response = await fetch(`${env.EVC_BASE_URL}/api/payment`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${env.EVC_API_KEY}`,
      //   },
      //   body: JSON.stringify({
      //     merchantId: env.EVC_MERCHANT_ID,
      //     phone,
      //     amount,
      //     reference,
      //   }),
      // });
      // const data = await response.json();

      return {
        success: true,
        providerTxnId: `EVC-${Date.now()}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initiate ZAAD payment
   */
  private async initiateZAADPayment(
    _phone: string,
    _amount: number,
    _reference: string
  ): Promise<{ success: boolean; providerTxnId?: string; error?: string }> {
    try {
      // ZAAD API integration would go here
      return {
        success: true,
        providerTxnId: `ZAAD-${Date.now()}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initiate SAHAL payment
   */
  private async initiateSAHALPayment(
    _phone: string,
    _amount: number,
    _reference: string
  ): Promise<{ success: boolean; providerTxnId?: string; error?: string }> {
    try {
      // SAHAL API integration would go here
      return {
        success: true,
        providerTxnId: `SAHAL-${Date.now()}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check payment status with provider
   */
  private async checkProviderStatus(
    _provider: PaymentMethod,
    _providerTxnId: string
  ): Promise<PaymentTransactionStatus> {
    // In development, simulate status check
    if (env.NODE_ENV === 'development') {
      // Simulate random completion after a few checks
      const random = Math.random();
      if (random > 0.7) return 'COMPLETED';
      if (random > 0.9) return 'FAILED';
      return 'PROCESSING';
    }

    // Production: Check with actual provider
    // Implementation would go here
    return 'PROCESSING';
  }

  /**
   * Map provider status to our status
   */
  private mapProviderStatus(providerStatus: string): PaymentTransactionStatus {
    const statusMap: Record<string, PaymentTransactionStatus> = {
      SUCCESS: 'COMPLETED',
      COMPLETED: 'COMPLETED',
      PAID: 'COMPLETED',
      FAILED: 'FAILED',
      REJECTED: 'FAILED',
      CANCELLED: 'CANCELLED',
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      REFUNDED: 'REFUNDED',
    };

    return statusMap[providerStatus.toUpperCase()] || 'PENDING';
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(_provider: string, payload: WebhookPayload): boolean {
    if (!payload.signature) return false;

    // Create signature from payload
    const data = JSON.stringify({
      transactionId: payload.transactionId,
      status: payload.status,
      amount: payload.amount,
      timestamp: payload.timestamp,
    });

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(data)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(payload.signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(transaction: PaymentTransaction & {
    student?: { user: { phone: string | null; id: string } } | null;
    invoice?: { id: string; studentId: string } | null;
  }): Promise<void> {
    // Generate receipt number
    const receiptNo = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        invoiceId: transaction.invoiceId,
        studentId: transaction.studentId!,
        amount: transaction.amount,
        method: transaction.method,
        reference: transaction.providerTxnId,
        receivedById: transaction.studentId!, // Self-payment
        notes: `Online payment via ${transaction.provider}`,
      },
    });

    // Link payment to transaction
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { paymentId: payment.id },
    });

    // Update invoice status if applicable
    if (transaction.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: transaction.invoiceId },
        include: { payments: true },
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        const newStatus =
          totalPaid >= Number(invoice.amount) ? 'PAID' : 'PARTIAL';

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }
    }

    // Send notifications
    if (transaction.student?.user) {
      const phone = transaction.student.user.phone;
      const userId = transaction.student.user.id;

      // Send SMS
      if (phone) {
        await smsService.sendPaymentReceived(
          phone,
          Number(transaction.amount),
          receiptNo,
          0 // Would calculate remaining balance
        );
      }

      // Send in-app notification
      await notificationService.notify(userId, {
        type: 'FINANCE',
        title: 'Payment Received',
        message: `Your payment of $${Number(transaction.amount).toFixed(2)} has been received. Receipt: ${receiptNo}`,
        link: `/finance/payments/${payment.id}`,
        data: {
          paymentId: payment.id,
          transactionId: transaction.id,
          amount: Number(transaction.amount),
          receiptNo,
        },
      });
    }
  }
}

export const paymentGatewayService = new PaymentGatewayService();
