/**
 * Swerve - AI bookmarklet for page capture
 * Captures web pages and sends them to AI services with optional LZ compression
 */

// LZ-string compression library (inline for bookmarklet compatibility)
// Simplified version for bookmarklet use
const LZString = (() => {
    const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    
    const compress = (input) => {
        if (input == null) return "";
        if (input === "") return "";
        
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
        
        // Simple base64-like encoding for the compressed data
        let result = "";
        for (let i = 0; i < data.length; i++) {
            const num = data[i];
            result += keyStrBase64.charAt((num >> 18) & 63);
            result += keyStrBase64.charAt((num >> 12) & 63);
            result += keyStrBase64.charAt((num >> 6) & 63);
            result += keyStrBase64.charAt(num & 63);
        }
        return result;
    };
    
    const decompress = (compressed) => {
        if (compressed == null || compressed === "") return "";
        
        const keyStrBase64Map = {};
        for (let i = 0; i < keyStrBase64.length; i++) {
            keyStrBase64Map[keyStrBase64.charAt(i)] = i;
        }
        
        const data = [];
        for (let i = 0; i < compressed.length; i += 4) {
            const encoded = (keyStrBase64Map[compressed.charAt(i)] << 18) |
                          (keyStrBase64Map[compressed.charAt(i + 1)] << 12) |
                          (keyStrBase64Map[compressed.charAt(i + 2)] << 6) |
                          keyStrBase64Map[compressed.charAt(i + 3)];
            data.push(encoded);
        }
        
        // Reconstruct the original string (simplified decompression)
        const dictionary = {};
        let phrase = String.fromCharCode(data[0]);
        let result = phrase;
        let code = 256;
        
        for (let i = 1; i < data.length; i++) {
            const currCode = data[i];
            let currPhrase;
            
            if (dictionary[currCode] != null) {
                currPhrase = dictionary[currCode];
            } else if (currCode === code) {
                currPhrase = phrase + phrase.charAt(0);
            } else {
                currPhrase = String.fromCharCode(currCode);
            }
            
            result += currPhrase;
            dictionary[code++] = phrase + currPhrase.charAt(0);
            phrase = currPhrase;
        }
        
        return result;
    };
    
    return { compress, decompress };
})();

// Configuration
const SWERVE_CONFIG = {
    endpoint: "https://service.example.com/ingest",
    version: "0.2.0",
    compression: {
        enabled: true, // Enable compression by default
        minSize: 1024, // Only compress if payload > 1KB
        algorithm: "lz-string"
    }
};

// Main bookmarklet function
async function swerveCapture() {
    try {
        const startTime = Date.now();
        
        // Capture page data
        const d = document;
        const s = window.getSelection && window.getSelection();
        const selectionText = s ? String(s) : "";
        const selectionHtml = s && s.rangeCount ? (() => {
            const r = s.getRangeAt(0);
            const f = r.cloneContents();
            const e = d.createElement("div");
            e.appendChild(f);
            return e.innerHTML;
        })() : "";

        // Build the payload
        const payload = {
            version: "0",
            page: {
                url: location.href,
                title: d.title || null,
                referrer: d.referrer || document.referrer || null,
                userAgent: navigator.userAgent,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                scroll: { x: window.scrollX, y: window.scrollY }
            },
            snapshot: {
                html: d.documentElement.outerHTML,
                selectionText,
                selectionHtml,
                capturedAt: new Date().toISOString()
            },
            transfer: {
                encoding: "plain",
                chunk: { index: 0, count: 1 }
            },
            client: {
                bookmarkletVersion: SWERVE_CONFIG.version,
                language: navigator.language
            }
        };

        // Serialize payload
        let payloadStr = JSON.stringify(payload);
        const originalSize = payloadStr.length;
        
        // Apply compression if enabled and beneficial
        if (SWERVE_CONFIG.compression.enabled && originalSize > SWERVE_CONFIG.compression.minSize) {
            const compressionStart = Date.now();
            const compressed = LZString.compress(payloadStr);
            const compressionTime = Date.now() - compressionStart;
            
            const compressedSize = compressed.length;
            const compressionRatio = (originalSize - compressedSize) / originalSize;
            
            // Use compression if it saves at least 10% and doesn't take too long
            if (compressionRatio > 0.1 && compressionTime < 200) {
                payloadStr = compressed;
                payload.transfer.encoding = "lz";
                
                // Log compression stats for debugging
                console.log(`Swerve: Compressed ${originalSize} → ${compressedSize} bytes (${Math.round(compressionRatio * 100)}% reduction)`);
            } else {
                console.log(`Swerve: Compression not beneficial (${Math.round(compressionRatio * 100)}% reduction, ${compressionTime}ms)`);
            }
        }

        // Send the payload
        const response = await fetch(SWERVE_CONFIG.endpoint, {
            method: "POST",
            mode: "cors",
            keepalive: true,
            headers: {
                "Content-Type": "application/json"
            },
            body: payloadStr
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const totalTime = Date.now() - startTime;
        console.log(`Swerve: Success in ${totalTime}ms`);
        
        // Show success notification
        alert(`Swerve: Sent ✅ (${Math.round(payloadStr.length / 1024)}KB in ${totalTime}ms)`);
        
    } catch (error) {
        console.error("Swerve error:", error);
        alert(`Swerve: Failed ❌ (${error.message})`);
    }
}

// Export for testing and building
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { swerveCapture, LZString, SWERVE_CONFIG };
}