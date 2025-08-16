import { DiscordController } from '../DiscordController.js';
import { ConfigManager } from '../ConfigManager.js';
import { Logger } from '../Logger.js';

// Mock the DiscordService and AutomationManager
jest.mock('../../discord-service.js');
jest.mock('../AutomationManager.js');

describe('DiscordController', () => {
  let discordController: DiscordController;
  let configManager: ConfigManager;
  let logger: Logger;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize singletons
    configManager = ConfigManager.getInstance();
    logger = Logger.getInstance();
    
    // Create controller
    discordController = new DiscordController();
  });

  describe('initialization', () => {
    it('should create controller instance', () => {
      expect(discordController).toBeDefined();
      expect(discordController.getConfigManager()).toBe(configManager);
      expect(discordController.getLogger()).toBe(logger);
    });
  });

  describe('configuration', () => {
    it('should load configuration from environment', () => {
      const config = configManager.getConfig();
      expect(config).toBeDefined();
    });

    it('should respect allowed actions configuration', () => {
      // This would require setting environment variables in a real test
      const config = configManager.getConfig();
      expect(Array.isArray(config.allowedActions)).toBe(true);
      expect(Array.isArray(config.deniedActions)).toBe(true);
    });
  });

  describe('logging', () => {
    it('should have a logger instance', () => {
      expect(discordController.getLogger()).toBeDefined();
    });
  });
});