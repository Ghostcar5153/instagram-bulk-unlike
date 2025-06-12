/**
 * Configuration management for the extension
 */

class InstagramBulkUnlikeConfig {
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

  // Merge user config with defaults to ensure all properties exist
  mergeWithDefaults(userConfig) {
    return {
      delays: { 
        ...this.defaultConfig.delays, 
        ...(userConfig.delays || {}) 
      },
      batchSize: userConfig.batchSize !== undefined ? userConfig.batchSize : this.defaultConfig.batchSize,
      autoRetry: userConfig.autoRetry !== undefined ? userConfig.autoRetry : this.defaultConfig.autoRetry,
      maxRetries: userConfig.maxRetries !== undefined ? userConfig.maxRetries : this.defaultConfig.maxRetries,
      respectRateLimit: userConfig.respectRateLimit !== undefined ? userConfig.respectRateLimit : this.defaultConfig.respectRateLimit
    };
  }

  // Validate configuration values to ensure they're within acceptable ranges
  validateConfig(config) {
    const validated = { ...config };

    // Minimum delay requirements for safety
    const minDelays = {
      betweenClicks: 50,
      afterSelect: 200,
      afterUnlike: 500,
      reloadWait: 500,
      resumeDelay: 3000
    };

    // Maximum delay limits to prevent excessive waiting
    const maxDelays = {
      betweenClicks: 5000,
      afterSelect: 10000,
      afterUnlike: 10000,
      reloadWait: 10000,
      resumeDelay: 30000
    };

    // Validate and clamp delay values
    validated.delays = validated.delays || {};
    Object.keys(minDelays).forEach(key => {
      const value = validated.delays[key] || this.defaultConfig.delays[key];
      validated.delays[key] = Math.max(minDelays[key], Math.min(maxDelays[key], value));
    });

    // Validate batch size (1-100)
    validated.batchSize = Math.max(1, Math.min(100, validated.batchSize || this.defaultConfig.batchSize));

    // Validate max retries (1-10)
    validated.maxRetries = Math.max(1, Math.min(10, validated.maxRetries || this.defaultConfig.maxRetries));

    // Ensure boolean values
    validated.autoRetry = Boolean(validated.autoRetry);
    validated.respectRateLimit = Boolean(validated.respectRateLimit);

    return validated;
  }

  // Get configuration with safety adjustments when rate limiting is enabled
  getSafeConfig(baseConfig) {
    if (!baseConfig.respectRateLimit) return baseConfig;

    const safeConfig = { ...baseConfig };
    
    // Apply more conservative delays when rate limiting is enabled
    safeConfig.delays = {
      ...baseConfig.delays,
      betweenClicks: Math.max(baseConfig.delays.betweenClicks, 200),
      afterSelect: Math.max(baseConfig.delays.afterSelect, 1000),
      afterUnlike: Math.max(baseConfig.delays.afterUnlike, 2000),
      reloadWait: Math.max(baseConfig.delays.reloadWait, 2000),
      resumeDelay: Math.max(baseConfig.delays.resumeDelay, 10000)
    };
    
    // Reduce batch size for safer operation
    safeConfig.batchSize = Math.min(baseConfig.batchSize, 25);

    return safeConfig;
  }

  // Export configuration as JSON string
  exportConfig(config) {
    return JSON.stringify(config, null, 2);
  }

  // Import configuration from JSON string
  importConfig(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      return this.validateConfig(config);
    } catch (error) {
      throw new Error('Invalid configuration format: ' + error.message);
    }
  }

  // Get preset configurations
  getPresets() {
    return {
      conservative: {
        delays: {
          betweenClicks: 300,
          afterSelect: 1500,
          afterUnlike: 3000,
          reloadWait: 2000,
          resumeDelay: 10000
        },
        batchSize: 20,
        respectRateLimit: true,
        autoRetry: true,
        maxRetries: 2
      },
      balanced: {
        delays: {
          betweenClicks: 100,
          afterSelect: 500,
          afterUnlike: 1000,
          reloadWait: 1000,
          resumeDelay: 5000
        },
        batchSize: 50,
        respectRateLimit: true,
        autoRetry: true,
        maxRetries: 3
      },
      aggressive: {
        delays: {
          betweenClicks: 50,
          afterSelect: 200,
          afterUnlike: 500,
          reloadWait: 500,
          resumeDelay: 3000
        },
        batchSize: 100,
        respectRateLimit: false,
        autoRetry: true,
        maxRetries: 5
      }
    };
  }

  // Apply a preset configuration
  async applyPreset(presetName) {
    const presets = this.getPresets();
    const preset = presets[presetName];
    
    if (!preset) {
      throw new Error(`Preset '${presetName}' not found`);
    }
    
    return this.save(preset);
  }

  // Check if current configuration matches a preset
  detectPreset(config) {
    const presets = this.getPresets();
    
    for (const [name, preset] of Object.entries(presets)) {
      if (this.configsMatch(config, preset)) {
        return name;
      }
    }
    
    return 'custom';
  }

  // Helper method to compare two configurations
  configsMatch(config1, config2) {
    return JSON.stringify(config1) === JSON.stringify(config2);
  }
}

// Export the class globally for use in popup.js
if (typeof window !== 'undefined') {
  window.InstagramBulkUnlikeConfig = InstagramBulkUnlikeConfig;
}

// Also export for Node.js environments if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InstagramBulkUnlikeConfig;
}
