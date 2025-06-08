/**
 * Configuration Management for the extension
 */

class Config {
  constructor() {
    this.defaultConfig = {
      delays: {
        betweenClicks: 100,     // Delay between individual clicks (ms)
        afterSelect: 500,      // Delay after clicking select button (ms)
        afterUnlike: 1000,     // Delay after unlike action (ms)
        reloadWait: 1000,      // Delay before reload (ms)
        resumeDelay: 5000      // Delay before resuming after reload (ms)
      },
      batchSize: 50,           // Number of items to process per cycle
      autoRetry: true,         // Automatically retry on errors
      maxRetries: 3,           // Maximum number of retries
      respectRateLimit: true   // Enable additional safety delays
    };
  }

  // Load configuration from storage
  async load() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['bulkUnlikeConfig'], (result) => {
        const config = result.bulkUnlikeConfig || this.defaultConfig;
        const mergedConfig = this.mergeWithDefaults(config);
        resolve(mergedConfig);
      });
    });
  }

  // Save configuration to storage
  async save(config) {
    return new Promise((resolve) => {
      const validatedConfig = this.validateConfig(config);
      chrome.storage.sync.set({ bulkUnlikeConfig: validatedConfig }, () => {
        resolve(validatedConfig);
      });
    });
  }

  // Reset to default configuration
  async reset() {
    return this.save(this.defaultConfig);
  }

  // Merge user config with defaults
  mergeWithDefaults(userConfig) {
    return {
      delays: { ...this.defaultConfig.delays, ...userConfig.delays },
      batchSize: userConfig.batchSize || this.defaultConfig.batchSize,
      autoRetry: userConfig.autoRetry !== undefined ? userConfig.autoRetry : this.defaultConfig.autoRetry,
      maxRetries: userConfig.maxRetries || this.defaultConfig.maxRetries,
      respectRateLimit: userConfig.respectRateLimit !== undefined ? userConfig.respectRateLimit : this.defaultConfig.respectRateLimit
    };
  }

  // Validate configuration values
  validateConfig(config) {
    const validated = { ...config };

    const minDelays = {
      betweenClicks: 50,
      afterSelect: 200,
      afterUnlike: 500,
      reloadWait: 500,
      resumeDelay: 3000
    };

    validated.delays = validated.delays || {};
    Object.keys(minDelays).forEach(key => {
      if (validated.delays[key] < minDelays[key]) {
        validated.delays[key] = minDelays[key];
      }
    });

    validated.batchSize = Math.max(1, Math.min(100, validated.batchSize || 50));

    validated.maxRetries = Math.max(1, Math.min(10, validated.maxRetries || 3));

    return validated;
  }

  // Get safe configuration for rate limiting
  getSafeConfig(baseConfig) {
    if (!baseConfig.respectRateLimit) return baseConfig;

    return {
      ...baseConfig,
      delays: {
        ...baseConfig.delays,
        betweenClicks: Math.max(baseConfig.delays.betweenClicks, 200),
        afterSelect: Math.max(baseConfig.delays.afterSelect, 1000),
        afterUnlike: Math.max(baseConfig.delays.afterUnlike, 2000),
        reloadWait: Math.max(baseConfig.delays.reloadWait, 2000),
        resumeDelay: Math.max(baseConfig.delays.resumeDelay, 10000)
      },
      batchSize: Math.min(baseConfig.batchSize, 25)
    };
  }

  exportConfig(config) {
    return JSON.stringify(config, null, 2);
  }

  // Import configuration from JSON
  importConfig(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      return this.validateConfig(config);
    } catch (error) {
      throw new Error('Invalid configuration format');
    }
  }
}

// Export globally
window.InstagramBulkUnlikeConfig = Config;