#!/usr/bin/env node

/**
 * Build script for Swerve bookmarklet
 * Creates a minified bookmarklet from src files
 */

const fs = require('fs');
const path = require('path');

// Simple minification (removes comments and excessive whitespace)
function minify(code) {
    return code
        // Remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around certain characters
        .replace(/\s*([{}();,=+\-*\/])\s*/g, '$1')
        .trim();
}

// Read bookmarklet source
const bookmarkletSource = fs.readFileSync(path.join(__dirname, 'bookmarklet.js'), 'utf8');

// Minify
const minified = minify(bookmarkletSource);

// Create bookmarklet URL
const bookmarkletUrl = `javascript:${encodeURIComponent(minified)}`;

// Write output files
fs.writeFileSync(path.join(__dirname, '../bookmarklet-minified.js'), minified);
fs.writeFileSync(path.join(__dirname, '../bookmarklet.txt'), bookmarkletUrl);

// Create installation HTML
const installationHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install Swerve Bookmarklet</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
        }
        .bookmarklet { 
            background: #007cba; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            font-weight: bold;
            display: inline-block;
            margin: 16px 0;
        }
        .privacy { 
            background: #e3f2fd; 
            padding: 16px; 
            border-radius: 8px;
            border-left: 4px solid #2196f3;
            margin: 20px 0;
        }
        .code { 
            background: #f5f5f5; 
            padding: 16px; 
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <h1>🌐 Swerve Bookmarklet</h1>
    <p>AI bookmarklet that ships entire pages to your brainy backend with built-in privacy protection.</p>
    
    <div class="privacy">
        <h3>🔒 Privacy Protection Built-In</h3>
        <p><strong>Your privacy is protected:</strong></p>
        <ul>
            <li>✅ Email addresses automatically redacted</li>
            <li>✅ Phone numbers automatically redacted</li>
            <li>✅ Social Security Numbers automatically redacted</li>
            <li>✅ Credit card numbers automatically redacted</li>
            <li>✅ All redaction happens client-side before transmission</li>
            <li>✅ Configurable exclude selectors for protected content</li>
        </ul>
    </div>

    <h2>Installation</h2>
    <p><strong>Step 1:</strong> Drag this bookmarklet to your bookmarks bar:</p>
    <a href="${bookmarkletUrl}" class="bookmarklet">📡 Swerve</a>
    
    <p><strong>Step 2:</strong> Configure your endpoint and privacy settings:</p>
    <a href="src/config.html">⚙️ Open Configuration</a>
    
    <h2>Usage</h2>
    <ol>
        <li>Navigate to any web page</li>
        <li>Click the Swerve bookmarklet in your bookmarks bar</li>
        <li>The page will be processed with privacy protection</li>
        <li>A preview shows what was redacted (if enabled)</li>
        <li>The processed data is sent to your configured endpoint</li>
    </ol>
    
    <h2>Technical Details</h2>
    <ul>
        <li>Bookmarklet size: ${Math.round(bookmarkletUrl.length / 1024 * 10) / 10} KB</li>
        <li>Processing performance: &lt;200ms typical</li>
        <li>Client-side privacy protection</li>
        <li>No server-side dependencies for redaction</li>
    </ul>
    
    <details>
        <summary>Show raw bookmarklet code</summary>
        <div class="code">${bookmarkletUrl}</div>
    </details>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '../install.html'), installationHtml);

console.log('✅ Build complete!');
console.log(`📏 Minified size: ${Math.round(minified.length / 1024 * 10) / 10} KB`);
console.log(`📏 Bookmarklet URL size: ${Math.round(bookmarkletUrl.length / 1024 * 10) / 10} KB`);
console.log('📄 Files created:');
console.log('   - bookmarklet-minified.js (minified source)');
console.log('   - bookmarklet.txt (bookmarklet URL)');
console.log('   - install.html (installation page)');