// scripts/utils.js - CodeGrab Pro Utility Functions

// Language to file extension mapping
const LANG_MAP = {
  'bash': { ext: 'sh' },
  'c': { ext: 'c' },
  'cpp': { ext: 'cpp' },
  'csharp': { ext: 'cs' },
  'css': { ext: 'css' },
  'diff': { ext: 'diff' },
  'go': { ext: 'go' },
  'graphql': { ext: 'graphql' },
  'html': { ext: 'html' },
  'xml': { ext: 'xml' },
  'java': { ext: 'java' },
  'javascript': { ext: 'js' },
  'json': { ext: 'json' },
  'kotlin': { ext: 'kt' },
  'lua': { ext: 'lua' },
  'makefile': { ext: 'mk' },
  'markdown': { ext: 'md' },
  'objectivec': { ext: 'm' },
  'perl': { ext: 'pl' },
  'php': { ext: 'php' },
  'python': { ext: 'py' },
  'r': { ext: 'r' },
  'ruby': { ext: 'rb' },
  'rust': { ext: 'rs' },
  'scss': { ext: 'scss' },
  'sql': { ext: 'sql' },
  'swift': { ext: 'swift' },
  'typescript': { ext: 'ts' },
  'vbnet': { ext: 'vb' },
  'yaml': { ext: 'yaml' },
  'plaintext': { ext: 'txt' }
};

// Language aliases
LANG_MAP['sh'] = LANG_MAP['bash'];
LANG_MAP['c++'] = LANG_MAP['cpp'];
LANG_MAP['cs'] = LANG_MAP['csharp'];
LANG_MAP['js'] = LANG_MAP['javascript'];
LANG_MAP['py'] = LANG_MAP['python'];
LANG_MAP['rb'] = LANG_MAP['ruby'];
LANG_MAP['ts'] = LANG_MAP['typescript'];
LANG_MAP['yml'] = LANG_MAP['yaml'];
LANG_MAP['md'] = LANG_MAP['markdown'];
LANG_MAP['txt'] = LANG_MAP['plaintext'];

/**
 * Sanitizes a filename by removing invalid characters and formatting
 * @param {string} name - The filename to sanitize
 * @returns {string} - The sanitized filename
 */
function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }

  return name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '') // Remove invalid characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-_.]/g, '') // Keep only word chars, hyphens, underscores, dots
    .toLowerCase()
    .substring(0, 100); // Limit length
}

/**
 * Generates a filename based on context and language
 * @param {string} context - The context or title
 * @param {string} language - The programming language
 * @returns {string} - The generated filename
 */
function generateFilename(context, language) {
  const sanitizedContext = sanitizeFilename(context);
  const ext = LANG_MAP[language]?.ext || 'txt';
  
  const baseName = sanitizedContext || 'code-block';
  return `${baseName}.${ext}`;
}

/**
 * Generates a unique filename to avoid collisions
 * @param {string} filename - The desired filename
 * @param {Set} usedNames - Set of already used filenames
 * @returns {string} - A unique filename
 */
function generateUniqueFilename(filename, usedNames) {
  if (!usedNames.has(filename)) {
    return filename;
  }

  const parts = filename.split('.');
  const ext = parts.pop();
  const base = parts.join('.');
  
  let counter = 1;
  let newName;
  
  do {
    newName = `${base}-${counter}.${ext}`;
    counter++;
  } while (usedNames.has(newName));
  
  return newName;
}

/**
 * Formats file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets MIME type for a programming language
 * @param {string} language - The programming language
 * @returns {string} - The MIME type
 */
function getMimeType(language) {
  const mimeTypes = {
    'javascript': 'text/javascript',
    'typescript': 'text/typescript',
    'python': 'text/x-python',
    'java': 'text/x-java',
    'cpp': 'text/x-c++src',
    'c': 'text/x-c',
    'csharp': 'text/x-csharp',
    'php': 'application/x-httpd-php',
    'ruby': 'text/x-ruby',
    'go': 'text/x-go',
    'rust': 'text/x-rust',
    'swift': 'text/x-swift',
    'kotlin': 'text/x-kotlin',
    'html': 'text/html',
    'css': 'text/css',
    'scss': 'text/x-scss',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'text/x-yaml',
    'sql': 'text/x-sql',
    'markdown': 'text/markdown',
    'bash': 'text/x-sh',
    'plaintext': 'text/plain'
  };
  
  return mimeTypes[language] || 'text/plain';
}

/**
 * Escapes HTML characters in a string
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Unescapes HTML characters in a string
 * @param {string} html - The HTML to unescape
 * @returns {string} - The unescaped text
 */
function unescapeHtml(html) {
  if (typeof html !== 'string') return '';
  
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function call
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clones an object
 * @param {any} obj - The object to clone
 * @returns {any} - The cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Checks if a string is a valid URL
 * @param {string} string - The string to check
 * @returns {boolean} - Whether the string is a valid URL
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Extracts domain from URL
 * @param {string} url - The URL
 * @returns {string} - The domain
 */
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return 'unknown';
  }
}

/**
 * Generates a random ID
 * @param {number} length - The length of the ID
 * @returns {string} - The random ID
 */
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Formats a timestamp to human readable format
 * @param {number|string|Date} timestamp - The timestamp
 * @returns {string} - The formatted time
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than a minute ago
  if (diff < 60000) {
    return 'just now';
  }
  
  // Less than an hour ago
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than a day ago
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // More than a day ago
  return date.toLocaleDateString();
}

/**
 * Truncates text to specified length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} - The truncated text
 */
function truncateText(text, maxLength = 100, suffix = '...') {
  if (typeof text !== 'string' || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The capitalized string
 */
function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }
  
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts string to title case
 * @param {string} str - The string to convert
 * @returns {string} - The title case string
 */
function toTitleCase(str) {
  if (typeof str !== 'string') return str;
  
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Removes duplicates from an array based on a key function
 * @param {Array} array - The array to deduplicate
 * @param {Function} keyFn - Function to extract the key
 * @returns {Array} - The deduplicated array
 */
function uniqueBy(array, keyFn) {
  const seen = new Set();
  
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Groups array elements by a key function
 * @param {Array} array - The array to group
 * @param {Function} keyFn - Function to extract the grouping key
 * @returns {Object} - The grouped object
 */
function groupBy(array, keyFn) {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Sorts array by multiple criteria
 * @param {Array} array - The array to sort
 * @param {Array} sortBy - Array of {key, direction} objects
 * @returns {Array} - The sorted array
 */
function multiSort(array, sortBy) {
  return array.sort((a, b) => {
    for (const { key, direction = 'asc' } of sortBy) {
      const aVal = typeof key === 'function' ? key(a) : a[key];
      const bVal = typeof key === 'function' ? key(b) : b[key];
      
      if (aVal < bVal) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });
}

// Export utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LANG_MAP,
    sanitizeFilename,
    generateFilename,
    generateUniqueFilename,
    formatFileSize,
    getMimeType,
    escapeHtml,
    unescapeHtml,
    debounce,
    throttle,
    deepClone,
    isValidUrl,
    getDomainFromUrl,
    generateId,
    formatTimestamp,
    truncateText,
    capitalize,
    toTitleCase,
    uniqueBy,
    groupBy,
    multiSort
  };
}