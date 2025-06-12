<<<<<<< HEAD
/**
 * Instagram Bulk Unlike Extension - Content Script (With 5s Resume Delay)
 * Selects 100 posts, unlikes them, reloads, waits 5 seconds, and then continues automatically (at least that's the default).
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
    this.DELAYS = this.DEFAULT_CONFIG.delays;
    this.BATCH_SIZE = this.DEFAULT_CONFIG.batchSize;

    this.loadConfig();
  }

  // Load configuration from storage
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get(['bulkUnlikeConfig']);
      if (result.bulkUnlikeConfig) {
        this.config = result.bulkUnlikeConfig;
        this.DELAYS = this.config.delays;
        this.BATCH_SIZE = this.config.batchSize;
      }
    } catch (error) {
      console.log('Using default configuration');
    }
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
    chrome.runtime.sendMessage({
      type: 'status',
      data: {
        running: this.isRunning,
        cycles: this.cycles,
        processed: this.totalProcessed,
        action: action,
      },
    });
  };

  // Find + click the "Select" button
  clickSelectButton = async () => {
    this.log('Looking for Select button...');
    let selectBtn =
      document.querySelector('[aria-label="Select"]') ||
      Array.from(document.querySelectorAll('button, [role="button"]')).find((btn) =>
        btn.textContent.trim().toLowerCase().includes('select')
      );

    if (!selectBtn) {
      throw new Error('Select button not found');
    }

    selectBtn.click();
    await this.delay(this.DELAYS.afterSelect);
    this.log('Select button clicked');
  };

  // Grab up to 100 unselected checkboxes and click them rapidly
  selectBatch = async () => {
    this.log(`Selecting up to ${this.BATCH_SIZE} items...`);

    // Potential "checkbox" selectors on Instagram's likes page
    const selectors = [
      '[aria-label="Toggle checkbox"]',
      '[role="checkbox"]',
      'input[type="checkbox"]',
      'svg[fill="#8E8E8E"]',
      'svg[fill="#8e8e8e"]',
    ];

    let allCheckboxes = [];
    selectors.forEach((sel) => {
      const found = Array.from(document.querySelectorAll(sel));
      allCheckboxes = allCheckboxes.concat(found);
    });

    allCheckboxes = Array.from(new Set(allCheckboxes));

    let count = 0;
    for (const cb of allCheckboxes) {
      if (count >= this.BATCH_SIZE) break;

      // Skip if already marked as selected/checked (aria‐pressed, aria‐checked, or blue background, just in case)
      const ariaPressed = cb.getAttribute('aria-pressed');
      const ariaChecked = cb.getAttribute('aria-checked');
      const bgColor = getComputedStyle(cb).backgroundColor;
      const alreadyMarked =
        ariaPressed === 'true' || ariaChecked === 'true' || bgColor.includes('rgb(24, 119, 242)');

      if (alreadyMarked) continue;

      try {
        cb.click();
        await this.delay(this.DELAYS.betweenClicks);
        count++;
        this.log(`Selected ${count}/${this.BATCH_SIZE}`);
      } catch (e) {
        // Ignore click failures and continue
      }
    }

    this.log(`Batch selection done: ${count} items selected`);
    return count;
  };

  // Find + click the "Unlike" button (and confirm if needed)
  unlikeSelectedItems = async () => {
    this.log('Looking for Unlike button...');
    const unlikeTexts = ['Unlike', 'Remove like', 'Gefällt mir nicht mehr'];
    let unlikeBtn = null;

    // First search <span> elements
    unlikeBtn = Array.from(document.querySelectorAll('span')).find((el) =>
      unlikeTexts.some((txt) => el.textContent.trim().includes(txt))
    );

    // If not found in spans, try any <button>
    if (!unlikeBtn) {
      unlikeBtn = Array.from(document.querySelectorAll('button')).find((btn) =>
        unlikeTexts.some((txt) =>
          btn.textContent.toLowerCase().includes(txt.toLowerCase())
        )
      );
    }

    if (!unlikeBtn) {
      throw new Error('Unlike button not found');
    }

    unlikeBtn.click();
    await this.delay(this.DELAYS.afterSelect);
    this.log('Clicked Unlike button');

    // Look for a confirmation button (if Instagram prompts "Confirm" / "Yes")
    const confirmTexts = ['Confirm', 'Remove', 'Delete', 'Yes'];
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
      this.log('No confirmation needed');
    }
  };

  // One full cycle: select → unlike → reload (and flag storage accordingly)
  processCycle = async () => {
    try {
      this.cycles++;
      this.log(`=== Cycle ${this.cycles} starting ===`);

      await this.clickSelectButton();
      const selectedCount = await this.selectBatch();

      if (selectedCount === 0) {
        this.log('No items left to select—stopping');
        // Clear "running" flag in storage
        chrome.storage.local.set({ bulkUnlikeRunning: false });
        return false;
      }

      this.totalProcessed += selectedCount;
      this.log(
        `Total selected this cycle: ${selectedCount}. Processed so far: ${this.totalProcessed}`
      );

      await this.unlikeSelectedItems();
      this.log(`=== Cycle ${this.cycles} completed ===`);
      return true;
    } catch (err) {
      this.log(`Cycle ${this.cycles} error: ${err.message}`);
      // On error, clear "running" so it not keep auto‐starting
      chrome.storage.local.set({ bulkUnlikeRunning: false });
      return false;
    }
  };

  // Start the loop; after each cycle it reloads the page
  run = async () => {
    this.isRunning = true;
    chrome.storage.local.set({ bulkUnlikeRunning: true });
    this.updateStatus('Starting bulk unlike...');

    while (this.isRunning) {
      const ok = await this.processCycle();
      if (!ok || !this.isRunning) break;

      // Quick pause, then reload
      await this.delay(this.DELAYS.reloadWait);
      this.log('Reloading page for next cycle...');
      window.location.reload();
      return;
    }

    this.log('Bulk unlike stopped');
    this.updateStatus('Stopped');
    this.isRunning = false;
    chrome.storage.local.set({ bulkUnlikeRunning: false });
  };

  stop = () => {
    this.isRunning = false;
    this.log('Stop requested');
    chrome.storage.local.set({ bulkUnlikeRunning: false });
    this.updateStatus('Stopped');
  };

  getStatus = () => ({
    running: this.isRunning,
    cycles: this.cycles,
    processed: this.totalProcessed,
    action: this.currentAction,
  });
}

// Instantiate controller
const bulkUnlike = new InstagramBulkUnlike();

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    if (!bulkUnlike.isRunning) bulkUnlike.run();
    sendResponse({ success: true });
  }
  else if (message.action === 'stop') {
    bulkUnlike.stop();
    sendResponse({ success: true });
  }
  else if (message.action === 'getStatus') {
    sendResponse(bulkUnlike.getStatus());
  }
});

// On each content‐script injection (i.e. after reload), check if we should resume
chrome.storage.local.get(['bulkUnlikeRunning'], (result) => {
  if (result.bulkUnlikeRunning) {
    console.log('Resuming Bulk Unlike in 5 seconds...');
    setTimeout(() => {
      if (!bulkUnlike.isRunning) {
        bulkUnlike.run();
      }
    }, bulkUnlike.DELAYS.resumeDelay);
  }
});

// If this page matches the "likes" URL, log readiness
if (window.location.href.includes('your_activity/interactions/likes')) {
  console.log('IG Bulk Unlike loaded and ready');
=======
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

    this.loadConfig();
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
        this.log(`=== Cycle ${this.cycles} starting (attempt ${retryCount + 1}) ===`);

        await this.clickSelectButton();
        const selectedCount = await this.selectBatch();

        if (selectedCount === 0) {
          this.log('No items left to select—stopping');
          chrome.storage.local.set({ bulkUnlikeRunning: false });
          return false;
        }

        this.totalProcessed += selectedCount;
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
  stop = () => {
    this.isRunning = false;
    this.log('Stop requested by user');
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
>>>>>>> 6c238ae (Huge update to  UI and fix unlike selection bugs)
}