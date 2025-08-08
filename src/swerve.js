/**
 * Swerve Bookmarklet - AI-powered web page capture
 * 
 * Captures web page content and sends it to a configured AI service endpoint.
 * Includes CSP fallback mechanisms for sites with strict Content Security Policies.
 */

(async () => {
    const CONFIG = {
        endpoint: "https://service.example.com/ingest",
        version: "0.1.0",
        maxRetries: 3,
        timeout: 30000
    };

    try {
        // Collect page data
        const pageData = collectPageData();
        
        // Try multiple transport methods with CSP fallbacks
        const result = await sendWithFallbacks(pageData);
        
        if (result.success) {
            showSuccess("Page sent successfully ✅");
        } else {
            throw new Error(result.error || "Unknown error");
        }
        
    } catch (error) {
        handleError(error);
    }

    /**
     * Collect all page data for transmission
     */
    function collectPageData() {
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

        return {
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
                bookmarkletVersion: CONFIG.version,
                language: navigator.language
            }
        };
    }

    /**
     * Try multiple transport methods with CSP fallbacks
     */
    async function sendWithFallbacks(payload) {
        const methods = [
            () => sendViaFetch(payload),
            () => sendViaBeacon(payload),
            () => sendViaFormPost(payload)
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                const result = await methods[i]();
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.log(`Swerve: Method ${i + 1} failed:`, error.message);
                
                // If this was a CSP error, provide guidance
                if (isCSPError(error)) {
                    if (i === methods.length - 1) {
                        // Last method failed due to CSP
                        return {
                            success: false,
                            error: "CSP_BLOCKED",
                            guidance: getCSPGuidance()
                        };
                    }
                    // Try next method
                    continue;
                }
                
                // For non-CSP errors, continue trying other methods
                if (i < methods.length - 1) continue;
                
                // All methods failed
                throw error;
            }
        }
        
        return { success: false, error: "All transport methods failed" };
    }

    /**
     * Primary transport method using fetch API
     */
    async function sendViaFetch(payload) {
        const response = await fetch(CONFIG.endpoint, {
            method: "POST",
            mode: "cors",
            keepalive: true,
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return { success: true, data: result };
    }

    /**
     * Fallback using navigator.sendBeacon for small payloads
     */
    async function sendViaBeacon(payload) {
        const payloadStr = JSON.stringify(payload);
        const blob = new Blob([payloadStr], { type: 'application/json' });
        
        // sendBeacon has size limitations
        if (blob.size > 64 * 1024) {
            throw new Error("Payload too large for sendBeacon");
        }

        const success = navigator.sendBeacon(CONFIG.endpoint, blob);
        
        if (!success) {
            throw new Error("sendBeacon failed");
        }

        // sendBeacon doesn't provide response, so we assume success
        return { success: true, data: { method: "beacon" } };
    }

    /**
     * Final fallback using form POST to hidden iframe
     */
    async function sendViaFormPost(payload) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.name = 'swerve-fallback-' + Date.now();
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = CONFIG.endpoint;
            form.target = iframe.name;
            form.style.display = 'none';

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'payload';
            input.value = JSON.stringify(payload);

            form.appendChild(input);
            document.body.appendChild(iframe);
            document.body.appendChild(form);

            // Set up cleanup and response handling
            const cleanup = () => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                if (form.parentNode) form.parentNode.removeChild(form);
            };

            iframe.onload = () => {
                setTimeout(() => {
                    cleanup();
                    resolve({ success: true, data: { method: "form-post" } });
                }, 1000);
            };

            iframe.onerror = () => {
                cleanup();
                reject(new Error("Form post iframe failed to load"));
            };

            // Timeout handling
            setTimeout(() => {
                cleanup();
                reject(new Error("Form post timeout"));
            }, CONFIG.timeout);

            form.submit();
        });
    }

    /**
     * Check if an error is CSP-related
     */
    function isCSPError(error) {
        const message = error.message.toLowerCase();
        return message.includes('csp') || 
               message.includes('content security policy') ||
               message.includes('blocked by content security policy') ||
               (error.name === 'TypeError' && message.includes('failed to fetch'));
    }

    /**
     * Get user guidance for CSP issues
     */
    function getCSPGuidance() {
        return {
            message: "This site's Content Security Policy blocks the bookmarklet.",
            alternatives: [
                "Try the Swerve Helper Page: [Create helper page URL here]",
                "Copy the page URL and paste it into the Swerve service directly",
                "Contact the site administrator about CSP policy"
            ],
            helperUrl: getHelperPageUrl()
        };
    }

    /**
     * Generate URL for helper page with current page URL
     */
    function getHelperPageUrl() {
        // This would be the URL to a helper page hosted by the Swerve service
        const baseHelperUrl = CONFIG.endpoint.replace('/ingest', '/helper');
        const currentUrl = encodeURIComponent(window.location.href);
        return `${baseHelperUrl}?url=${currentUrl}`;
    }

    /**
     * Show success message to user
     */
    function showSuccess(message) {
        // Create a simple toast notification
        const toast = createToast(message, 'success');
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    /**
     * Handle and display errors to user
     */
    function handleError(error) {
        console.error("Swerve error:", error);
        
        let message = "Failed to send page ❌";
        let details = null;

        if (error.message === "CSP_BLOCKED") {
            const guidance = getCSPGuidance();
            message = guidance.message;
            details = guidance.alternatives;
        } else {
            details = [`Error: ${error.message}`];
        }

        const toast = createToast(message, 'error', details);
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 10000); // Longer timeout for errors
    }

    /**
     * Create a toast notification element
     */
    function createToast(message, type = 'info', details = null) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : '#44aa44'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 999999;
            max-width: 350px;
            word-wrap: break-word;
        `;

        let content = `<div style="font-weight: 600; margin-bottom: ${details ? '8px' : '0'};">${message}</div>`;
        
        if (details && details.length > 0) {
            content += '<div style="font-size: 12px; opacity: 0.9;">';
            details.forEach(detail => {
                content += `<div style="margin-top: 4px;">• ${detail}</div>`;
            });
            content += '</div>';
        }

        toast.innerHTML = content;
        return toast;
    }
})();