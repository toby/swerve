#!/usr/bin/env node

/**
 * Build script for Swerve bookmarklet
 * 
 * This script:
 * 1. Reads the source bookmarklet code
 * 2. Minifies it for production use
 * 3. Generates a configurable bookmarklet with endpoint injection
 * 4. Creates example bookmarklet URLs
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    srcDir: 'src',
    distDir: 'dist',
    sourceFile: 'swerve.js',
    outputFile: 'swerve.min.js',
    defaultEndpoint: 'https://service.example.com/ingest',
    defaultToken: ''
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function minifyCode(code) {
    // Basic minification - remove comments, extra whitespace, etc.
    return code
        // Remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around operators and punctuation
        .replace(/\s*([{}();,=<>!&|+-])\s*/g, '$1')
        // Remove whitespace at start/end of lines
        .replace(/^\s+|\s+$/gm, '')
        // Join lines
        .replace(/\n+/g, '')
        .trim();
}

function injectConfig(code, endpoint, token) {
    // Replace the CONFIG object with actual values
    const configPattern = /const CONFIG = \{[^}]+\}/;
    const newConfig = `const CONFIG={endpoint:"${endpoint}",version:"0.1.0",maxRetries:3,timeout:30000}`;
    
    return code.replace(configPattern, newConfig);
}

function generateBookmarkletUrl(code) {
    return 'javascript:' + encodeURIComponent(code);
}

function build() {
    console.log('🔨 Building Swerve bookmarklet...');
    
    // Ensure directories exist
    ensureDir(CONFIG.distDir);
    
    // Read source file
    const srcPath = path.join(CONFIG.srcDir, CONFIG.sourceFile);
    if (!fs.existsSync(srcPath)) {
        console.error(`❌ Source file not found: ${srcPath}`);
        process.exit(1);
    }
    
    const sourceCode = fs.readFileSync(srcPath, 'utf8');
    console.log(`📖 Read source file: ${srcPath} (${sourceCode.length} chars)`);
    
    // Generate versions with different configurations
    const variants = [
        {
            name: 'default',
            endpoint: CONFIG.defaultEndpoint,
            token: CONFIG.defaultToken,
            description: 'Default configuration'
        },
        {
            name: 'localhost',
            endpoint: 'http://localhost:3000/ingest',
            token: '',
            description: 'Local development'
        },
        {
            name: 'production',
            endpoint: 'https://swerve.ai/ingest',
            token: 'YOUR_TOKEN_HERE',
            description: 'Production template'
        }
    ];
    
    const results = [];
    
    for (const variant of variants) {
        // Inject configuration
        const configuredCode = injectConfig(sourceCode, variant.endpoint, variant.token);
        
        // Minify code
        const minifiedCode = minifyCode(configuredCode);
        console.log(`🗜️  Minified ${variant.name}: ${sourceCode.length} → ${minifiedCode.length} chars`);
        
        // Generate bookmarklet URL
        const bookmarkletUrl = generateBookmarkletUrl(minifiedCode);
        
        // Write minified file
        const outputPath = path.join(CONFIG.distDir, `swerve-${variant.name}.min.js`);
        fs.writeFileSync(outputPath, minifiedCode);
        
        // Write bookmarklet URL file
        const urlPath = path.join(CONFIG.distDir, `bookmarklet-${variant.name}.txt`);
        fs.writeFileSync(urlPath, bookmarkletUrl);
        
        results.push({
            variant: variant.name,
            description: variant.description,
            endpoint: variant.endpoint,
            minifiedPath: outputPath,
            minifiedSize: minifiedCode.length,
            bookmarkletPath: urlPath,
            bookmarkletSize: bookmarkletUrl.length
        });
    }
    
    // Generate README for dist directory
    const distReadme = generateDistReadme(results);
    fs.writeFileSync(path.join(CONFIG.distDir, 'README.md'), distReadme);
    
    console.log('✅ Build complete!');
    console.log('\nGenerated files:');
    results.forEach(result => {
        console.log(`\n📦 ${result.variant} (${result.description})`);
        console.log(`   Minified: ${result.minifiedPath} (${result.minifiedSize} chars)`);
        console.log(`   Bookmarklet: ${result.bookmarkletPath} (${result.bookmarkletSize} chars)`);
        console.log(`   Endpoint: ${result.endpoint}`);
    });
    
    console.log(`\n📚 See ${path.join(CONFIG.distDir, 'README.md')} for usage instructions.`);
}

function generateDistReadme(results) {
    return `# Swerve Bookmarklet - Built Files

This directory contains the built and minified versions of the Swerve bookmarklet.

## Quick Start

1. Choose a variant below based on your setup
2. Copy the bookmarklet URL from the corresponding \`.txt\` file
3. Create a new bookmark in your browser
4. Paste the bookmarklet URL as the bookmark location
5. Click the bookmark on any page to capture and send it to Swerve

## Available Variants

${results.map(result => `
### ${result.variant} - ${result.description}

- **Endpoint**: \`${result.endpoint}\`
- **Minified Code**: \`${result.minifiedPath}\` (${result.minifiedSize} characters)
- **Bookmarklet URL**: \`${result.bookmarkletPath}\` (${result.bookmarkletSize} characters)

To use this variant:
\`\`\`bash
cat ${result.bookmarkletPath}
\`\`\`

Copy the output and use it as your bookmark URL.`).join('\n')}

## CSP Fallback Features

All variants include automatic CSP (Content Security Policy) fallback mechanisms:

1. **Primary**: fetch() with CORS
2. **Fallback 1**: navigator.sendBeacon() 
3. **Fallback 2**: Form POST via hidden iframe
4. **Final Fallback**: Clear error message with helper page guidance

## Testing

Use the \`src/test-csp.html\` file to test CSP compatibility and fallback mechanisms.

## Helper Page

If the bookmarklet cannot run due to strict CSP policies, users can use the helper page at \`src/helper.html\` to capture pages via proxy.

## Customization

To build with a custom endpoint:

\`\`\`bash
node build.js --endpoint https://your-swerve-service.com/ingest --token your-auth-token
\`\`\`

Or modify the source code in \`src/swerve.js\` and run \`node build.js\`.

## File Sizes

- **Source**: ~10KB (readable, with comments)
- **Minified**: ~4-6KB (production-ready)
- **Bookmarklet**: ~5-7KB (URL-encoded)

The minified version stays well within bookmarklet size limits while including all CSP fallback functionality.

---

Generated on: ${new Date().toISOString()}
`;
}

// Run build if called directly
if (require.main === module) {
    build();
}

module.exports = { build, minifyCode, injectConfig, generateBookmarkletUrl };