#!/usr/bin/env node

/**
 * Manual test for chunking functionality
 * This tests the core chunking logic without needing a browser
 */

const path = require('path');
const fs = require('fs');

// Simulate the chunking logic from bookmarklet
function splitIntoChunks(content, chunkSize) {
  const chunks = [];
  let offset = 0;
  while (offset < content.length) {
    const chunk = content.slice(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }
  return chunks;
}

function generateLargeContent() {
  // Generate content that will be > 1MB
  let content = '<html><head><title>Large Test Page</title></head><body>';
  
  // Add large content blocks
  for (let i = 0; i < 1000; i++) {
    content += `<div class="section-${i}">
      <h2>Section ${i}</h2>
      <p>${'This is test content for chunking. '.repeat(200)}</p>
      <ul>`;
    
    for (let j = 0; j < 50; j++) {
      content += `<li>Item ${j}: ${'More test content to make this large. '.repeat(10)}</li>`;
    }
    
    content += '</ul></div>';
  }
  
  content += '</body></html>';
  return content;
}

function testChunking() {
  console.log('🧪 Testing chunking functionality...\n');
  
  // Generate large content
  const content = generateLargeContent();
  const contentSize = Buffer.byteLength(content, 'utf8');
  
  console.log(`📄 Generated content: ${Math.round(contentSize / 1024)}KB`);
  
  // Test chunking
  const chunkSize = 256 * 1024; // 256KB
  const chunks = splitIntoChunks(content, chunkSize);
  
  console.log(`🔪 Split into ${chunks.length} chunks`);
  
  // Verify chunks
  let totalReassembledSize = 0;
  chunks.forEach((chunk, index) => {
    const chunkSizeKB = Math.round(Buffer.byteLength(chunk, 'utf8') / 1024);
    console.log(`   Chunk ${index + 1}/${chunks.length}: ${chunkSizeKB}KB`);
    totalReassembledSize += Buffer.byteLength(chunk, 'utf8');
  });
  
  // Reassemble and verify
  const reassembled = chunks.join('');
  const reassembledSize = Buffer.byteLength(reassembled, 'utf8');
  
  console.log(`\n🔧 Reassembled content: ${Math.round(reassembledSize / 1024)}KB`);
  console.log(`✅ Size match: ${contentSize === reassembledSize ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Content match: ${content === reassembled ? 'PASS' : 'FAIL'}`);
  
  // Test thresholds
  const threshold = 1024 * 1024; // 1MB
  console.log(`\n📏 Size threshold test:`);
  console.log(`   Content size: ${Math.round(contentSize / 1024)}KB`);
  console.log(`   Threshold: ${Math.round(threshold / 1024)}KB`);
  console.log(`   Should chunk: ${contentSize > threshold ? 'YES' : 'NO'}`);
  console.log(`   Did chunk: ${chunks.length > 1 ? 'YES' : 'NO'}`);
  console.log(`   Threshold test: ${(contentSize > threshold) === (chunks.length > 1) ? 'PASS' : 'FAIL'}`);
  
  // Test chunk sizes
  console.log(`\n📦 Chunk size validation:`);
  let allChunksValid = true;
  chunks.forEach((chunk, index) => {
    const chunkBytes = Buffer.byteLength(chunk, 'utf8');
    const isLastChunk = index === chunks.length - 1;
    const isValidSize = isLastChunk || chunkBytes <= chunkSize;
    
    if (!isValidSize) {
      console.log(`   ❌ Chunk ${index + 1} oversized: ${Math.round(chunkBytes / 1024)}KB > ${Math.round(chunkSize / 1024)}KB`);
      allChunksValid = false;
    }
  });
  
  if (allChunksValid) {
    console.log(`   ✅ All chunks within size limits`);
  }
  
  console.log(`\n🎯 Overall test result: ${contentSize === reassembledSize && content === reassembled && allChunksValid ? '✅ PASS' : '❌ FAIL'}`);
}

// Run test
if (require.main === module) {
  testChunking();
}