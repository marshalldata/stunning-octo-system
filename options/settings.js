// options/settings.js - CodeGrab Pro Settings Manager
console.log('CodeGrab Pro settings loaded');

class SettingsManager {
  constructor() {
    this.settings = this.getDefaultSettings();
    this.init();
  }

  getDefaultSettings() {
    return {
      theme: 'light',
      autoScan: true,
      enableNotifications: true,
      minCodeLength: 10,
      maxCodeBlocks: 50,
      scanDelay: 1000,
      customSelectors: '',
      syntaxHighlighting: true,
      showLineNumbers: true,
      wordWrap: false,
      exportFormat: 'individual',
      addMetadata: true,
      githubToken: '',
      codepenUsername: '',
      enableWebWorker: true,
      enableCaching: true,
      excludedDomains: []
    };
  }

  async init() {
    // Load current settings
    await this.loadSettings();
    
    // Bind UI elements
    this.bindUIElements();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Apply theme
    this.applyTheme();
    
    // Populate UI with current settings
    this.populateUI();
  }

  bindUIElements() {
    // General settings
    this.themeSelect = document.getElementById('themeSelect');
    this.autoScanCheckbox = document.getElementById('autoScanCheckbox');
    this.notificationsCheckbox = document.getElementById('notificationsCheckbox');
    
    // Scanning settings
    this.minCodeLengthSlider = document.getElementById('minCodeLengthSlider');
    this.minCodeLengthValue = document.getElementById('minCodeLengthValue');
    this.maxCodeBlocksSlider = document.getElementById('maxCodeBlocksSlider');
    this.maxCodeBlocksValue = document.getElementById('maxCodeBlocksValue');
    this.scanDelaySlider = document.getElementById('scanDelaySlider');
    this.scanDelayValue = document.getElementById('scanDelayValue');
    this.customSelectorsInput = document.getElementById('customSelectorsInput');
    
    // Display settings
    this.syntaxHighlightingCheckbox = document.getElementById('syntaxHighlightingCheckbox');
    this.showLineNumbersCheckbox = document.getElementById('showLineNumbersCheckbox');
    this.wordWrapCheckbox = document.getElementById('wordWrapCheckbox');
    
    // Export settings
    this.exportFormatSelect = document.getElementById('exportFormatSelect');
    this.addMetadataCheckbox = document.getElementById('addMetadataCheckbox');
    this.githubTokenInput = document.getElementById('githubTokenInput');
    this.codepenUsernameInput = document.getElementById('codepenUsernameInput');
    
    // Advanced settings
    this.enableWebWorkerCheckbox = document.getElementById('enableWebWorkerCheckbox');
    this.enableCachingCheckbox = document.getElementById('enableCachingCheckbox');
    this.excludedDomainsTextarea = document.getElementById('excludedDomainsTextarea');
    
    // Buttons
    this.saveBtn = document.getElementById('saveBtn');
    this.saveBtn2 = document.getElementById('saveBtn2');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.exportSettingsBtn = document.getElementById('exportSettingsBtn');
    this.importSettingsBtn = document.getElementById('importSettingsBtn');
    this.testGithubBtn = document.getElementById('testGithubBtn');
    this.importFileInput = document.getElementById('importFileInput');
  }

