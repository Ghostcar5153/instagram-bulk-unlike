document.addEventListener('DOMContentLoaded', async () => {
  // —— Main UI Elements ——
  const wrongPageState      = document.getElementById('wrong-page-state');
  const correctPageState    = document.getElementById('correct-page-state');
  const navigateBtn         = document.getElementById('navigate-btn');
  const startBtn            = document.getElementById('start-btn');
  const stopBtn             = document.getElementById('stop-btn');
  const statusCard          = document.getElementById('status-card');
  const statusText          = document.getElementById('status-text');
  const statusSubtitle      = document.getElementById('status-subtitle');
  const cyclesSpan          = document.getElementById('cycles-count');
  const processedSpan       = document.getElementById('processed-count');
  const currentActionSpan   = document.getElementById('current-action');
  const connectionDot       = document.getElementById('connection-dot');
  const connectionText      = document.getElementById('connection-text');

  // —— Modal & Main Container ——
  const mainContent         = document.getElementById('main-content');
  const settingsModal       = document.getElementById('settings-modal');
  const openSettingsBtn     = document.getElementById('open-settings');
  const closeSettingsBtn    = document.getElementById('close-settings');

  // —— Settings Form Elements ——
  const presetBtns          = document.querySelectorAll('.preset-btn');
  const batchSizeInput      = document.getElementById('batch-size');
  const betweenClicksInput  = document.getElementById('between-clicks');
  const afterSelectInput    = document.getElementById('after-select');
  const afterUnlikeInput    = document.getElementById('after-unlike');
  const reloadWaitInput     = document.getElementById('reload-wait');
  const resumeDelayInput    = document.getElementById('resume-delay');
  const maxRetriesInput     = document.getElementById('max-retries');
  const respectRateLimitChk = document.getElementById('respect-rate-limit');
  const autoRetryChk        = document.getElementById('auto-retry');
  const saveBtn             = document.getElementById('save-settings');
  const resetBtn            = document.getElementById('reset-settings');
  const notificationDiv     = document.getElementById('notification');

  // —— State Variables ——
  let isRunning = false;
  let isOnCorrectPage = false;
  const config = new InstagramBulkUnlikeConfig();
  let currentConfig = await config.load();

  // —— Preset Definitions ——
  const presets = {
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

  // —— Helper: Show Toast Notification ——
  function showNotification(msg, type = 'success') {
    if (!notificationDiv) return;
    notificationDiv.textContent = msg;
    notificationDiv.className = `notification ${type} show`;
    setTimeout(() => notificationDiv.classList.remove('show'), 2500);
  }

  // —— Helper: Populate Settings Form from Config ——
  function loadConfigToForm(cfg) {
    if (batchSizeInput) batchSizeInput.value = cfg.batchSize;
    if (betweenClicksInput) betweenClicksInput.value = cfg.delays.betweenClicks;
    if (afterSelectInput) afterSelectInput.value = cfg.delays.afterSelect;
    if (afterUnlikeInput) afterUnlikeInput.value = cfg.delays.afterUnlike;
    if (reloadWaitInput) reloadWaitInput.value = cfg.delays.reloadWait;
    if (resumeDelayInput) resumeDelayInput.value = cfg.delays.resumeDelay;
    if (maxRetriesInput) maxRetriesInput.value = cfg.maxRetries;
    if (respectRateLimitChk) respectRateLimitChk.checked = cfg.respectRateLimit;
    if (autoRetryChk) autoRetryChk.checked = cfg.autoRetry;
  }

  // —— Helper: Read Settings Form into Config Object ——
  function getConfigFromForm() {
    return {
      delays: {
        betweenClicks: parseInt(betweenClicksInput?.value || 100),
        afterSelect:   parseInt(afterSelectInput?.value || 500),
        afterUnlike:   parseInt(afterUnlikeInput?.value || 1000),
        reloadWait:    parseInt(reloadWaitInput?.value || 1000),
        resumeDelay:   parseInt(resumeDelayInput?.value || 5000),
      },
      batchSize:        parseInt(batchSizeInput?.value || 50),
      maxRetries:       parseInt(maxRetriesInput?.value || 3),
      respectRateLimit: respectRateLimitChk?.checked ?? true,
      autoRetry:        autoRetryChk?.checked ?? true
    };
  }

  // —— Main UI: Check Current Tab & Page State ——
  async function checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url.includes('instagram.com/your_activity/interactions/likes')) {
        isOnCorrectPage = true;
        if (wrongPageState) wrongPageState.style.display = 'none';
        if (correctPageState) correctPageState.style.display = 'block';
        if (connectionDot) connectionDot.classList.add('connected');
        if (connectionText) connectionText.textContent = 'Connected to Instagram';
        
        chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, resp => {
          if (resp) updateUI(resp);
        });
      } else {
        isOnCorrectPage = false;
        if (wrongPageState) wrongPageState.style.display = 'block';
        if (correctPageState) correctPageState.style.display = 'none';
        if (connectionDot) connectionDot.classList.remove('connected');
        if (connectionText) connectionText.textContent = 'Navigate to Instagram Likes';
      }
    } catch (e) {
      console.error(e);
      if (connectionDot) connectionDot.classList.remove('connected');
      if (connectionText) connectionText.textContent = 'Connection error';
    }
  }

  // —— Main UI: Update Status Card & Buttons ——
  function updateUI(state) {
    if (state.running) {
      isRunning = true;
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      if (statusCard) statusCard.classList.add('active', 'loading');
      if (statusText) statusText.textContent = state.action || 'Running...';
      if (statusSubtitle) statusSubtitle.textContent = 'Process is active';
      if (currentActionSpan) currentActionSpan.textContent = state.action || 'Processing...';
    } else {
      isRunning = false;
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (statusCard) statusCard.classList.remove('active', 'error', 'loading');
      if (statusText) statusText.textContent = 'Ready to start';
      if (statusSubtitle) statusSubtitle.textContent = 'Click start to begin bulk unliking';
      if (currentActionSpan) currentActionSpan.textContent = 'Waiting for action...';
    }
    if (cyclesSpan) cyclesSpan.textContent = state.cycles || 0;
    if (processedSpan) processedSpan.textContent = state.processed || 0;
  }

  // —— Main UI: Start / Stop Buttons ——
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (isRunning || !isOnCorrectPage) return;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'start' });
        updateUI({ running: true, action: 'Starting…', cycles: 0, processed: 0 });
      } catch (e) {
        console.error(e);
        if (statusCard) statusCard.classList.add('error');
        if (statusText) statusText.textContent = 'Error starting';
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      if (!isRunning) return;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'stop' });
        updateUI({ running: false, action: 'Stopped', cycles: 0, processed: 0 });
      } catch (e) {
        console.error(e);
        if (statusCard) statusCard.classList.add('error');
        if (statusText) statusText.textContent = 'Error stopping';
      }
    });
  }

  // —— Main UI: Navigate Button ——
  if (navigateBtn) {
    navigateBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.update(tab.id, { url: 'https://www.instagram.com/your_activity/interactions/likes/' });
      window.close();
    });
  }

  // —— Listen for Status Messages from Content Script ——
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'status') updateUI(msg.data);
  });

  // —— Poll Page State While Open ——
  const pageCheckInterval = setInterval(checkCurrentPage, 2000);
  window.addEventListener('beforeunload', () => clearInterval(pageCheckInterval));
  checkCurrentPage();  // initial check

  // —— Settings Modal: Open / Close ——
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      if (wrongPageState) wrongPageState.style.display = 'none';
      if (correctPageState) correctPageState.style.display = 'none';
      if (settingsModal) settingsModal.style.display = 'block';
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.style.display = 'none';
      checkCurrentPage();
    });
  }

  // —— Settings: Presets ——
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      const p = presets[presetName];
      if (!p) return;
      loadConfigToForm(p);
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showNotification(`Applied ${presetName} preset`);
    });
  });

  // —— Settings: Save & Reset ——
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      try {
        const newCfg = getConfigFromForm();
        currentConfig = await config.save(newCfg);
        presetBtns.forEach(b => b.classList.remove('active'));
        showNotification('Settings saved');
      } catch (e) {
        showNotification('Save failed', 'error');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset to defaults?')) return;
      currentConfig = await config.reset();
      loadConfigToForm(currentConfig);
      presetBtns.forEach(b => b.classList.remove('active'));
      const balancedBtn = document.querySelector('[data-preset="balanced"]');
      if (balancedBtn) balancedBtn.classList.add('active');
      showNotification('Defaults restored');
    });
  }

  // —— Initialize Settings Form ——
  loadConfigToForm(currentConfig);
  const balancedBtn = document.querySelector('[data-preset="balanced"]');
  if (balancedBtn) balancedBtn.classList.add('active');
});
