// popup/popup.js - CodeGrab Pro Popup Logic
console.log('CodeGrab Pro popup loaded');

class CodeGrabPopup {
  constructor() {
    this.currentTab = null;
    this.codeBlocks = [];
    this.selectedBlocks = new Set();
    this.filteredBlocks = [];
    this.currentModal = null;
    this.settings = {};
    
    this.init();
  }

  async init() {
    // Get current tab
    await this.getCurrentTab();
    
    // Load settings
    await this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Apply theme
    this.applyTheme();
    
    // Load scan results
    await this.loadScanResults();
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      this.settings = response || {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {};
    }
  }

  setupEventListeners() {
    // Header actions
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
    document.getElementById('scanBtn')?.addEventListener('click', () => this.scanPage());
    document.getElementById('emptyScanBtn')?.addEventListener('click', () => this.scanPage());

    // Search and filters
    document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
    document.getElementById('clearSearch')?.addEventListener('click', () => this.clearSearch());
    document.getElementById('languageFilter')?.addEventListener('change', (e) => this.handleFilter('language', e.target.value));
    document.getElementById('sizeFilter')?.addEventListener('change', (e) => this.handleFilter('size', e.target.value));

    // Bulk actions
    document.getElementById('selectAllBtn')?.addEventListener('click', () => this.selectAll());
    document.getElementById('deselectAllBtn')?.addEventListener('click', () => this.deselectAll());

    // Toolbar actions
    document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => this.downloadSelected());
    document.getElementById('exportBtn')?.addEventListener('click', () => this.toggleExportDropdown());

