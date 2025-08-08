#!/usr/bin/env node

/**
 * Build script for Swerve bookmarklet
 * Generates a minified bookmarklet from source and injects configuration
 */

const fs = require('fs');
const path = require('path');

// Configuration that can be customized
const config = {
    endpoint: process.env.SWERVE_ENDPOINT || "https://service.example.com/ingest",
    version: "0.2.0",
    compression: {
        enabled: true,
        minSize: 1024,
        algorithm: "lz-string"
    }
};

// Read the source file and prepare for bookmarklet
const sourcePath = path.join(__dirname, 'swerve.js');
const sourceCode = fs.readFileSync(sourcePath, 'utf8');

// Remove comments and Node.js export, but preserve the main structure
const cleanedCode = sourceCode
    .replace(/\/\*\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/[^\n]*$/gm, '')       // Remove line comments
    .replace(/if \(typeof module[\s\S]*?module\.exports[\s\S]*?}/g, ''); // Remove Node exports

// Create bookmarklet with config injection
const bookmarkletCode = `javascript:(async()=>{
${cleanedCode}
SWERVE_CONFIG.endpoint="${config.endpoint}";
SWERVE_CONFIG.version="${config.version}";  
SWERVE_CONFIG.compression.enabled=${config.compression.enabled};
swerveCapture();
})();`;

// Very basic minification to keep it readable and working
const minified = bookmarkletCode
    .replace(/\n\s+/g, ' ')     // Remove newlines and indentation
    .replace(/\s+/g, ' ')       // Collapse spaces
    .replace(/;\s+/g, ';')      // Clean up semicolons
    .trim();

// Output the bookmarklet
console.log('Generated Swerve bookmarklet:');
console.log('');
console.log(minified);
console.log('');
console.log(`Size: ${minified.length} bytes`);
console.log(`Config: ${JSON.stringify(config, null, 2)}`);

// Also save to file
const outputPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

fs.writeFileSync(path.join(outputPath, 'bookmarklet.js'), minified);
console.log('Saved to dist/bookmarklet.js');