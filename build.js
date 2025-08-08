#!/usr/bin/env node

/**
 * Build script for Swerve bookmarklet
 * Combines source files into a single minified bookmarklet
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, 'src');
const BUILD_DIR = path.join(__dirname, 'dist');
const FILES = [
    'allowlist.js',
    'config-ui.js', 
    'swerve.js'
];

// Ensure build directory exists
if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

// Read and combine source files
let combinedSource = '';

FILES.forEach(filename => {
    const filepath = path.join(SRC_DIR, filename);
    if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        combinedSource += content + '\n';
    } else {
        console.warn(`Warning: ${filename} not found`);
    }
});

// Add the bookmarklet wrapper and entry point
const bookmarkletWrapper = `
(async function() {
    // Detect if Shift key was pressed when bookmarklet was activated
    window.swerveConfigMode = window.event && window.event.shiftKey;
    
    ${combinedSource}
    
    // Expose functions for testing
    if (typeof window !== 'undefined') {
        window.SwerveAllowlist = SwerveAllowlist;
        window.SwerveConfigUI = SwerveConfigUI;
        window.showToast = showToast;
        window.swerveMain = swerveMain;
    }
    
    // Run the main function only if called as a bookmarklet
    if (window.location.protocol === 'javascript:') {
        await swerveMain();
    }
})();
`;

// Write the combined bookmarklet
const bookmarkletFile = path.join(BUILD_DIR, 'swerve-bookmarklet.js');
fs.writeFileSync(bookmarkletFile, bookmarkletWrapper);

// Create URL-encoded bookmarklet
const encodedBookmarklet = 'javascript:' + encodeURIComponent(bookmarkletWrapper);
const encodedFile = path.join(BUILD_DIR, 'swerve-bookmarklet.txt');
fs.writeFileSync(encodedFile, encodedBookmarklet);

// Create HTML file for easy installation
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Swerve Bookmarklet - Install</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .bookmarklet {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
        }
        .bookmarklet a {
            display: inline-block;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
        }
        .bookmarklet a:hover {
            background: #0056b3;
        }
        .instructions {
            background: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
        }
        code {
            background: #f1f3f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
        .feature-list {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .feature-list ul {
            margin: 0;
            padding-left: 20px;
        }
    </style>
</head>
<body>
    <h1>🚀 Swerve Bookmarklet</h1>
    <p>Beam any web page to your AI backend with a single click!</p>
    
    <div class="bookmarklet">
        <p><strong>Drag this link to your bookmarks bar:</strong></p>
        <a href="${encodedBookmarklet}">📡 Swerve</a>
    </div>
    
    <div class="instructions">
        <h3>📋 Installation Instructions</h3>
        <ol>
            <li>Right-click the "Swerve" button above and select "Copy Link"</li>
            <li>Create a new bookmark in your browser</li>
            <li>Name it "Swerve" and paste the copied link as the URL</li>
            <li>Or simply drag the button to your bookmarks toolbar</li>
        </ol>
    </div>
    
    <div class="feature-list">
        <h3>✨ Features</h3>
        <ul>
            <li><strong>Site Control:</strong> Allowlist/denylist functionality to control which sites can be captured</li>
            <li><strong>Pattern Matching:</strong> Support for wildcards, regex, and domain patterns</li>
            <li><strong>Easy Configuration:</strong> Hold Shift and click the bookmarklet to configure settings</li>
            <li><strong>Persistent Settings:</strong> Your allowlist/denylist settings are saved in localStorage</li>
            <li><strong>Visual Feedback:</strong> Clear notifications for captures, blocks, and errors</li>
        </ul>
    </div>
    
    <h3>🔧 Configuration</h3>
    <p>Hold <code>Shift</code> and click the Swerve bookmarklet to open the configuration panel where you can:</p>
    <ul>
        <li>Set allowlist/denylist mode</li>
        <li>Add/remove site patterns</li>
        <li>View pattern examples and syntax help</li>
    </ul>
    
    <h3>📝 Pattern Examples</h3>
    <ul>
        <li><code>example.com</code> - Exact domain match</li>
        <li><code>*.google.com</code> - All Google subdomains</li>
        <li><code>reddit.com/r/programming/*</code> - Specific subreddit</li>
        <li><code>/.*\\.ads\\..*/</code> - Regex to block ad domains</li>
    </ul>
    
    <p><strong>Note:</strong> Remember to replace <code>https://service.example.com/ingest</code> with your actual endpoint URL in the source code before building.</p>
</body>
</html>
`;

const htmlFile = path.join(BUILD_DIR, 'install.html');
fs.writeFileSync(htmlFile, htmlTemplate);

// Create package.json for the build process
const packageJson = {
    "name": "swerve-bookmarklet",
    "version": "0.1.0",
    "description": "AI bookmarklet with allowlist/denylist functionality",
    "main": "dist/swerve-bookmarklet.js",
    "scripts": {
        "build": "node build.js",
        "dev": "node build.js && python -m http.server 8080"
    },
    "keywords": ["bookmarklet", "ai", "web-scraping"],
    "author": "Swerve Team",
    "license": "MIT"
};

const packageFile = path.join(__dirname, 'package.json');
fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, 2));

console.log('✅ Build completed successfully!');
console.log(`📁 Files generated:`);
console.log(`   ${bookmarkletFile}`);
console.log(`   ${encodedFile}`);
console.log(`   ${htmlFile}`);
console.log(`   ${packageFile}`);
console.log(`\n🌐 Open ${htmlFile} in a browser to install the bookmarklet.`);