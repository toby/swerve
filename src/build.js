#!/usr/bin/env node

/**
 * Simple build script for Swerve bookmarklet
 * Generates minified bookmarklet from source with configurable endpoint
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ENDPOINT_PLACEHOLDER = 'https://service.example.com/ingest';
const SOURCE_FILE = path.join(__dirname, 'bookmarklet.js');
const OUTPUT_FILE = path.join(__dirname, 'bookmarklet.min.js');

function minifyBookmarklet(source, endpoint = ENDPOINT_PLACEHOLDER) {
  // Basic minification - remove comments, extra whitespace, and format for bookmarklet
  let minified = source
    // Remove single-line comments (but be careful not to break string literals)
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace but preserve single spaces in critical places
    .replace(/\s+/g, ' ')
    // Be more careful with operators - keep spaces around some
    .replace(/\s*([{}();,=])\s*/g, '$1')
    // Trim
    .trim();

  // Replace endpoint placeholder if provided
  if (endpoint !== ENDPOINT_PLACEHOLDER) {
    minified = minified.replace(ENDPOINT_PLACEHOLDER, endpoint);
  }

  // Wrap in javascript: protocol for bookmarklet
  return `javascript:${minified}`;
}

function generateBookmarklet(endpoint) {
  try {
    console.log('🔧 Building Swerve bookmarklet...');
    
    // Read source file
    const source = fs.readFileSync(SOURCE_FILE, 'utf8');
    console.log(`📖 Read source file: ${SOURCE_FILE}`);
    
    // Generate minified version
    const minified = minifyBookmarklet(source, endpoint);
    console.log(`✨ Minified bookmarklet (${minified.length} characters)`);
    
    // Generate output
    const output = `/**
 * Swerve Bookmarklet - Generated Build
 * Built: ${new Date().toISOString()}
 * Endpoint: ${endpoint || ENDPOINT_PLACEHOLDER}
 * Size: ${minified.length} characters
 */

// Copy this bookmarklet to your bookmark:
${minified}

// For reference, here's the readable version:
${source.replace(/^/gm, '// ')}
`;

    // Write output file
    fs.writeFileSync(OUTPUT_FILE, output);
    console.log(`💾 Generated bookmarklet: ${OUTPUT_FILE}`);
    
    // Display results
    console.log('\n📋 Copy this bookmarklet to your bookmark:');
    console.log('─'.repeat(80));
    console.log(minified);
    console.log('─'.repeat(80));
    
    if (endpoint && endpoint !== ENDPOINT_PLACEHOLDER) {
      console.log(`🎯 Configured for endpoint: ${endpoint}`);
    } else {
      console.log(`⚠️  Remember to replace "${ENDPOINT_PLACEHOLDER}" with your actual endpoint!`);
    }
    
    console.log('\n✅ Build complete!');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const endpoint = args[0];
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Swerve Bookmarklet Builder

Usage:
  node build.js [endpoint_url]
  
Examples:
  node build.js                                    # Use placeholder endpoint
  node build.js https://myapi.com/ingest          # Use custom endpoint
  
Options:
  --help, -h    Show this help message
`);
    process.exit(0);
  }
  
  generateBookmarklet(endpoint);
}

module.exports = { minifyBookmarklet, generateBookmarklet };