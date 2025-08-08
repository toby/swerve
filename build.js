const fs = require('fs');
const path = require('path');

/**
 * Build script to generate the bookmarklet
 */
function buildBookmarklet() {
  const srcDir = path.join(__dirname, 'src');
  const readabilityPath = path.join(srcDir, 'readability.js');
  const swervePath = path.join(srcDir, 'swerve.js');
  
  try {
    // Read the source files
    const readabilityCode = fs.readFileSync(readabilityPath, 'utf8');
    const swerveCode = fs.readFileSync(swervePath, 'utf8');
    
    // Extract just the functions we need for the bookmarklet
    const readabilityCore = extractReadabilityCore(readabilityCode);
    const swerveCore = extractSwerveCore(swerveCode);
    
    // Generate the bookmarklet
    const bookmarklet = generateBookmarklet(readabilityCore, swerveCore);
    
    // Save the bookmarklet
    const outputPath = path.join(__dirname, 'dist', 'bookmarklet.js');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, bookmarklet);
    
    console.log('Bookmarklet built successfully!');
    console.log(`Output: ${outputPath}`);
    console.log(`Size: ${bookmarklet.length} characters`);
    
    return bookmarklet;
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

function extractReadabilityCore(code) {
  // Extract the core readability function without module exports
  const start = code.indexOf('const NEGATIVE_SELECTORS');
  const end = code.indexOf('// Export for use in both Node.js');
  
  if (start === -1 || end === -1) {
    throw new Error('Could not find readability core code');
  }
  
  return code.substring(start, end).trim();
}

function extractSwerveCore(code) {
  // Extract the core swerve function without module exports
  const start = code.indexOf('const CONFIG');
  const end = code.indexOf('// Export for use in bookmarklet');
  
  if (start === -1 || end === -1) {
    throw new Error('Could not find swerve core code');
  }
  
  return code.substring(start, end).trim();
}

function generateBookmarklet(readabilityCode, swerveCode) {
  // Create a minified bookmarklet
  return `javascript:(function(){
${readabilityCode}

${swerveCode}

// Execute immediately
swerveCapture();
})();`.replace(/\s+/g, ' ').trim();
}

// Run the build if this script is executed directly
if (require.main === module) {
  buildBookmarklet();
}

module.exports = { buildBookmarklet };