#!/usr/bin/env node

/**
 * Swerve Bookmarklet Builder
 * Combines the UI components with the bookmarklet code
 */

const fs = require('fs');
const path = require('path');

function minifyJs(code) {
  // Simple minification - remove comments and extra whitespace
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, ';}') // Remove space before closing brace
    .replace(/{\s*/g, '{') // Remove space after opening brace
    .replace(/}\s*/g, '}') // Remove space after closing brace
    .replace(/,\s*/g, ',') // Remove space after commas
    .trim();
}

function buildBookmarklet(options = {}) {
  const srcDir = path.join(__dirname, 'src');
  
  // Read component files
  const toastCode = fs.readFileSync(path.join(srcDir, 'toast.js'), 'utf8');
  const progressCode = fs.readFileSync(path.join(srcDir, 'progress.js'), 'utf8');
  const bookmarkletTemplate = fs.readFileSync(path.join(srcDir, 'bookmarklet.js'), 'utf8');
  
  // Remove module exports from components for inline use
  const cleanToastCode = toastCode.replace(/if \(typeof module.*?}\s*$/s, '');
  const cleanProgressCode = progressCode.replace(/if \(typeof module.*?}\s*$/s, '');
  
  // Replace placeholders in bookmarklet template
  let bookmarkletCode = bookmarkletTemplate
    .replace('%%TOAST_CODE%%', cleanToastCode)
    .replace('%%PROGRESS_CODE%%', cleanProgressCode);
  
  // Replace endpoint if provided
  if (options.endpoint) {
    bookmarkletCode = bookmarkletCode.replace(
      'const ENDPOINT = \'https://service.example.com/ingest\';',
      `const ENDPOINT = '${options.endpoint}';`
    );
  }
  
  // Minify if requested
  if (options.minify) {
    bookmarkletCode = minifyJs(bookmarkletCode);
  }
  
  // Create javascript: URL for bookmarklet
  const bookmarkletUrl = 'javascript:' + encodeURIComponent(bookmarkletCode);
  
  return {
    code: bookmarkletCode,
    url: bookmarkletUrl,
    size: bookmarkletCode.length,
    urlSize: bookmarkletUrl.length
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.split('=')[1];
    }
    if (arg === '--minify') {
      options.minify = true;
    }
  });
  
  const result = buildBookmarklet(options);
  
  console.log('Swerve Bookmarklet Build Results:');
  console.log('================================');
  console.log(`Code size: ${result.size} bytes`);
  console.log(`Bookmarklet URL size: ${result.urlSize} bytes`);
  console.log('');
  
  if (options.minify) {
    console.log('Minified Bookmarklet URL:');
    console.log(result.url);
  } else {
    console.log('Development Bookmarklet (formatted):');
    console.log('javascript:' + result.code);
    console.log('');
    console.log('Bookmarklet URL (for copying):');
    console.log(result.url);
  }
  
  // Write to files
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }
  
  fs.writeFileSync(
    path.join(distDir, 'bookmarklet.js'), 
    result.code
  );
  
  fs.writeFileSync(
    path.join(distDir, 'bookmarklet.txt'), 
    result.url
  );
  
  console.log('');
  console.log('Files written:');
  console.log('- dist/bookmarklet.js (readable code)');
  console.log('- dist/bookmarklet.txt (bookmarklet URL)');
}

module.exports = { buildBookmarklet, minifyJs };