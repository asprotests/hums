import { prisma, Prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { SalaryComponentType, CalculationType } from '@hums/database';

const { Decimal } = Prisma;

export interface CreateSalaryComponentInput {
  name: string;
  type: SalaryComponentType;
  calculationType: CalculationType;
  defaultValue: number;
  isActive?: boolean;
  appliesToAll?: boolean;
  description?: string;
}

export interface UpdateSalaryComponentInput {
  name?: string;
  type?: SalaryComponentType;
  calculationType?: CalculationType;
  defaultValue?: number;
  isActive?: boolean;
  appliesToAll?: boolean;
  description?: string;
}

export class SalaryComponentService {
  /**
   * Get all salary components
   */
  async getSalaryComponents(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    return prisma.salaryComponent.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get salary component by ID
   */
  async getComponentById(id: string) {
    const component = await prisma.salaryComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw AppError.notFound('Salary component not found');
    }

    return component;
  }

  /**
   * Create a new salary component
   */
  async createComponent(data: CreateSalaryComponentInput, userId: string) {
    // Check for duplicate name
    const existing = await prisma.salaryComponent.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw AppError.badRequest('Salary component with this name already exists');
    }

    const component = await prisma.salaryComponent.create({
      data: {
        name: data.name,
        type: data.type,
        calculationType: data.calculationType,
        defaultValue: new Decimal(data.defaultValue),
        isActive: data.isActive ?? true,
        appliesToAll: data.appliesToAll ?? false,
        description: data.description,
      },
    });

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'SalaryComponent',
      resourceId: component.id,
      userId,
      newValues: data,
    });

    return component;
  }

  /**
   * Update a salary component
   */
  async updateComponent(id: string, data: UpdateSalaryComponentInput, userId: string) {
    const existing = await this.getComponentById(id);

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.salaryComponent.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw AppError.badRequest('Salary component with this name already exists');
      }
    }

    const component = await prisma.salaryComponent.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        calculationType: data.calculationType,
        defaultValue: data.defaultValue !== undefined ? new Decimal(data.defaultValue) : undefined,
        isActive: data.isActive,
        appliesToAll: data.appliesToAll,
        description: data.description,
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'SalaryComponent',
      resourceId: id,
      userId,
      oldValues: { name: existing.name },
      newValues: data,
    });

    return component;
  }

  /**
   * Assign a component to an employee
   */
  async assignToEmployee(
    componentId: string,
    employeeId: string,
    value: number | undefined,
    userId: string
  ) {
    // Verify component exists
    await this.getComponentById(componentId);

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw AppError.notFound('Employee not found');
    }

    const assignment = await prisma.employeeSalaryComponent.upsert({
      where: {
        employeeId_componentId: {
          employeeId,
          componentId,
        },
      },
      update: {
        value: value !== undefined ? new Decimal(value) : null,
      },
      create: {
        employeeId,
        componentId,
        value: value !== undefined ? new Decimal(value) : null,
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'EmployeeSalaryComponent',
      resourceId: assignment.id,
      userId,
      newValues: { componentId, employeeId, value },
    });

    return assignment;
  }

  /**
   * Remove a component assignment from an employee
   */
  async removeFromEmployee(componentId: string, employeeId: string, userId: string) {
    const assignment = await prisma.employeeSalaryComponent.findUnique({
      where: {
        employeeId_componentId: {
          employeeId,
          componentId,
        },
      },
    });

    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    await prisma.employeeSalaryComponent.delete({
      where: { id: assignment.id },
    });

    await auditService.log({
      action: AuditAction.DELETE,
      resource: 'EmployeeSalaryComponent',
      resourceId: assignment.id,
      userId,
      oldValues: { componentId, employeeId },
    });
  }

  /**
   * Get employee's salary components
   */
  async getEmployeeComponents(employeeId: string) {
    // Get components that apply to all
    const universalComponents = await prisma.salaryComponent.findMany({
      where: {
        appliesToAll: true,
        isActive: true,
      },
    });

    // Get employee-specific assignments
    const assignments = await prisma.employeeSalaryComponent.findMany({
      where: { employeeId },
      include: { component: true },
    });

    // Combine and deduplicate
    const componentMap = new Map();

    // Add universal components first
    for (const comp of universalComponents) {
      componentMap.set(comp.id, {
        component: comp,
        value: comp.defaultValue,
        isAssigned: false,
      });
    }

    // Override with employee-specific assignments
    for (const assignment of assignments) {
      componentMap.set(assignment.componentId, {
        component: assignment.component,
        value: assignment.value ?? assignment.component.defaultValue,
        isAssigned: true,
      });
    }

    return Array.from(componentMap.values());
  }

  /**
   * Initialize default salary components
   */
  async initializeDefaultComponents(userId: string) {
    const count = await prisma.salaryComponent.count();
    if (count > 0) {
      return; // Already initialized
    }

    const defaults: CreateSalaryComponentInput[] = [
      {
        name: 'Housing Allowance',
        type: 'ALLOWANCE',
        calculationType: 'PERCENTAGE',
        defaultValue: 15,
        appliesToAll: true,
        description: 'Housing allowance calculated as percentage of base salary',
      },
      {
        name: 'Transport Allowance',
        type: 'ALLOWANCE',
        calculationType: 'FIXED',
        defaultValue: 50,
        appliesToAll: true,
        description: 'Fixed monthly transport allowance',
      },
      {
        name: 'Tax',
        type: 'DEDUCTION',
        calculationType: 'PERCENTAGE',
        defaultValue: 5,
        appliesToAll: true,
        description: 'Income tax deduction',
      },
      {
        name: 'Pension',
        type: 'DEDUCTION',
        calculationType: 'PERCENTAGE',
        defaultValue: 3,
        appliesToAll: true,
        description: 'Pension contribution',
      },
    ];

    for (const comp of defaults) {
      await this.createComponent(comp, userId);
    }
  }
}

export const salaryComponentService = new SalaryComponentService();
