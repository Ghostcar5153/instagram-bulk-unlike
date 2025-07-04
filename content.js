/**
 * Instagram Bulk Unlike Extension - Content Script
 * Selects posts, unlikes them, reloads, and continues automatically based on user configuration.
 */

class InstagramBulkUnlike {
  constructor() {
  this.isRunning = false;
  this.cycles = 0;
  this.totalProcessed = 0;
  this.currentAction = 'Ready';
  this.selectedItems = new Set();
  this.config = null;

  // Default configuration (will be overridden by user settings)
  this.DEFAULT_CONFIG = {
    delays: {
      betweenClicks: 100,
      afterSelect: 500,
      afterUnlike: 1000,
      reloadWait: 1000,
      resumeDelay: 5000
    },
    batchSize: 50,
    autoRetry: true,
    maxRetries: 3,
    respectRateLimit: true
  };

  // Initialize properties with defaults
  this.DELAYS = { ...this.DEFAULT_CONFIG.delays };
  this.BATCH_SIZE = this.DEFAULT_CONFIG.batchSize;
  this.AUTO_RETRY = this.DEFAULT_CONFIG.autoRetry;
  this.MAX_RETRIES = this.DEFAULT_CONFIG.maxRetries;
  this.RESPECT_RATE_LIMIT = this.DEFAULT_CONFIG.respectRateLimit;

  // Load persisted progress and config
  this.loadProgress();
  this.loadConfig();
}


  // Load persisted progress from storage
  async loadProgress() {
    try {
      const result = await chrome.storage.local.get(['bulkUnlikeCycles', 'bulkUnlikeProcessed']);
      this.cycles = result.bulkUnlikeCycles || 0;
      this.totalProcessed = result.bulkUnlikeProcessed || 0;
      this.log(`Loaded progress: ${this.cycles} cycles, ${this.totalProcessed} processed`);
    } catch (error) {
      console.log('Failed to load progress:', error);
      this.cycles = 0;
      this.totalProcessed = 0;
    }
  }

  // Save current progress to storage
  async saveProgress() {
    try {
      await chrome.storage.local.set({
        bulkUnlikeCycles: this.cycles,
        bulkUnlikeProcessed: this.totalProcessed
      });
    } catch (error) {
      console.log('Failed to save progress:', error);
    }
  }
 
// Reset progress counters
async resetProgress() {
  this.cycles = 0;
  this.totalProcessed = 0;
  try {
    await chrome.storage.local.remove(['bulkUnlikeCycles', 'bulkUnlikeProcessed']);
    this.log('Progress reset');
  } catch (error) {
    console.log('Failed to reset progress:', error);
  }
}

