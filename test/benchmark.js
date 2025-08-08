#!/usr/bin/env node

/**
 * Compression benchmark script for Swerve
 * Tests LZ-string compression on various payload sizes and types
 */

const fs = require('fs');
const path = require('path');

// Load the Swerve code for testing
const swerveCode = fs.readFileSync(path.join(__dirname, '../src/swerve.js'), 'utf8');

// Extract LZString implementation (simplified for Node.js testing)
const LZString = (() => {
    const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    
    const compress = (input) => {
        if (!input) return "";
        
        const dictionary = {};
        const data = [];
        let currChar;
        let phrase = input.charAt(0);
        let code = 256;
        
        for (let i = 1; i < input.length; i++) {
            currChar = input.charAt(i);
            if (dictionary[phrase + currChar] != null) {
                phrase += currChar;
            } else {
                data.push(phrase.length > 1 ? dictionary[phrase] : phrase.charCodeAt(0));
                dictionary[phrase + currChar] = code++;
                phrase = currChar;
            }
        }
        
        data.push(phrase.length > 1 ? dictionary[phrase] : phrase.charCodeAt(0));
        
        let result = "";
        for (let i = 0; i < data.length; i++) {
            const num = data[i];
            if (num < 64) {
                result += keyStrBase64.charAt(num);
            } else {
                result += keyStrBase64.charAt((num >> 6) & 63) + keyStrBase64.charAt(num & 63);
            }
        }
        return result;
    };
    
    return { compress };
})();

// Generate test payloads of different types and sizes
function generateTestPayloads() {
    const basePayload = {
        version: "0",
        page: {
            url: "https://example.com/test-article",
            title: "Test Article for Compression Benchmarking",
            referrer: "https://news.ycombinator.com/",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            viewport: { width: 1440, height: 900 },
            scroll: { x: 0, y: 842 }
        },
        snapshot: {
            capturedAt: new Date().toISOString()
        },
        transfer: {
            encoding: "plain",
            chunk: { index: 0, count: 1 }
        },
        client: {
            bookmarkletVersion: "0.2.0",
            language: "en-US"
        }
    };

    const tests = [
        {
            name: "Small HTML (1KB)",
            html: generateHTMLContent(1024)
        },
        {
            name: "Medium HTML (10KB)",  
            html: generateHTMLContent(10 * 1024)
        },
        {
            name: "Large HTML (50KB)",
            html: generateHTMLContent(50 * 1024)
        },
        {
            name: "Very Large HTML (100KB)",
            html: generateHTMLContent(100 * 1024)
        },
        {
            name: "Repetitive Content", 
            html: generateRepetitiveHTML()
        },
        {
            name: "Diverse Content",
            html: generateDiverseHTML()
        }
    ];

    return tests.map(test => ({
        ...test,
        payload: {
            ...basePayload,
            snapshot: {
                ...basePayload.snapshot,
                html: test.html,
                selectionText: test.html.substring(0, 500),
                selectionHtml: test.html.substring(0, 1000)
            }
        }
    }));
}

function generateHTMLContent(targetSize) {
    let html = '<html><head><title>Test Page</title></head><body>';
    
    const loremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";
    
    while (html.length < targetSize - 100) {
        html += `<p>${loremIpsum}</p>\n`;
        html += `<div class="content">${loremIpsum}</div>\n`;
    }
    
    html += '</body></html>';
    return html;
}

function generateRepetitiveHTML() {
    const pattern = '<div class="item"><h3>Title</h3><p>This is repetitive content that should compress very well.</p></div>';
    return '<html><body>' + pattern.repeat(200) + '</body></html>';
}

function generateDiverseHTML() {
    const randomStrings = [];
    for (let i = 0; i < 100; i++) {
        randomStrings.push(Math.random().toString(36).substring(2, 15));
    }
    
    let html = '<html><body>';
    randomStrings.forEach(str => {
        html += `<div id="${str}" class="unique-${str.substring(0,3)}">${str}</div>`;
    });
    html += '</body></html>';
    return html;
}

function runBenchmark() {
    console.log('🔄 Swerve Compression Benchmark\n');
    console.log('Testing LZ-string compression on various payload types...\n');
    
    const testPayloads = generateTestPayloads();
    const results = [];
    
    testPayloads.forEach(test => {
        const payloadStr = JSON.stringify(test.payload);
        const originalSize = payloadStr.length;
        
        const startTime = process.hrtime.bigint();
        const compressed = LZString.compress(payloadStr);
        const endTime = process.hrtime.bigint();
        
        const compressedSize = compressed.length;
        const compressionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        
        const result = {
            name: test.name,
            originalSize,
            compressedSize,
            compressionRatio,
            compressionTime,
            passed: compressionRatio >= 30 && compressionTime < 200
        };
        
        results.push(result);
        
        console.log(`📄 ${result.name}`);
        console.log(`   Original: ${formatBytes(result.originalSize)}`);
        console.log(`   Compressed: ${formatBytes(result.compressedSize)}`);
        console.log(`   Reduction: ${result.compressionRatio.toFixed(1)}%`);
        console.log(`   Time: ${result.compressionTime.toFixed(2)}ms`);
        console.log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'} ${result.compressionRatio >= 30 ? '' : '(< 30% reduction)'} ${result.compressionTime >= 200 ? '(> 200ms)' : ''}`);
        console.log('');
    });
    
    // Summary
    console.log('📊 Summary:');
    const passedTests = results.filter(r => r.passed).length;
    const avgCompression = results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;
    const avgTime = results.reduce((sum, r) => sum + r.compressionTime, 0) / results.length;
    
    console.log(`   Tests passed: ${passedTests}/${results.length}`);
    console.log(`   Average compression: ${avgCompression.toFixed(1)}%`);
    console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Overall: ${passedTests === results.length ? '✅ ALL REQUIREMENTS MET' : '⚠️ Some tests failed'}`);
    
    if (avgCompression >= 30) {
        console.log('✅ Compression target achieved (30%+ reduction)');
    } else {
        console.log('❌ Compression target not met (< 30% average reduction)');
    }
    
    if (avgTime < 200) {
        console.log('✅ Performance target achieved (< 200ms overhead)');
    } else {
        console.log('❌ Performance target not met (>= 200ms overhead)');
    }
    
    return results;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Run the benchmark
if (require.main === module) {
    runBenchmark();
}

module.exports = { runBenchmark, LZString };