    // Export dropdown
    document.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleExport(e.target.dataset.export));
    });

    // Modal actions
    document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('copyCodeBtn')?.addEventListener('click', () => this.copyCurrentCode());
    document.getElementById('downloadCodeBtn')?.addEventListener('click', () => this.downloadCurrentCode());

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        this.closeDropdowns();
      }
    });

    // Close modal when clicking backdrop
    document.getElementById('previewModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'previewModal') {
        this.closeModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  async loadScanResults() {
    if (!this.currentTab) return;

    this.showLoading();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getScanResults',
        tabId: this.currentTab.id
      });

      if (response && response.blocks) {
        this.codeBlocks = response.blocks;
        this.updateUI();
      } else {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Failed to load scan results:', error);
      this.showEmptyState();
    }
  }

  async scanPage() {
    if (!this.currentTab) return;

    this.showLoading();
    this.updateStatus('Scanning page...', 'scanning');

    try {
      // Send scan message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'scanPage',
        tabId: this.currentTab.id
      });

      // Wait a bit for scanning to complete
      setTimeout(async () => {
        await this.loadScanResults();
      }, 2000);

    } catch (error) {
      console.error('Scan failed:', error);
      this.updateStatus('Scan failed', 'error');
      this.showEmptyState();
    }
  }

  updateUI() {
    this.hideLoading();
    this.filteredBlocks = [...this.codeBlocks];
    this.renderResults();
    this.updateStatus(`Found ${this.codeBlocks.length} code blocks`, 'success');
    this.updateBlockCount();
  }

  renderResults() {
    const container = document.getElementById('resultsList');
    if (!container) return;

    container.innerHTML = '';

    if (this.filteredBlocks.length === 0) {
      this.showEmptyState();
      return;
    }

    this.showResultsList();

    this.filteredBlocks.forEach((block, index) => {
      const item = this.createBlockItem(block, index);
      container.appendChild(item);
    });

    // Add animation
    container.classList.add('fade-in');
  }

  createBlockItem(block, index) {
    const item = document.createElement('div');
    item.className = 'code-block-item';
    item.dataset.blockId = block.id;

    const isSelected = this.selectedBlocks.has(block.id);
    if (isSelected) {
      item.classList.add('selected');
    }

    item.innerHTML = `
      <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''}>
      <div class="item-content">
        <div class="item-header">
          <div class="item-title">
            <span class="language-tag">${block.language}</span>
          </div>
          <div class="item-meta">
            <span>${block.lines} lines</span>
            <span>${this.formatFileSize(block.size)}</span>
          </div>
        </div>
        <div class="item-context">${this.escapeHtml(block.context)}</div>
        <div class="item-preview">${this.escapeHtml(block.code.substring(0, 200))}</div>
      </div>
      <div class="item-actions">
        <button class="icon-btn preview-btn" title="Preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="icon-btn copy-btn" title="Copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="icon-btn download-btn" title="Download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    `;

    // Event listeners for item
    const checkbox = item.querySelector('.item-checkbox');
    const previewBtn = item.querySelector('.preview-btn');
    const copyBtn = item.querySelector('.copy-btn');
    const downloadBtn = item.querySelector('.download-btn');

    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      this.toggleBlockSelection(block.id, e.target.checked);
    });

    item.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox' && !e.target.closest('.item-actions')) {
        this.showPreview(block);
      }
    });

    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showPreview(block);
    });

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyCode(block);
    });

    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadSingle(block);
    });

    return item;
  }

  toggleBlockSelection(blockId, selected) {
    if (selected) {
      this.selectedBlocks.add(blockId);
    } else {
      this.selectedBlocks.delete(blockId);
    }

    this.updateSelectionUI();
  }

  updateSelectionUI() {
    const selectedCount = this.selectedBlocks.size;
    
    // Update selected count
    const selectedCountEl = document.getElementById('selectedCount');
    if (selectedCountEl) {
      selectedCountEl.textContent = `${selectedCount} selected`;
    }

    // Show/hide toolbar and bulk actions
    const toolbar = document.getElementById('bottomToolbar');
    const bulkActions = document.getElementById('bulkActions');
    
    if (selectedCount > 0) {
      toolbar?.style.setProperty('display', 'flex');
      bulkActions?.style.setProperty('display', 'flex');
      
      // Enable buttons
      document.getElementById('downloadSelectedBtn')?.removeAttribute('disabled');
      document.getElementById('exportBtn')?.removeAttribute('disabled');
    } else {
      toolbar?.style.setProperty('display', 'none');
      bulkActions?.style.setProperty('display', 'none');
      
      // Disable buttons
      document.getElementById('downloadSelectedBtn')?.setAttribute('disabled', '');
      document.getElementById('exportBtn')?.setAttribute('disabled', '');
    }

    // Update item visual state
    document.querySelectorAll('.code-block-item').forEach(item => {
      const blockId = item.dataset.blockId;
      const checkbox = item.querySelector('.item-checkbox');
      
      if (this.selectedBlocks.has(blockId)) {
        item.classList.add('selected');
        checkbox.checked = true;
      } else {
        item.classList.remove('selected');
        checkbox.checked = false;
      }
    });
  }

  selectAll() {
    this.filteredBlocks.forEach(block => {
      this.selectedBlocks.add(block.id);
    });
    this.updateSelectionUI();
  }

  deselectAll() {
    this.selectedBlocks.clear();
    this.updateSelectionUI();
  }

  handleSearch(query) {
    const searchQuery = query.toLowerCase().trim();
    
    this.filteredBlocks = this.codeBlocks.filter(block => {
      return block.code.toLowerCase().includes(searchQuery) ||
             block.context.toLowerCase().includes(searchQuery) ||
             block.filename.toLowerCase().includes(searchQuery) ||
             block.language.toLowerCase().includes(searchQuery);
    });

    this.renderResults();
    this.updateBlockCount();
  }

  clearSearch() {
    document.getElementById('searchInput').value = '';
    this.filteredBlocks = [...this.codeBlocks];
    this.renderResults();
    this.updateBlockCount();
  }

  handleFilter(type, value) {
    let filtered = [...this.codeBlocks];

    // Apply language filter
    const languageFilter = document.getElementById('languageFilter')?.value;
    if (languageFilter) {
      filtered = filtered.filter(block => block.language === languageFilter);
    }

    // Apply size filter
    const sizeFilter = document.getElementById('sizeFilter')?.value;
    if (sizeFilter) {
      filtered = filtered.filter(block => {
        switch (sizeFilter) {
          case 'small': return block.size < 1024;
          case 'medium': return block.size >= 1024 && block.size <= 10240;
          case 'large': return block.size > 10240;
          default: return true;
        }
      });
    }

    // Apply search query if exists
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase().trim();
    if (searchQuery) {
      filtered = filtered.filter(block => {
        return block.code.toLowerCase().includes(searchQuery) ||
               block.context.toLowerCase().includes(searchQuery) ||
               block.filename.toLowerCase().includes(searchQuery) ||
               block.language.toLowerCase().includes(searchQuery);
      });
    }

    this.filteredBlocks = filtered;
    this.renderResults();
    this.updateBlockCount();
  }

  async showPreview(block) {
    const modal = document.getElementById('previewModal');
    if (!modal) return;

    // Update modal content
    document.getElementById('modalTitle').textContent = block.filename;
    document.getElementById('modalLanguage').textContent = block.language;
    document.getElementById('modalStats').textContent = `${block.lines} lines • ${this.formatFileSize(block.size)}`;
    
    const codeEl = document.querySelector('#previewCode code');
    if (codeEl) {
      codeEl.textContent = block.code;
      codeEl.className = `language-${block.language}`;
    }

    // Store current block for modal actions
    this.currentModal = block;

    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('fade-in');

    // Apply syntax highlighting if available
    if (window.hljs) {
      window.hljs.highlightElement(codeEl);
    }
  }

  closeModal() {
    const modal = document.getElementById('previewModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('fade-in');
    }
    this.currentModal = null;
  }

  async copyCode(block) {
    try {
      await navigator.clipboard.writeText(block.code);
      this.showToast('Code copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      this.showToast('Failed to copy code', 'error');
    }
  }

  async copyCurrentCode() {
    if (this.currentModal) {
      await this.copyCode(this.currentModal);
      this.closeModal();
    }
  }

  async downloadSingle(block) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'downloadFile',
        payload: {
          filename: block.filename,
          content: block.code,
          mimeType: this.getMimeType(block.language)
        }
      });

      if (response.success) {
        this.showToast('File downloaded successfully!', 'success');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download failed:', error);
      this.showToast('Failed to download file', 'error');
    }
  }

  async downloadCurrentCode() {
    if (this.currentModal) {
      await this.downloadSingle(this.currentModal);
      this.closeModal();
    }
  }

  async downloadSelected() {
    const selectedBlocks = this.codeBlocks.filter(block => 
      this.selectedBlocks.has(block.id)
    );

    if (selectedBlocks.length === 0) return;

    try {
      for (const block of selectedBlocks) {
        await chrome.runtime.sendMessage({
          action: 'downloadFile',
          payload: {
            filename: block.filename,
            content: block.code,
            mimeType: this.getMimeType(block.language)
          }
        });
      }

      this.showToast(`Downloaded ${selectedBlocks.length} files!`, 'success');
    } catch (error) {
      console.error('Download failed:', error);
      this.showToast('Failed to download files', 'error');
    }
  }

  toggleExportDropdown() {
    const dropdown = document.getElementById('exportDropdown');
    if (dropdown) {
      dropdown.classList.toggle('open');
    }
  }

  closeDropdowns() {
    document.querySelectorAll('.dropdown.open').forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  }

  async handleExport(type) {
    const selectedBlocks = this.codeBlocks.filter(block => 
      this.selectedBlocks.has(block.id)
    );

    if (selectedBlocks.length === 0) return;

    this.closeDropdowns();

    try {
      switch (type) {
        case 'zip':
          await this.exportAsZip(selectedBlocks);
          break;
        case 'github':
          await this.exportToGitHub(selectedBlocks);
          break;
        case 'codepen':
          await this.exportToCodePen(selectedBlocks);
          break;
        case 'jsfiddle':
          await this.exportToJSFiddle(selectedBlocks);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Export failed', 'error');
    }
  }

  async exportAsZip(blocks) {
    // This would require JSZip library
    this.showToast('ZIP export coming soon!', 'info');
  }

  async exportToGitHub(blocks) {
    this.showToast('GitHub Gist export coming soon!', 'info');
  }

  async exportToCodePen(blocks) {
    this.showToast('CodePen export coming soon!', 'info');
  }

  async exportToJSFiddle(blocks) {
    this.showToast('JSFiddle export coming soon!', 'info');
  }

  toggleTheme() {
    const currentTheme = document.body.dataset.theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.body.dataset.theme = newTheme;
    
    // Save theme preference
    this.settings.theme = newTheme;
    this.saveSettings();
  }

  applyTheme() {
    const theme = this.settings.theme || 'light';
    document.body.dataset.theme = theme;
  }

  async saveSettings() {
    try {
      await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: this.settings
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  showLoading() {
    document.getElementById('loadingState')?.style.setProperty('display', 'flex');
    document.getElementById('emptyState')?.style.setProperty('display', 'none');
    document.getElementById('resultsList')?.style.setProperty('display', 'none');
  }

  hideLoading() {
    document.getElementById('loadingState')?.style.setProperty('display', 'none');
  }

  showEmptyState() {
    document.getElementById('emptyState')?.style.setProperty('display', 'flex');
    document.getElementById('resultsList')?.style.setProperty('display', 'none');
    this.hideLoading();
  }

  showResultsList() {
    document.getElementById('resultsList')?.style.setProperty('display', 'block');
    document.getElementById('emptyState')?.style.setProperty('display', 'none');
    this.hideLoading();
  }

  updateStatus(text, type = 'info') {
    const statusEl = document.getElementById('statusText');
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = `status-${type}`;
    }
  }

  updateBlockCount() {
    const countEl = document.getElementById('blockCount');
    if (countEl) {
      countEl.textContent = `${this.filteredBlocks.length} blocks`;
    }
  }

  showToast(message, type = 'info') {
    // Simple toast notification - could be enhanced
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getMimeType(language) {
    const mimeTypes = {
      javascript: 'text/javascript',
      python: 'text/x-python',
      java: 'text/x-java',
      css: 'text/css',
      html: 'text/html',
      php: 'application/x-httpd-php',
      sql: 'text/x-sql',
      json: 'application/json',
      xml: 'application/xml'
    };
    
    return mimeTypes[language] || 'text/plain';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleKeyDown(e) {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'a':
          e.preventDefault();
          this.selectAll();
          break;
        case 'f':
          e.preventDefault();
          document.getElementById('searchInput')?.focus();
          break;
      }
    }

    // ESC to close modal
    if (e.key === 'Escape') {
      this.closeModal();
      this.closeDropdowns();
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CodeGrabPopup();
});