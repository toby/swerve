/**
 * Swerve Bookmarklet - Ships web pages to your AI backend
 * Version: 0.1.0
 */

// Configuration
const CONFIG = {
  ENDPOINT: "https://service.example.com/ingest",
  VERSION: "0.1.0",
  ENABLE_TEXT_EXTRACTION: true, // New configuration option
  MAX_EXTRACTION_TIME: 300 // Maximum time allowed for text extraction (ms)
};

/**
 * Main bookmarklet function
 */
async function swerveCapture() {
  try {
    const startTime = performance.now();
    const d = document;
    const s = window.getSelection && window.getSelection();
    
    // Get selection data
    const selectionText = s ? String(s) : "";
    const selectionHtml = s && s.rangeCount ? (() => {
      const r = s.getRangeAt(0);
      const f = r.cloneContents();
      const e = d.createElement("div");
      e.appendChild(f);
      return e.innerHTML;
    })() : "";

    // Base snapshot data
    const snapshot = {
      html: d.documentElement.outerHTML,
      selectionText,
      selectionHtml,
      capturedAt: new Date().toISOString()
    };

    // Add text extraction if enabled
    if (CONFIG.ENABLE_TEXT_EXTRACTION && typeof extractReadableContent === 'function') {
      const extractionStart = performance.now();
      const extraction = extractReadableContent(d);
      const extractionTime = performance.now() - extractionStart;
      
      snapshot.extractedText = extraction.text;
      snapshot.extractionMetadata = {
        ...extraction.metadata,
        extractionTimeMs: Math.round(extractionTime),
        extractionEnabled: true
      };
    }

    // Build payload
    const payload = {
      version: "0",
      page: {
        url: location.href,
        title: d.title || null,
        referrer: d.referrer || document.referrer || null,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        scroll: {
          x: window.scrollX,
          y: window.scrollY
        }
      },
      snapshot,
      transfer: {
        encoding: "plain",
        chunk: { index: 0, count: 1 }
      },
      client: {
        bookmarkletVersion: CONFIG.VERSION,
        language: navigator.language
      }
    };

    // Send payload
    const res = await fetch(CONFIG.ENDPOINT, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error("upload failed");
    }

    const totalTime = Math.round(performance.now() - startTime);
    alert(`Swerve: sent ✅ (${totalTime}ms)`);
    
  } catch (e) {
    console.error(e);
    alert("Swerve: failed ❌");
  }
}

// Export for use in bookmarklet
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { swerveCapture, CONFIG };
}