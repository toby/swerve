// Swerve bookmarklet - captures page content and sends to AI service
(async () => {
  try {
    // Configuration - will be replaced by generator
    const ENDPOINT = "{{ENDPOINT}}";
    const AUTH_TOKEN = "{{AUTH_TOKEN}}";
    
    const metadata = { version: "0.1.0" };
    const document = window.document;
    const selection = window.getSelection && window.getSelection();
    
    // Extract selection text and HTML
    const selectionText = selection ? String(selection) : "";
    const selectionHtml = selection && selection.rangeCount 
      ? (() => {
          const range = selection.getRangeAt(0);
          const fragment = range.cloneContents();
          const element = document.createElement("div");
          element.appendChild(fragment);
          return element.innerHTML;
        })()
      : "";
    
    // Build payload
    const payload = {
      version: "0",
      page: {
        url: location.href,
        title: document.title || null,
        referrer: document.referrer || window.document.referrer || null,
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
      snapshot: {
        html: document.documentElement.outerHTML,
        selectionText,
        selectionHtml,
        capturedAt: new Date().toISOString()
      },
      transfer: {
        encoding: "plain",
        chunk: {
          index: 0,
          count: 1
        }
      },
      client: {
        bookmarkletVersion: metadata.version,
        language: navigator.language
      }
    };
    
    // Send to endpoint
    const headers = {
      "content-type": "application/json"
    };
    
    // Add auth token if provided
    if (AUTH_TOKEN && AUTH_TOKEN !== "{{AUTH_TOKEN}}") {
      headers.authorization = `Bearer ${AUTH_TOKEN}`;
    }
    
    const response = await fetch(ENDPOINT, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
    
    alert("Swerve: sent ✅");
  } catch (error) {
    console.error("Swerve bookmarklet error:", error);
    alert("Swerve: failed ❌");
  }
})();