  // Load configuration from storage
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get(['bulkUnlikeConfig']);
      if (result.bulkUnlikeConfig) {
        this.config = result.bulkUnlikeConfig;
        this.DELAYS = { ...this.config.delays };
        this.BATCH_SIZE = this.config.batchSize;
        this.AUTO_RETRY = this.config.autoRetry;
        this.MAX_RETRIES = this.config.maxRetries;
        this.RESPECT_RATE_LIMIT = this.config.respectRateLimit;
        
        // Apply rate limiting if enabled
        if (this.RESPECT_RATE_LIMIT) {
          this.applySafeDelays();
        }
      }
    } catch (error) {
      console.log('Using default configuration:', error);
    }
  }

  // Apply safer delays when rate limiting is enabled
  applySafeDelays() {
    this.DELAYS.betweenClicks = Math.max(this.DELAYS.betweenClicks, 200);
    this.DELAYS.afterSelect = Math.max(this.DELAYS.afterSelect, 1000);
    this.DELAYS.afterUnlike = Math.max(this.DELAYS.afterUnlike, 2000);
    this.DELAYS.reloadWait = Math.max(this.DELAYS.reloadWait, 2000);
    this.DELAYS.resumeDelay = Math.max(this.DELAYS.resumeDelay, 10000);
    this.BATCH_SIZE = Math.min(this.BATCH_SIZE, 25);
  }

  // Simple promise‐based delay
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Log to console + send status update to popup
  log = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    this.updateStatus(message);
  };

  // Send current state back to popup
  updateStatus = (action) => {
    this.currentAction = action;
    try {
      chrome.runtime.sendMessage({
        type: 'status',
        data: {
          running: this.isRunning,
          cycles: this.cycles,
          processed: this.totalProcessed,
          action: action,
        },
      });
    } catch (error) {
      // Ignore messaging errors if popup is closed
      console.log('Status update failed:', error);
    }
  };

  // Find + click the "Select" button
  clickSelectButton = async () => {
    this.log('Looking for Select button...');
    
    // Multiple approaches to find the Select button
    let selectBtn = null;
    
    // Try aria-label first
    selectBtn = document.querySelector('[aria-label="Select"]');
    
    // Try by text content in buttons
    if (!selectBtn) {
      selectBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find((btn) =>
        btn.textContent.trim().toLowerCase().includes('select')
      );
    }
    
    // Try by spans containing "Select"
    if (!selectBtn) {
      const selectSpan = Array.from(document.querySelectorAll('span')).find((span) =>
        span.textContent.trim().toLowerCase() === 'select'
      );
      if (selectSpan) {
        selectBtn = selectSpan.closest('button') || selectSpan.closest('[role="button"]');
      }
    }

    if (!selectBtn) {
      throw new Error('Select button not found');
    }

    selectBtn.click();
    await this.delay(this.DELAYS.afterSelect);
    this.log('Select button clicked');
  };

  // Grab up to configured batch size of unselected checkboxes and click them
  selectBatch = async () => {
    this.log(`Selecting up to ${this.BATCH_SIZE} items...`);

    // Enhanced selectors for Instagram's likes page checkboxes
    const selectors = [
      '[aria-label="Toggle checkbox"]',
      '[role="checkbox"]',
      'input[type="checkbox"]',
      'svg[fill="#8E8E8E"]',
      'svg[fill="#8e8e8e"]',
      '[data-testid="checkbox"]',
      '.checkbox',
      '[aria-pressed="false"]'
    ];

    let allCheckboxes = [];
    selectors.forEach((sel) => {
      try {
        const found = Array.from(document.querySelectorAll(sel));
        allCheckboxes = allCheckboxes.concat(found);
      } catch (e) {
        // Ignore selector errors
      }
    });

    // Remove duplicates
    allCheckboxes = Array.from(new Set(allCheckboxes));
    
    // Filter out already selected items
    const unselectedCheckboxes = allCheckboxes.filter(cb => {
      const ariaPressed = cb.getAttribute('aria-pressed');
      const ariaChecked = cb.getAttribute('aria-checked');
      const bgColor = getComputedStyle(cb).backgroundColor;
      const fillColor = cb.getAttribute('fill');
      
      const isSelected = 
        ariaPressed === 'true' || 
        ariaChecked === 'true' || 
        bgColor.includes('rgb(24, 119, 242)') ||
        fillColor === '#1877f2' ||
        fillColor === 'rgb(24, 119, 242)';
        
      return !isSelected;
    });

    let count = 0;
    const maxItems = Math.min(this.BATCH_SIZE, unselectedCheckboxes.length);
    
    for (let i = 0; i < maxItems; i++) {
      const cb = unselectedCheckboxes[i];
      if (!cb) break;

      try {
        // Scroll element into view if needed
        cb.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.delay(50); // Small delay for scroll
        
        cb.click();
        await this.delay(this.DELAYS.betweenClicks);
        count++;
        
        if (count % 10 === 0) {
          this.log(`Selected ${count}/${this.BATCH_SIZE}`);
        }
      } catch (e) {
        console.warn(`Failed to click checkbox ${i}:`, e);
      }
    }

    this.log(`Batch selection completed: ${count} items selected`);
    return count;
  };

  // Find + click the "Unlike" button (and confirm if needed)
  unlikeSelectedItems = async () => {
    this.log('Looking for Unlike button...');
    
    // Multi-language support for unlike button
    const unlikeTexts = [
      'Unlike', 'Remove like', 'Gefällt mir nicht mehr', 
      'No me gusta', 'Je n\'aime plus', 'Non mi piace più',
      'Curtir', 'Descurtir'
    ];
    
    let unlikeBtn = null;

    // Search in spans first
    unlikeBtn = Array.from(document.querySelectorAll('span')).find((el) =>
      unlikeTexts.some((txt) => 
        el.textContent.trim().toLowerCase().includes(txt.toLowerCase())
      )
    );

    // If not found in spans, try buttons
    if (!unlikeBtn) {
      unlikeBtn = Array.from(document.querySelectorAll('button')).find((btn) =>
        unlikeTexts.some((txt) =>
          btn.textContent.toLowerCase().includes(txt.toLowerCase())
        )
      );
    }

    // Try finding by aria-label
    if (!unlikeBtn) {
      unlikeBtn = Array.from(document.querySelectorAll('[aria-label]')).find((el) =>
        unlikeTexts.some((txt) =>
          el.getAttribute('aria-label').toLowerCase().includes(txt.toLowerCase())
        )
      );
    }

    if (!unlikeBtn) {
      throw new Error('Unlike button not found');
    }

    // Click the unlike button
    unlikeBtn.click();
    await this.delay(this.DELAYS.afterSelect);
    this.log('Clicked Unlike button');

    // Look for confirmation dialog
    await this.delay(500); // Wait for potential dialog to appear
    
    const confirmTexts = [
      'Confirm', 'Remove', 'Delete', 'Yes', 'OK', 
      'Bestätigen', 'Confirmar', 'Conferma', 'Oui'
    ];
    
    const confirmBtn = Array.from(document.querySelectorAll('button')).find((btn) =>
      confirmTexts.some((txt) =>
        btn.textContent.toLowerCase().includes(txt.toLowerCase())
      )
    );

    if (confirmBtn) {
      confirmBtn.click();
      await this.delay(this.DELAYS.afterUnlike);
      this.log('Clicked confirmation');
    } else {
      await this.delay(this.DELAYS.afterUnlike);
      this.log('No confirmation needed');
    }
  };

  // One full cycle: select → unlike → reload
  processCycle = async () => {
    let retryCount = 0;
    
    while (retryCount <= this.MAX_RETRIES) {
      try {
        this.cycles++;
        await this.saveProgress(); // Save progress immediately after incrementing cycle
        this.log(`=== Cycle ${this.cycles} starting (attempt ${retryCount + 1}) ===`);

        await this.clickSelectButton();
        const selectedCount = await this.selectBatch();

        if (selectedCount === 0) {
          this.log('No items left to select—stopping');
          chrome.storage.local.set({ bulkUnlikeRunning: false });
          return false;
        }

        this.totalProcessed += selectedCount;
        await this.saveProgress(); // Save progress after updating processed count
        this.log(`Selected ${selectedCount} items. Total processed: ${this.totalProcessed}`);

        await this.unlikeSelectedItems();
        this.log(`=== Cycle ${this.cycles} completed successfully ===`);
        return true;
        
      } catch (err) {
        retryCount++;
        this.log(`Cycle ${this.cycles} error (attempt ${retryCount}): ${err.message}`);
        
        if (retryCount > this.MAX_RETRIES || !this.AUTO_RETRY) {
          this.log('Max retries reached or auto-retry disabled. Stopping.');
          chrome.storage.local.set({ bulkUnlikeRunning: false });
          return false;
        }
        
        // Wait before retry
        const retryDelay = Math.min(5000 * retryCount, 30000); // Exponential backoff, max 30s
        this.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await this.delay(retryDelay);
      }
    }
    
    return false;
  };

  // Start the main processing loop
  run = async () => {
    this.isRunning = true;
    chrome.storage.local.set({ bulkUnlikeRunning: true });
    this.updateStatus('Starting bulk unlike...');

    try {
      while (this.isRunning) {
        const success = await this.processCycle();
        if (!success || !this.isRunning) break;

        // Wait before reload
        this.log(`Waiting ${this.DELAYS.reloadWait}ms before reload...`);
        await this.delay(this.DELAYS.reloadWait);
        
        this.log('Reloading page for next cycle...');
        window.location.reload();
        return; // Exit - will resume after reload
      }
    } catch (error) {
      this.log(`Fatal error: ${error.message}`);
    }

    this.log('Bulk unlike process completed');
    this.updateStatus('Stopped');
    this.isRunning = false;
    chrome.storage.local.set({ bulkUnlikeRunning: false });
  };

  // Stop the process
  stop = async () => {
    this.isRunning = false;
    this.log('Stop requested by user');
    await this.saveProgress();
    chrome.storage.local.set({ bulkUnlikeRunning: false });
    this.updateStatus('Stopped');
  };

  // Get current status
  getStatus = () => ({
    running: this.isRunning,
    cycles: this.cycles,
    processed: this.totalProcessed,
    action: this.currentAction,
  });
}

// Instantiate the controller
const bulkUnlike = new InstagramBulkUnlike();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'start') {
      if (!bulkUnlike.isRunning) {
        bulkUnlike.run();
      }
      sendResponse({ success: true });
    }
    else if (message.action === 'stop') {
      bulkUnlike.stop();
      sendResponse({ success: true });
    }
    else if (message.action === 'getStatus') {
      sendResponse(bulkUnlike.getStatus());
    }
    else if (message.action === 'resetProgress') {
      bulkUnlike.resetProgress();
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
});

// Auto-resume functionality after page reload
chrome.storage.local.get(['bulkUnlikeRunning'], (result) => {
  if (result.bulkUnlikeRunning) {
    console.log(`Resuming Bulk Unlike in ${bulkUnlike.DELAYS.resumeDelay / 1000} seconds...`);
    setTimeout(() => {
      if (!bulkUnlike.isRunning) {
        bulkUnlike.run();
      }
    }, bulkUnlike.DELAYS.resumeDelay);
  }
});

// Log readiness when on correct page
if (window.location.href.includes('your_activity/interactions/likes')) {
  console.log('Instagram Bulk Unlike loaded and ready on likes page');
} else {
  console.log('Instagram Bulk Unlike loaded (not on likes page)');
}
