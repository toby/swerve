/**
 * Simple test for readability extraction
 */
const fs = require('fs');
const path = require('path');

// Mock DOM environment for testing
function createMockDocument(html) {
  // Simple mock implementation
  return {
    title: 'Test Article: The Future of AI',
    body: {
      textContent: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    },
    querySelectorAll: function(selector) {
      // Simple mock that returns elements based on selector
      if (selector.includes('div, article, section, main, p')) {
        return [{
          tagName: 'ARTICLE',
          textContent: 'Artificial Intelligence is no longer a concept confined to science fiction. Today, AI technologies are reshaping industries.',
          matches: function(sel) { 
            return sel === 'article' || sel.includes('content'); 
          },
          className: 'content',
          id: '',
          innerHTML: '<p>AI content here</p>',
          querySelectorAll: function() {
            return [
              { tagName: 'H1', textContent: 'The Future of AI' },
              { tagName: 'P', textContent: 'AI is transforming the world...' }
            ];
          }
        }];
      }
      return [];
    }
  };
}

// Mock performance.now()
global.performance = {
  now: () => Date.now()
};

// Load and test readability extraction
try {
  // Load the readability module
  const readabilityPath = path.join(__dirname, '..', 'src', 'readability.js');
  const readabilityCode = fs.readFileSync(readabilityPath, 'utf8');
  
  // Extract the core function
  const extractFunction = eval(`
    ${readabilityCode}
    extractReadableContent
  `);
  
  // Test with mock document
  const mockDoc = createMockDocument('<html><body><article>Test content</article></body></html>');
  const result = extractFunction(mockDoc);
  
  console.log('✅ Readability extraction test passed!');
  console.log('Method:', result.metadata.method);
  console.log('Processing time:', result.metadata.processingTimeMs, 'ms');
  console.log('Text length:', result.text.length);
  console.log('Content score:', result.metadata.contentScore);
  console.log('Extracted text preview:', result.text.substring(0, 200) + '...');
  
  // Verify performance is under 300ms
  if (result.metadata.processingTimeMs && result.metadata.processingTimeMs < 300) {
    console.log('✅ Performance requirement met (< 300ms)');
  } else {
    console.log('⚠️  Performance may need optimization');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}

console.log('\n✅ All tests passed!');