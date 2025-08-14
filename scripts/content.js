// scripts/content.js - FIXED VERSION
console.log('CodeGrab Pro content script loaded');

// Prevent multiple executions
if (window.codeGrabProLoaded) {
  console.log('CodeGrab Pro already loaded, skipping...');
} else {
  window.codeGrabProLoaded = true;

  // Configuration
  const CONFIG = {
    selectors: [
      'pre code',           // Most common: <pre><code>
      'pre',               // Plain <pre> blocks
      '.highlight code',   // GitHub style
      '.code-block code',  // Common class
      '.language-javascript',
      '.language-python',
      '.language-java',
      '.language-css',
      '.language-html',
      '.language-php',
      '.language-sql',
      '.language-json',
      '.language-xml',
      '[class*="lang-"]',
      '[class*="language-"]',
      '.codehilite code',
      '.highlight-source code'
    ],
    minLength: 10,         // Minimum characters required for detection
    maxBlocks: 50,         // Reduced from 100
    excludeSelectors: [
      'nav',
      'header', 
      'footer',
      '.navigation',
      '.menu',
      '.sidebar',
      '.advertisement',
      '.ads',
      'button',
      'input',
      'textarea',
      '.form-control'
    ]
  };

  // Improved language detection patterns
  const LANGUAGE_PATTERNS = {
    javascript: [
      /\bfunction\s+\w+\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /=>\s*[{\(]/,
      /console\.log\s*\(/,
      /document\.\w+/,
      /require\s*\(/,
      /import\s+\w+\s+from/,
      /export\s+(default\s+)?/
    ],
    python: [
      /\bdef\s+\w+\s*\(/,
      /\bclass\s+\w+\s*\(/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import/,
      /\bprint\s*\(/,
      /\bif\s+__name__\s*==\s*['"]__main__['"]:/,
      /\bself\.\w+/
    ],
    java: [
      /\bpublic\s+class\s+\w+/,
      /\bpublic\s+static\s+void\s+main/,
      /System\.out\.println/,
      /\bprivate\s+\w+/,
      /\bpublic\s+\w+\s+\w+\s*\(/
    ],
    css: [
      /\.[a-zA-Z][\w-]*\s*\{/,
      /#[a-zA-Z][\w-]*\s*\{/,
      /@media\s+/,
      /:\s*\w+\s*;/,
      /@keyframes\s+/
    ],
    html: [
      /<\!DOCTYPE\s+html>/i,
      /<html[\s>]/i,
      /<head[\s>]/i,
      /<body[\s>]/i,
      /<div[\s>]/i,
      /<script[\s>]/i
    ],
    sql: [
      /\bSELECT\b.*\bFROM\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\b.*\bSET\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bDELETE\s+FROM\b/i
    ],
    json: [
      /^\s*[\{\[]/,
      /["}]\s*,\s*["{\[\w]/,
      /"\w+"\s*:\s*["\d\{\[]/
    ]
  };

  // Common language aliases used in class names
  const LANGUAGE_ALIASES = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    py: 'python',
    python: 'python',
    rb: 'ruby',
    ruby: 'ruby',
    sh: 'bash',
    bash: 'bash',
    shell: 'bash',
    html: 'html',
    css: 'css',
    php: 'php',
    c: 'c',
    'c++': 'cpp',
    cpp: 'cpp',
    csharp: 'csharp',
    'c#': 'csharp',
    java: 'java',
    sql: 'sql',
    json: 'json',
    xml: 'xml'
  };

  // File extension mapping
  const EXTENSIONS = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    css: 'css',
    html: 'html',
    php: 'php',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    bash: 'sh',
    ruby: 'rb',
    sql: 'sql',
    json: 'json',
    xml: 'xml',
    plaintext: 'txt'
  };

  // Main scanning function
  function scanForCodeBlocks() {
    console.log('Starting code block scan...');
    
    const codeBlocks = [];
    let blockId = 0;

    // Use more specific selectors
    CONFIG.selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector "${selector}" found ${elements.length} elements`);
      
      elements.forEach(element => {
        try {
          // Skip if inside excluded elements
          if (isInExcludedElement(element)) {
            return;
          }

          const codeText = extractCodeText(element);
          
          // More strict filtering
          if (!codeText || codeText.trim().length < CONFIG.minLength) {
            return;
          }

          // Skip if it looks like regular text
          if (isRegularText(codeText)) {
            return;
          }

          // Skip if it's a child of another code block we've already processed
          if (isChildOfCodeBlock(element, codeBlocks)) {
            return;
          }

          const language = detectLanguage(element, codeText);
          const context = getContext(element);
          const filename = generateFilename(context, language, blockId);
          
          const block = {
            id: `cg-${blockId++}`,
            code: codeText,
            language: language,
            lines: codeText.split('\n').length,
            size: new Blob([codeText]).size,
            context: context,
            filename: filename,
            element: element.tagName.toLowerCase(),
            classes: Array.from(element.classList).join(' '),
            timestamp: new Date().toISOString()
          };

          codeBlocks.push(block);
          
        } catch (error) {
          console.warn('Error processing code block:', error);
        }
      });
    });

    // Remove duplicates based on code content
    const uniqueBlocks = removeDuplicates(codeBlocks);
    
    // Limit number of blocks
    const limitedBlocks = uniqueBlocks.slice(0, CONFIG.maxBlocks);
    
    console.log(`Scan complete: ${limitedBlocks.length} unique code blocks found`);
    
    // Send results to background script
    chrome.runtime.sendMessage({
      action: 'scanResults',
      payload: limitedBlocks
    });

    return limitedBlocks;
  }

  // Check if element is inside excluded elements
  function isInExcludedElement(element) {
    let current = element.parentElement;
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      const className = current.className.toLowerCase();
      
      if (CONFIG.excludeSelectors.some(selector => {
        if (selector.startsWith('.')) {
          return className.includes(selector.substring(1));
        }
        return tagName === selector;
      })) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  // Check if content looks like regular text (not code)
  function isRegularText(text) {
    const lines = text.split('\n');
    
    // If very few lines, probably not code
    if (lines.length < 3 && text.length < 100) {
      return true;
    }

    // Check for code indicators
    const codeIndicators = [
      /[{}\[\];]/,           // Brackets, braces, semicolons
      /\b(function|class|def|public|private|const|let|var)\b/,
      /[<>\/]=?/,            // HTML tags or operators
      /^\s*[#\/*].*/m,       // Comments
      /:\s*\w+/,             // Key-value pairs
      /\w+\.\w+\(/,          // Method calls
      /\b\d+\.\d+\b/,        // Decimals
      /\w+\[\d+\]/           // Array access
    ];

    const codeMatches = codeIndicators.filter(pattern => pattern.test(text)).length;
    
    // If less than 2 code indicators, probably regular text
    if (codeMatches < 2) {
      return true;
    }

    // Check text characteristics
    const avgLineLength = text.length / lines.length;
    const longLines = lines.filter(line => line.length > 80).length;
    const shortLines = lines.filter(line => line.trim().length < 10).length;

    // Regular text usually has longer, more uniform lines
    if (avgLineLength > 100 && longLines > lines.length * 0.7) {
      return true;
    }

    return false;
  }

  // Extract text content from element
  function extractCodeText(element) {
    let text = element.textContent || element.innerText || '';
    
    // Clean up common artifacts
    text = text.replace(/\u00A0/g, ' '); // Non-breaking space
    text = text.replace(/\r\n/g, '\n'); // Normalize line endings
    text = text.trim();
    
    return text;
  }

  // Detect programming language with better accuracy
  function detectLanguage(element, codeText) {
    // Attempt to detect language from class names
    const directClass = getLanguageFromClass(element.className.toLowerCase());
    if (directClass) {
      return directClass;
    }

    // Check a few ancestor elements for language hints
    let parent = element.parentElement;
    for (let i = 0; i < 3 && parent && parent.tagName !== 'BODY'; i++) {
      const fromParent = getLanguageFromClass(parent.className.toLowerCase());
      if (fromParent) {
        return fromParent;
      }
      parent = parent.parentElement;
    }

    // Pattern-based detection with higher threshold
    let bestLang = 'plaintext';
    let bestScore = 0;

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(codeText)) {
          matches++;
        }
      }
      
      const score = matches / patterns.length;
      if (score > bestScore && score > 0.4) { // Higher threshold
        bestScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }

  function getLanguageFromClass(classStr) {
    for (const [alias, lang] of Object.entries(LANGUAGE_ALIASES)) {
      if (
        classStr.includes(`language-${alias}`) ||
        classStr.includes(`lang-${alias}`) ||
        classStr.includes(`highlight-${alias}`) ||
        classStr.split(/\s+/).includes(alias)
      ) {
        return lang;
      }
    }
    return null;
  }

  // Get context information for the code block
  function getContext(element) {
    // Look for nearby headings or descriptive elements
    let current = element;
    
    // Check siblings and ancestors for context
    for (let i = 0; i < 5; i++) {
      if (current.previousElementSibling) {
        const sibling = current.previousElementSibling;
        
        // Check for headings
        if (sibling.tagName && /^H[1-6]$/.test(sibling.tagName)) {
          return sibling.textContent.trim().substring(0, 50);
        }
        
        // Check for file name indicators
        if (sibling.className.includes('filename') || 
            sibling.className.includes('file-header') ||
            sibling.className.includes('code-header')) {
          return sibling.textContent.trim().substring(0, 50);
        }
      }
      
      current = current.parentElement;
      if (!current || current.tagName === 'BODY') break;
    }

    // Fallback to page title or URL
    return document.title.substring(0, 50) || window.location.hostname;
  }

  // Generate filename for the code block
  function generateFilename(context, language, index) {
    let name = sanitizeFilename(context);
    const ext = EXTENSIONS[language] || 'txt';
    
    if (!name || name === 'code-block') {
      name = `code-${index + 1}`;
    }
    
    return `${name}.${ext}`;
  }

  // Sanitize filename
  function sanitizeFilename(name) {
    if (!name) return 'code-block';
    
    return name
      .trim()
      .toLowerCase()
      .replace(/[<>:"/\\|?*]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-_.]/g, '')
      .substring(0, 50);
  }

  // Check if element is child of already processed code block
  function isChildOfCodeBlock(element, processedBlocks) {
    // Check if any parent contains the same code
    let parent = element.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      const parentText = parent.textContent || '';
      for (const block of processedBlocks) {
        if (parentText.includes(block.code) && parentText.length > block.code.length) {
          return true;
        }
      }
      parent = parent.parentElement;
    }
    return false;
  }

  // Remove duplicate code blocks
  function removeDuplicates(blocks) {
    const seen = new Set();
    return blocks.filter(block => {
      const key = block.code.trim().substring(0, 200); // Use first 200 chars as key
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startScan') {
      const results = scanForCodeBlocks();
      sendResponse({ success: true, count: results.length });
    }
  });

  // Auto-scan when script loads (if page has likely code)
  setTimeout(() => {
    const potentialCodeElements = document.querySelectorAll('pre, code, .highlight, .language-');
    if (potentialCodeElements.length > 0 && potentialCodeElements.length < 20) {
      console.log('Auto-scanning page with potential code elements...');
      scanForCodeBlocks();
    }
  }, 1500);
}