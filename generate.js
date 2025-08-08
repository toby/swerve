#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const SOURCE_FILE = path.join(__dirname, 'src', 'bookmarklet.js');
const OUTPUT_FILE = path.join(__dirname, 'build', 'bookmarklet.js');
const BOOKMARKLET_FILE = path.join(__dirname, 'build', 'bookmarklet.txt');

async function generateBookmarklet() {
  try {
    // Read configuration
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    console.log('Configuration loaded:', config);
    
    // Read source code
    const source = fs.readFileSync(SOURCE_FILE, 'utf8');
    
    // Validate configuration
    if (!config.endpoint) {
      throw new Error('Endpoint URL is required in config.json');
    }
    
    // Escape configuration values for safe injection
    const escapeString = (str) => {
      return str.replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/'/g, "\\'")
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n');
    };
    
    // Inject configuration values
    let processedSource = source
      .replace(/{{ENDPOINT}}/g, escapeString(config.endpoint))
      .replace(/{{AUTH_TOKEN}}/g, config.authToken ? escapeString(config.authToken) : '');
    
    // Minify the code
    const minified = await minify(processedSource, {
      compress: {
        drop_console: false, // Keep console.error for debugging
        drop_debugger: true,
        pure_funcs: [],
      },
      mangle: true,
      format: {
        comments: false,
      },
    });
    
    if (minified.error) {
      throw minified.error;
    }
    
    const minifiedCode = minified.code;
    
    // Create bookmarklet URL
    const bookmarkletUrl = 'javascript:' + encodeURIComponent(minifiedCode);
    
    // Check size
    const sizeBytes = Buffer.byteLength(bookmarkletUrl, 'utf8');
    const sizeKB = (sizeBytes / 1024).toFixed(2);
    
    console.log(`Minified size: ${sizeBytes} bytes (${sizeKB} KB)`);
    
    if (sizeBytes > 4096) {
      console.warn('⚠️  Warning: Bookmarklet size exceeds 4KB limit!');
    } else {
      console.log('✅ Bookmarklet size is within 4KB limit');
    }
    
    // Ensure build directory exists
    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    }
    
    // Write outputs
    fs.writeFileSync(OUTPUT_FILE, minifiedCode);
    fs.writeFileSync(BOOKMARKLET_FILE, bookmarkletUrl);
    
    console.log('\n📦 Generated files:');
    console.log(`   Minified JS: ${OUTPUT_FILE}`);
    console.log(`   Bookmarklet: ${BOOKMARKLET_FILE}`);
    console.log('\n🔗 Your bookmarklet URL:');
    console.log(bookmarkletUrl);
    console.log('\n📋 Instructions:');
    console.log('1. Copy the bookmarklet URL above');
    console.log('2. Create a new bookmark in your browser');
    console.log(`3. Set the name to "${config.name}"`);
    console.log('4. Paste the URL as the bookmark location');
    console.log('5. Save and click to use!');
    
    return {
      minifiedCode,
      bookmarkletUrl,
      sizeBytes,
      sizeKB
    };
    
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Swerve Bookmarklet Generator

Usage: node generate.js [options]

Options:
  --config <file>   Custom config file path (default: config.json)
  --endpoint <url>  Override endpoint URL
  --token <token>   Override auth token  
  --name <name>     Override bookmark name
  --help, -h        Show this help

Configuration:
  Edit config.json to set your default endpoint and auth token.

Example:
  node generate.js --endpoint https://my-service.com/api/ingest --token abc123
`);
    process.exit(0);
  }
  
  // Parse CLI arguments to override config
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--endpoint':
        config.endpoint = value;
        break;
      case '--token':
        config.authToken = value;
        break;
      case '--name':
        config.name = value;
        break;
      case '--config':
        // Re-read from custom config file
        Object.assign(config, JSON.parse(fs.readFileSync(value, 'utf8')));
        break;
    }
  }
  
  // Write back any CLI overrides
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  generateBookmarklet();
}

module.exports = { generateBookmarklet };