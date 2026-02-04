import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { GradeScaleItem, SystemConfigInput } from '../validators/config.validator.js';

// Default system configuration
const DEFAULT_CONFIG: Record<string, any> = {
  // Branding
  universityName: 'Hormuud University',
  logo: null,
  favicon: null,
  primaryColor: '#2563eb',

  // Localization
  timezone: 'Africa/Mogadishu',
  dateFormat: 'DD/MM/YYYY',
  currency: 'USD',

  // Academic
  minAttendancePercentage: 75,
  gradeScale: [
    { minScore: 90, maxScore: 100, letterGrade: 'A', gradePoints: 4.0 },
    { minScore: 80, maxScore: 89, letterGrade: 'B', gradePoints: 3.0 },
    { minScore: 70, maxScore: 79, letterGrade: 'C', gradePoints: 2.0 },
    { minScore: 60, maxScore: 69, letterGrade: 'D', gradePoints: 1.0 },
    { minScore: 0, maxScore: 59, letterGrade: 'F', gradePoints: 0.0 },
  ],

  // Security
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  passwordExpiryDays: 90,
};

// Public config keys (accessible without authentication)
const PUBLIC_CONFIG_KEYS = [
  'universityName',
  'logo',
  'favicon',
  'primaryColor',
  'timezone',
  'dateFormat',
  'currency',
];

export interface SystemConfig {
  // Branding
  universityName: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;

  // Localization
  timezone: string;
  dateFormat: string;
  currency: string;

  // Academic
  minAttendancePercentage: number;
  gradeScale: GradeScaleItem[];

  // Security
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
}

export class ConfigService {
  /**
   * Get all system configuration
   */
  async getConfig(): Promise<SystemConfig> {
    const configs = await prisma.systemConfig.findMany();

    // Build config object from database values with defaults
    const config: Record<string, any> = { ...DEFAULT_CONFIG };

    for (const item of configs) {
      config[item.key] = item.value;
    }

    return config as SystemConfig;
  }

  /**
   * Get public configuration (no auth required)
   */
  async getPublicConfig(): Promise<Partial<SystemConfig>> {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: PUBLIC_CONFIG_KEYS },
      },
    });

    // Build public config with defaults
    const publicConfig: Record<string, any> = {};

    for (const key of PUBLIC_CONFIG_KEYS) {
      publicConfig[key] = DEFAULT_CONFIG[key];
    }

    for (const item of configs) {
      if (PUBLIC_CONFIG_KEYS.includes(item.key)) {
        publicConfig[item.key] = item.value;
      }
    }

    return publicConfig;
  }

  /**
   * Get a single config value
   */
  async getConfigValue<T>(key: string): Promise<T> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (config) {
      return config.value as T;
    }

    if (key in DEFAULT_CONFIG) {
      return DEFAULT_CONFIG[key] as T;
    }

    throw AppError.notFound(`Config key '${key}' not found`);
  }

  /**
   * Update a single config value
   */
  async updateConfig(key: string, value: any, updatedById?: string): Promise<void> {
    // Validate key
    if (!(key in DEFAULT_CONFIG)) {
      throw AppError.badRequest(`Invalid config key: ${key}`);
    }

    await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value,
        description: `System configuration for ${key}`,
      },
      update: {
        value,
      },
    });

    // Create audit log
    if (updatedById) {
      await this.createAuditLog(updatedById, 'UPDATE', 'SystemConfig', key);
    }
  }

  /**
   * Update multiple config values
   */
  async updateConfigs(configs: SystemConfigInput, updatedById?: string): Promise<SystemConfig> {
    const updates = Object.entries(configs).filter(([_, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await this.updateConfig(key, value, updatedById);
    }

    return this.getConfig();
  }

  /**
   * Get grade scale
   */
  async getGradeScale(): Promise<GradeScaleItem[]> {
    return this.getConfigValue<GradeScaleItem[]>('gradeScale');
  }

  /**
   * Update grade scale
   */
  async updateGradeScale(gradeScale: GradeScaleItem[], updatedById?: string): Promise<GradeScaleItem[]> {
    // Sort by minScore descending
    const sortedScale = [...gradeScale].sort((a, b) => b.minScore - a.minScore);

    await this.updateConfig('gradeScale', sortedScale, updatedById);

    return sortedScale;
  }

  /**
   * Update logo
   */
  async updateLogo(logoUrl: string, updatedById?: string): Promise<void> {
    await this.updateConfig('logo', logoUrl, updatedById);
  }

  /**
   * Reset config to defaults
   */
  async resetToDefaults(updatedById?: string): Promise<SystemConfig> {
    await prisma.systemConfig.deleteMany({});

    if (updatedById) {
      await this.createAuditLog(updatedById, 'RESET', 'SystemConfig', 'all');
    }

    return DEFAULT_CONFIG as SystemConfig;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          newValues: {},
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

export const configService = new ConfigService();
