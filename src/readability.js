/**
 * Lightweight Readability-like Text Extraction
 * Identifies and extracts main content from web pages
 */

/**
 * CSS selectors for content that should be removed
 */
const NEGATIVE_SELECTORS = [
  'nav', 'footer', 'header', 'aside', 'sidebar',
  '[class*="nav"]', '[class*="menu"]', '[class*="header"]', '[class*="footer"]',
  '[class*="sidebar"]', '[class*="aside"]', '[class*="ad"]', '[class*="advertisement"]',
  '[class*="social"]', '[class*="share"]', '[class*="comment"]', '[class*="promo"]',
  '[class*="related"]', '[class*="recommend"]', '[id*="nav"]', '[id*="menu"]',
  '[id*="header"]', '[id*="footer"]', '[id*="sidebar"]', '[id*="ad"]',
  'script', 'style', 'noscript', 'iframe'
];

/**
 * CSS selectors for content that should be boosted
 */
const POSITIVE_SELECTORS = [
  'article', 'main', '[role="main"]', '.content', '.article', '.post',
  '.entry', '.story', '.text', '.body', '[class*="content"]',
  '[class*="article"]', '[class*="post"]', '[class*="entry"]'
];

/**
 * Tags that should preserve structure
 */
const STRUCTURAL_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'section', 'article',
  'ul', 'ol', 'li', 'blockquote',
  'pre', 'code'
]);

/**
 * Calculate text density score for an element
 */
function getTextDensity(element) {
  const text = element.textContent || '';
  const html = element.innerHTML || '';
  
  if (html.length === 0) return 0;
  
  // Higher score = more text relative to HTML
  return text.length / html.length;
}

/**
 * Score an element based on readability heuristics
 */
function scoreElement(element) {
  let score = 0;
  const text = element.textContent || '';
  const tagName = element.tagName.toLowerCase();
  const className = element.className || '';
  const id = element.id || '';
  
  // Base score from text length
  score += Math.min(text.length / 100, 10);
  
  // Boost for content-likely selectors
  POSITIVE_SELECTORS.forEach(selector => {
    try {
      if (element.matches(selector)) {
        score += 5;
      }
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  // Penalty for negative selectors
  NEGATIVE_SELECTORS.forEach(selector => {
    try {
      if (element.matches(selector)) {
        score -= 10;
      }
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  // Boost for paragraph tags
  if (tagName === 'p') {
    score += 2;
  }
  
  // Boost for article-like tags
  if (['article', 'section', 'main'].includes(tagName)) {
    score += 3;
  }
  
  // Text density bonus
  score += getTextDensity(element) * 2;
  
  // Penalty for very short text
  if (text.length < 50) {
    score -= 2;
  }
  
  return Math.max(0, score);
}

/**
 * Extract and clean text content while preserving structure
 */
function extractStructuredText(element, level = 0) {
  let result = '';
  const tagName = element.tagName.toLowerCase();
  const text = element.textContent || '';
  
  // Skip if no meaningful text
  if (text.trim().length < 10) {
    return result;
  }
  
  // Handle different tag types
  if (tagName.match(/^h[1-6]$/)) {
    // Headings with level indicators
    const headingLevel = parseInt(tagName.charAt(1));
    result += '\n' + '#'.repeat(headingLevel) + ' ' + text.trim() + '\n\n';
  } else if (tagName === 'p') {
    // Paragraphs
    result += text.trim() + '\n\n';
  } else if (tagName === 'blockquote') {
    // Block quotes
    result += '> ' + text.trim().replace(/\n/g, '\n> ') + '\n\n';
  } else if (tagName === 'ul' || tagName === 'ol') {
    // Lists - process children
    let listItems = '';
    const items = element.querySelectorAll('li');
    items.forEach((li, index) => {
      const marker = tagName === 'ul' ? '- ' : `${index + 1}. `;
      listItems += marker + (li.textContent || '').trim() + '\n';
    });
    if (listItems) {
      result += listItems + '\n';
    }
  } else if (tagName === 'pre' || tagName === 'code') {
    // Code blocks
    result += '```\n' + text.trim() + '\n```\n\n';
  } else if (STRUCTURAL_TAGS.has(tagName)) {
    // Other structural elements - just include text
    result += text.trim() + '\n\n';
  }
  
  return result;
}

/**
 * Main function to extract readable content from a document
 */
function extractReadableContent(doc = document) {
  const startTime = performance.now();
  
  try {
    // Find all potential content elements
    const candidates = Array.from(doc.querySelectorAll('div, article, section, main, p'));
    
    if (candidates.length === 0) {
      return {
        text: doc.body ? doc.body.textContent || '' : '',
        metadata: {
          method: 'fallback',
          candidatesFound: 0,
          contentScore: 0
        }
      };
    }
    
    // Score all candidates
    const scoredCandidates = candidates
      .map(element => ({
        element,
        score: scoreElement(element),
        textLength: (element.textContent || '').length
      }))
      .filter(candidate => candidate.score > 0 && candidate.textLength > 50)
      .sort((a, b) => b.score - a.score);
    
    if (scoredCandidates.length === 0) {
      return {
        text: doc.body ? doc.body.textContent || '' : '',
        metadata: {
          method: 'fallback',
          candidatesFound: candidates.length,
          contentScore: 0
        }
      };
    }
    
    // Get the best candidate
    const bestCandidate = scoredCandidates[0];
    
    // Extract structured text
    let extractedText = '';
    
    // Process title if available
    if (doc.title) {
      extractedText += '# ' + doc.title.trim() + '\n\n';
    }
    
    // Process main content
    const contentElements = bestCandidate.element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, pre, code');
    
    if (contentElements.length > 0) {
      contentElements.forEach(element => {
        extractedText += extractStructuredText(element);
      });
    } else {
      // Fallback to simple text extraction
      extractedText += bestCandidate.element.textContent || '';
    }
    
    // Clean up extra whitespace
    extractedText = extractedText
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    const processingTime = performance.now() - startTime;
    
    return {
      text: extractedText,
      metadata: {
        method: 'readability',
        candidatesFound: candidates.length,
        contentScore: Math.round(bestCandidate.score * 10) / 10,
        processingTimeMs: Math.round(processingTime),
        textLength: extractedText.length,
        originalLength: doc.body ? (doc.body.textContent || '').length : 0
      }
    };
    
  } catch (error) {
    console.warn('Text extraction failed:', error);
    return {
      text: doc.body ? doc.body.textContent || '' : '',
      metadata: {
        method: 'error-fallback',
        error: error.message,
        candidatesFound: 0,
        contentScore: 0
      }
    };
  }
}

// Export for use in both Node.js and browser environments
if (typeof window !== 'undefined') {
  // Browser environment - attach to global scope
  window.extractReadableContent = extractReadableContent;
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = { extractReadableContent };
}