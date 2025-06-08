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
}