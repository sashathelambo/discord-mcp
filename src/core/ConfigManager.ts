export interface AutomationConfig {
  defaultGuildId?: string;
  enableLogging: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  rateLimitProtection: boolean;
  allowedActions: string[];
  deniedActions: string[];
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AutomationConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AutomationConfig {
    return {
      defaultGuildId: process.env.DISCORD_GUILD_ID,
      enableLogging: process.env.ENABLE_LOGGING === 'true',
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
      timeout: parseInt(process.env.TIMEOUT || '30000'),
      rateLimitProtection: process.env.RATE_LIMIT_PROTECTION !== 'false',
      allowedActions: this.parseActionList(process.env.ALLOWED_ACTIONS),
      deniedActions: this.parseActionList(process.env.DENIED_ACTIONS)
    };
  }

  private parseActionList(actionList?: string): string[] {
    if (!actionList) return [];
    return actionList.split(',').map(action => action.trim());
  }

  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  isActionAllowed(action: string): boolean {
    // If allowedActions is specified, only those actions are allowed
    if (this.config.allowedActions.length > 0) {
      return this.config.allowedActions.includes(action);
    }
    
    // If deniedActions is specified, those actions are not allowed
    if (this.config.deniedActions.length > 0) {
      return !this.config.deniedActions.includes(action);
    }
    
    // If neither is specified, all actions are allowed
    return true;
  }

  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}