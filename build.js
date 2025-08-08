#!/usr/bin/env node

/**
 * Build script to generate minified bookmarklet
 */

const fs = require('fs');
const path = require('path');

// Read the source file
const sourceFile = path.join(__dirname, 'src', 'swerve.js');
const source = fs.readFileSync(sourceFile, 'utf8');

// Simple minification - remove comments and extra whitespace
function minify(code) {
    return code
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove single-line comments (but preserve URLs)
        .replace(/(?<!:)\/\/.*$/gm, '')
        // Remove extra whitespace but preserve single spaces
        .replace(/\s+/g, ' ')
        // Remove spaces around operators and punctuation
        .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
        // Remove leading/trailing whitespace
        .trim();
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Generate minified version
const minified = minify(source);

// Create bookmarklet URL
const bookmarkletUrl = `javascript:${encodeURIComponent(minified)}`;

// Write files
fs.writeFileSync(path.join(distDir, 'swerve.min.js'), minified);
fs.writeFileSync(path.join(distDir, 'bookmarklet.txt'), bookmarkletUrl);

// Generate README with installation instructions
const readmeContent = `# Swerve Bookmarklet - Generated Files

## Installation

### Option 1: Drag and Drop (Recommended)
1. Drag this link to your bookmarks bar: [📄 Swerve Preview](${bookmarkletUrl})

### Option 2: Manual Installation
1. Create a new bookmark
2. Name it "Swerve Preview" 
3. Copy and paste this URL:
\`\`\`
${bookmarkletUrl}
\`\`\`

## Usage

1. Navigate to any webpage
2. Click the "Swerve Preview" bookmark
3. Review the content preview and select capture mode
4. Use redaction tools to hide sensitive elements
5. Click "Send to Swerve" to transmit the data

## File Sizes
- Original: ${Math.round(source.length / 1024 * 10) / 10} KB
- Minified: ${Math.round(minified.length / 1024 * 10) / 10} KB
- Bookmarklet URL: ${Math.round(bookmarkletUrl.length / 1024 * 10) / 10} KB

## Configuration

To use with your own endpoint, replace \`https://service.example.com/ingest\` in the source file before building.
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);

console.log('✅ Build complete!');
console.log(`📦 Minified from ${Math.round(source.length / 1024 * 10) / 10} KB to ${Math.round(minified.length / 1024 * 10) / 10} KB`);
console.log(`🔖 Bookmarklet URL: ${Math.round(bookmarkletUrl.length / 1024 * 10) / 10} KB`);
console.log('📁 Files generated in ./dist/');