  setupEventListeners() {
    // Theme change
    this.themeSelect?.addEventListener('change', (e) => {
      this.settings.theme = e.target.value;
      this.applyTheme();
    });

    // Slider updates
    this.minCodeLengthSlider?.addEventListener('input', (e) => {
      this.minCodeLengthValue.textContent = e.target.value;
      this.settings.minCodeLength = parseInt(e.target.value);
    });

    this.maxCodeBlocksSlider?.addEventListener('input', (e) => {
      this.maxCodeBlocksValue.textContent = e.target.value;
      this.settings.maxCodeBlocks = parseInt(e.target.value);
    });

    this.scanDelaySlider?.addEventListener('input', (e) => {
      this.scanDelayValue.textContent = e.target.value + 'ms';
      this.settings.scanDelay = parseInt(e.target.value);
    });

    // Checkbox changes
    this.autoScanCheckbox?.addEventListener('change', (e) => {
      this.settings.autoScan = e.target.checked;
    });

    this.notificationsCheckbox?.addEventListener('change', (e) => {
      this.settings.enableNotifications = e.target.checked;
    });

    this.syntaxHighlightingCheckbox?.addEventListener('change', (e) => {
      this.settings.syntaxHighlighting = e.target.checked;
    });

    this.showLineNumbersCheckbox?.addEventListener('change', (e) => {
      this.settings.showLineNumbers = e.target.checked;
    });

    this.wordWrapCheckbox?.addEventListener('change', (e) => {
      this.settings.wordWrap = e.target.checked;
    });

    this.addMetadataCheckbox?.addEventListener('change', (e) => {
      this.settings.addMetadata = e.target.checked;
    });

    this.enableWebWorkerCheckbox?.addEventListener('change', (e) => {
      this.settings.enableWebWorker = e.target.checked;
    });

    this.enableCachingCheckbox?.addEventListener('change', (e) => {
      this.settings.enableCaching = e.target.checked;
    });

    // Select changes
    this.exportFormatSelect?.addEventListener('change', (e) => {
      this.settings.exportFormat = e.target.value;
    });

    // Input changes
    this.customSelectorsInput?.addEventListener('change', (e) => {
      this.settings.customSelectors = e.target.value;
    });

    this.githubTokenInput?.addEventListener('change', (e) => {
      this.settings.githubToken = e.target.value;
    });

    this.codepenUsernameInput?.addEventListener('change', (e) => {
      this.settings.codepenUsername = e.target.value;
    });

    this.excludedDomainsTextarea?.addEventListener('change', (e) => {
      this.settings.excludedDomains = e.target.value
        .split('\n')
        .map(domain => domain.trim())
        .filter(domain => domain.length > 0);
    });

    // Button clicks
    this.saveBtn?.addEventListener('click', () => this.saveSettings());
    this.saveBtn2?.addEventListener('click', () => this.saveSettings());
    this.cancelBtn?.addEventListener('click', () => this.cancelChanges());
    this.resetBtn?.addEventListener('click', () => this.resetToDefaults());
    this.exportSettingsBtn?.addEventListener('click', () => this.exportSettings());
    this.importSettingsBtn?.addEventListener('click', () => this.importSettings());
    this.testGithubBtn?.addEventListener('click', () => this.testGitHubToken());

    // File input
    this.importFileInput?.addEventListener('change', (e) => this.handleFileImport(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveSettings();
      }
    });
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      this.settings = { ...this.getDefaultSettings(), ...response };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  populateUI() {
    // General settings
    if (this.themeSelect) this.themeSelect.value = this.settings.theme;
    if (this.autoScanCheckbox) this.autoScanCheckbox.checked = this.settings.autoScan;
    if (this.notificationsCheckbox) this.notificationsCheckbox.checked = this.settings.enableNotifications;
    
    // Scanning settings
    if (this.minCodeLengthSlider) {
      this.minCodeLengthSlider.value = this.settings.minCodeLength;
      this.minCodeLengthValue.textContent = this.settings.minCodeLength;
    }
    
    if (this.maxCodeBlocksSlider) {
      this.maxCodeBlocksSlider.value = this.settings.maxCodeBlocks;
      this.maxCodeBlocksValue.textContent = this.settings.maxCodeBlocks;
    }
    
    if (this.scanDelaySlider) {
      this.scanDelaySlider.value = this.settings.scanDelay;
      this.scanDelayValue.textContent = this.settings.scanDelay + 'ms';
    }
    
    if (this.customSelectorsInput) this.customSelectorsInput.value = this.settings.customSelectors;
    
    // Display settings
    if (this.syntaxHighlightingCheckbox) this.syntaxHighlightingCheckbox.checked = this.settings.syntaxHighlighting;
    if (this.showLineNumbersCheckbox) this.showLineNumbersCheckbox.checked = this.settings.showLineNumbers;
    if (this.wordWrapCheckbox) this.wordWrapCheckbox.checked = this.settings.wordWrap;
    
    // Export settings
    if (this.exportFormatSelect) this.exportFormatSelect.value = this.settings.exportFormat;
    if (this.addMetadataCheckbox) this.addMetadataCheckbox.checked = this.settings.addMetadata;
    if (this.githubTokenInput) this.githubTokenInput.value = this.settings.githubToken;
    if (this.codepenUsernameInput) this.codepenUsernameInput.value = this.settings.codepenUsername;
    
    // Advanced settings
    if (this.enableWebWorkerCheckbox) this.enableWebWorkerCheckbox.checked = this.settings.enableWebWorker;
    if (this.enableCachingCheckbox) this.enableCachingCheckbox.checked = this.settings.enableCaching;
    if (this.excludedDomainsTextarea) {
      this.excludedDomainsTextarea.value = this.settings.excludedDomains.join('\n');
    }
  }

  async saveSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: this.settings
      });
      
      if (response.success) {
        this.showToast('Settings saved successfully!', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  async cancelChanges() {
    await this.loadSettings();
    this.populateUI();
    this.showToast('Changes cancelled', 'warning');
  }

  async resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      this.settings = this.getDefaultSettings();
      this.populateUI();
      await this.saveSettings();
      this.showToast('Settings reset to defaults', 'success');
    }
  }

  exportSettings() {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `codegrab-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    this.showToast('Settings exported successfully!', 'success');
  }

  importSettings() {
    this.importFileInput.click();
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        
        // Validate imported settings
        if (this.validateSettings(importedSettings)) {
          this.settings = { ...this.getDefaultSettings(), ...importedSettings };
          this.populateUI();
          this.showToast('Settings imported successfully!', 'success');
        } else {
          throw new Error('Invalid settings format');
        }
      } catch (error) {
        console.error('Failed to import settings:', error);
        this.showToast('Failed to import settings: Invalid file format', 'error');
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  validateSettings(settings) {
    const defaults = this.getDefaultSettings();
    
    // Check if all required keys exist and have correct types
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!(key in settings)) {
        return false;
      }
      
      if (typeof settings[key] !== typeof defaultValue) {
        return false;
      }
    }
    
    return true;
  }

  async testGitHubToken() {
    const token = this.githubTokenInput?.value.trim();
    
    if (!token) {
      this.showToast('Please enter a GitHub token first', 'warning');
      return;
    }
    
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'CodeGrab-Pro'
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        this.showToast(`GitHub token is valid! Logged in as: ${user.login}`, 'success');
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error('GitHub token test failed:', error);
      this.showToast('GitHub token is invalid or expired', 'error');
    }
  }

  applyTheme() {
    document.body.dataset.theme = this.settings.theme;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconSvg = this.getToastIcon(type);
    
    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${message}</span>
      <button class="toast-close">×</button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
  }

  getToastIcon(type) {
    const icons = {
      success: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--success-color)">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>`,
      error: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--danger-color)">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>`,
      warning: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--warning-color)">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>`,
      info: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--primary-color)">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`
    };
    
    return icons[type] || icons.info;
  }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});