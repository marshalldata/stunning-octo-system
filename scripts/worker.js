// scripts/worker.js - Web Worker for CodeGrab Pro
console.log('CodeGrab Pro Web Worker loaded');

// Web Worker for heavy code scanning operations
// This keeps the main thread responsive during large page scans

// Worker configuration
const WORKER_CONFIG = {
  maxProcessingTime: 10000, // 10 seconds max
  batchSize: 50, // Process elements in batches
  delayBetweenBatches: 10 // 10ms delay between batches
};

// Language detection patterns (optimized for worker)
const LANGUAGE_PATTERNS = {
  javascript: [
    /\bfunction\s+\w+\s*\(/,
    /\bconst\s+\w+\s*=/,
    /\blet\s+\w+\s*=/,
    /\bvar\s+\w+\s*=/,
    /=>\s*{/,
    /console\.log/,
    /document\./,
    /window\./,
    /require\s*\(/,
    /import\s+.*from/
  ],
  typescript: [
    /\binterface\s+\w+/,
    /\btype\s+\w+\s*=/,
    /\benum\s+\w+/,
    /:\s*\w+(\[\])?(?=\s*[=;,)])/,
    /\bpublic\s+\w+/,
    /\bprivate\s+\w+/
  ],
  python: [
    /\bdef\s+\w+\s*\(/,
    /\bclass\s+\w+/,
    /\bimport\s+\w+/,
    /\bfrom\s+\w+\s+import/,
    /\bprint\s*\(/,
    /\bif\s+__name__\s*==\s*['"]__main__['"]:/,
    /__init__/,
    /\bself\./
  ],
  java: [
    /\bpublic\s+class\s+\w+/,
    /\bpublic\s+static\s+void\s+main/,
    /System\.out\.println/,
    /\bprivate\s+\w+/,
    /\bpublic\s+\w+/,
    /\bprotected\s+\w+/,
    /\bextends\s+\w+/,
    /\bimplements\s+\w+/
  ],
  css: [
    /{[^}]*}/,
    /@media/,
    /\.\w+\s*{/,
    /#\w+\s*{/,
    /:\s*[\w-]+;/,
    /@import/,
    /@keyframes/,
    /\[[\w-]+\]/
  ],
  html: [
    /<html/i,
    /<head/i,
    /<body/i,
    /<div/i,
    /<script/i,
    /<style/i,
    /<!DOCTYPE/i,
    /<meta/i
  ],
  php: [
    /<\?php/,
    /\becho\s+/,
    /\$\w+/,
    /\bfunction\s+\w+/,
    /->\w+/,
    /\bclass\s+\w+/,
    /\bpublic\s+function/,
    /\brequire(_once)?\s*\(/
  ],
  sql: [
    /\bSELECT\s+/i,
    /\bFROM\s+/i,
    /\bWHERE\s+/i,
    /\bINSERT\s+INTO/i,
    /\bCREATE\s+TABLE/i,
    /\bUPDATE\s+\w+\s+SET/i,
    /\bDELETE\s+FROM/i,
    /\bJOIN\s+/i
  ],
  json: [
    /^\s*{[\s\S]*}\s*$/,
    /^\s*\[[\s\S]*\]\s*$/,
    /"\w+"\s*:/,
    /:\s*"[^"]*"/,
    /:\s*\d+/,
    /:\s*(true|false|null)\b/
  ],
  xml: [
    /<\?xml/i,
    /<\w+[^>]*>/,
    /<\/\w+>/,
    /xmlns=/,
    /<!\[CDATA\[/
  ],
  cpp: [
    /#include/,
    /\bstd::/,
    /\bcout\s*<</,
    /\bint\s+main/,
    /\bclass\s+\w+/,
    /\bnamespace\s+\w+/,
    /\bpublic:/,
    /\bprivate:/
  ],
  c: [
    /#include/,
    /\bprintf\s*\(/,
    /\bint\s+main/,
    /\bstruct\s+\w+/,
    /\btypedef\s+/,
    /\bmalloc\s*\(/,
    /\bfree\s*\(/
  ]
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
  sql: 'sql',
  json: 'json',
  xml: 'xml',
  plaintext: 'txt'
};

// Message handler
self.addEventListener('message', async function(e) {
  const { action, data, id } = e.data;
  
  try {
    switch (action) {
      case 'processElements':
        await processElements(data, id);
        break;
        
      case 'detectLanguage':
        const language = detectLanguage(data.code, data.className);
        postMessage({
          action: 'languageDetected',
          id: id,
          result: language
        });
        break;
        
      case 'analyzeComplexity':
        const analysis = analyzeCodeComplexity(data.code, data.language);
        postMessage({
          action: 'complexityAnalyzed',
          id: id,
          result: analysis
        });
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    postMessage({
      action: 'error',
      id: id,
      error: error.message
    });
  }
});

// Process elements in batches to avoid blocking
async function processElements(elements, requestId) {
  const results = [];
  const startTime = Date.now();
  
  postMessage({
    action: 'progress',
    id: requestId,
    progress: {
      current: 0,
      total: elements.length,
      status: 'Processing elements...'
    }
  });
  
  // Process in batches
  for (let i = 0; i < elements.length; i += WORKER_CONFIG.batchSize) {
    // Check if we've exceeded max processing time
    if (Date.now() - startTime > WORKER_CONFIG.maxProcessingTime) {
      postMessage({
        action: 'warning',
        id: requestId,
        message: 'Processing stopped due to time limit'
      });
      break;
    }
    
    const batch = elements.slice(i, i + WORKER_CONFIG.batchSize);
    const batchResults = [];
    
    for (const element of batch) {
      const processed = processCodeElement(element);
      if (processed) {
        batchResults.push(processed);
      }
    }
    
    results.push(...batchResults);
    
    // Send progress update
    postMessage({
      action: 'progress',
      id: requestId,
      progress: {
        current: Math.min(i + WORKER_CONFIG.batchSize, elements.length),
        total: elements.length,
        status: `Processed ${Math.min(i + WORKER_CONFIG.batchSize, elements.length)} of ${elements.length} elements`
      }
    });
    
    // Small delay to prevent blocking
    if (i + WORKER_CONFIG.batchSize < elements.length) {
      await sleep(WORKER_CONFIG.delayBetweenBatches);
    }
  }
  
  // Remove duplicates
  const uniqueResults = removeDuplicates(results);
  
  postMessage({
    action: 'processingComplete',
    id: requestId,
    result: uniqueResults
  });
}

// Process a single code element
function processCodeElement(element) {
  const { tagName, textContent, className, innerHTML } = element;
  
  // Skip if content is too short
  if (!textContent || textContent.trim().length < 10) {
    return null;
  }
  
  // Clean text content
  const code = cleanCodeText(textContent);
  if (!code || code.length < 10) {
    return null;
  }
  
  // Detect language
  const language = detectLanguage(code, className);
  
  // Generate context and filename
  const context = generateContext(element);
  const filename = generateFilename(context, language);
  
  return {
    id: generateUniqueId(),
    code: code,
    language: language,
    lines: code.split('\n').length,
    size: new Blob([code]).size,
    context: context,
    filename: filename,
    element: tagName.toLowerCase(),
    classes: className || '',
    timestamp: new Date().toISOString()
  };
}

// Clean code text by removing common artifacts
function cleanCodeText(text) {
  return text
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Normalize line endings
    .trim();
}

// Detect programming language using patterns
function detectLanguage(code, className = '') {
  // First check class names for explicit language hints
  const classLower = className.toLowerCase();
  
  for (const lang of Object.keys(LANGUAGE_PATTERNS)) {
    if (classLower.includes(lang) || 
        classLower.includes(`language-${lang}`) || 
        classLower.includes(`lang-${lang}`) ||
        classLower.includes(`highlight-${lang}`)) {
      return lang;
    }
  }
  
  // Pattern-based detection
  const scores = {};
  
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    let matches = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(code)) {
        matches++;
      }
    }
    
    // Calculate score based on matches
    if (matches > 0) {
      scores[lang] = matches / patterns.length;
    }
  }
  
  // Find the language with the highest score
  let bestLang = 'plaintext';
  let bestScore = 0;
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  
  // Only return if confidence is high enough
  return bestScore > 0.3 ? bestLang : 'plaintext';
}

// Generate context for the code block
function generateContext(element) {
  const { contextHint, parentContext } = element;
  
  // Use provided context hint if available
  if (contextHint) {
    return contextHint.substring(0, 50);
  }
  
  // Use parent context if available
  if (parentContext) {
    return parentContext.substring(0, 50);
  }
  
  // Generate generic context
  return `Code block from ${element.tagName.toLowerCase()}`;
}

// Generate filename for the code block
function generateFilename(context, language) {
  const sanitized = sanitizeFilename(context);
  const ext = EXTENSIONS[language] || 'txt';
  
  return `${sanitized || 'code-block'}.${ext}`;
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

// Remove duplicate code blocks
function removeDuplicates(blocks) {
  const seen = new Set();
  return blocks.filter(block => {
    const key = block.code.trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Analyze code complexity
function analyzeCodeComplexity(code, language) {
  const analysis = {
    complexity: calculateCyclomaticComplexity(code),
    linesOfCode: code.split('\n').length,
    dependencies: extractDependencies(code, language),
    codeSmells: detectCodeSmells(code, language),
    maintainabilityIndex: calculateMaintainabilityIndex(code)
  };
  
  return analysis;
}

// Calculate cyclomatic complexity
function calculateCyclomaticComplexity(code) {
  const complexityPatterns = [
    /\bif\b/g,
    /\belse\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bswitch\b/g,
    /\bcase\b/g,
    /\btry\b/g,
    /\bcatch\b/g,
    /&&/g,
    /\|\|/g,
    /\?\s*:/g
  ];
  
  let complexity = 1; // Base complexity
  
  for (const pattern of complexityPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return {
    value: complexity,
    level: complexity <= 5 ? 'low' : complexity <= 15 ? 'medium' : 'high'
  };
}

// Extract dependencies based on language
function extractDependencies(code, language) {
  const dependencies = [];
  
  switch (language) {
    case 'javascript':
    case 'typescript':
      // ES6 imports
      const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const dep = match.match(/from\s+['"]([^'"]+)['"]/);
          if (dep) dependencies.push(dep[1]);
        });
      }
      
      // CommonJS requires
      const requireMatches = code.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      if (requireMatches) {
        requireMatches.forEach(match => {
          const dep = match.match(/['"]([^'"]+)['"]/);
          if (dep) dependencies.push(dep[1]);
        });
      }
      break;
      
    case 'python':
      const pythonImports = code.match(/^(?:from\s+(\S+)\s+import|import\s+(\S+))/gm);
      if (pythonImports) {
        pythonImports.forEach(match => {
          const parts = match.split(/\s+/);
          if (parts[0] === 'from') {
            dependencies.push(parts[1]);
          } else if (parts[0] === 'import') {
            dependencies.push(parts[1].split('.')[0]);
          }
        });
      }
      break;
  }
  
  return [...new Set(dependencies)]; // Remove duplicates
}

// Detect code smells
function detectCodeSmells(code, language) {
  const smells = [];
  
  // Long method/function
  const lines = code.split('\n').length;
  if (lines > 50) {
    smells.push({
      type: 'Long Method',
      severity: 'medium',
      description: `Method has ${lines} lines, consider breaking it down`
    });
  }
  
  // Deep nesting
  const maxIndentation = Math.max(...code.split('\n').map(line => 
    (line.match(/^(\s*)/)[1].length / 2) || 0
  ));
  
  if (maxIndentation > 4) {
    smells.push({
      type: 'Deep Nesting',
      severity: 'high',
      description: `Code is nested ${maxIndentation} levels deep`
    });
  }
  
  // Language-specific smells
  if (language === 'javascript') {
    if (code.includes('var ')) {
      smells.push({
        type: 'Use of var',
        severity: 'low',
        description: 'Consider using let or const instead of var'
      });
    }
    
    if (code.includes('==') && !code.includes('===')) {
      smells.push({
        type: 'Loose Equality',
        severity: 'medium',
        description: 'Use strict equality (===) instead of loose equality (==)'
      });
    }
  }
  
  return smells;
}

// Calculate maintainability index (simplified)
function calculateMaintainabilityIndex(code) {
  const lines = code.split('\n').length;
  const complexity = calculateCyclomaticComplexity(code).value;
  
  // Simplified maintainability index calculation
  let index = 171 - 5.2 * Math.log(lines) - 0.23 * complexity;
  
  // Normalize to 0-100 scale
  index = Math.max(0, Math.min(100, index));
  
  return {
    value: Math.round(index),
    level: index >= 85 ? 'high' : index >= 65 ? 'medium' : 'low'
  };
}

// Generate unique ID
function generateUniqueId() {
  return 'cg-' + Math.random().toString(36).substr(2, 9);
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}