/**
 * Main Swerve bookmarklet functionality
 * Enhanced with allowlist/denylist support
 */

async function runSwerve() {
    try {
        const ENDPOINT = "https://service.example.com/ingest";
        const METADATA = { v: "0.1.0" };
        
        const d = document;
        const currentUrl = location.href;

        // Check if capture is allowed for this URL
        const { allowed, reason } = SwerveAllowlist.isAllowed(currentUrl);
        
        if (!allowed) {
            // Show user-friendly blocked message
            showToast(`Swerve: ${reason} ⛔`, 'error');
            return;
        }

        // Show capture in progress
        showToast("Beaming page to Swerve… 🚀", 'info');

        // Get selection if any
        const s = window.getSelection && window.getSelection();
        const selectionText = s ? String(s) : "";
        const selectionHtml = s && s.rangeCount ? (() => {
            const r = s.getRangeAt(0);
            const f = r.cloneContents();
            const e = d.createElement("div");
            e.appendChild(f);
            return e.innerHTML;
        })() : "";

        // Build payload
        const payload = {
            version: "0",
            page: {
                url: currentUrl,
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
                chunk: {
                    index: 0,
                    count: 1
                }
            },
            client: {
                bookmarkletVersion: METADATA.v,
                language: navigator.language
            }
        };

        // Send to endpoint
        const res = await fetch(ENDPOINT, {
            method: "POST",
            mode: "cors",
            keepalive: true,
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
        }

        showToast("Swerve: sent ✅", 'success');

    } catch (e) {
        console.error('Swerve error:', e);
        showToast("Swerve: failed ❌", 'error');
    }
}

/**
 * Show toast notification to user
 */
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.getElementById('swerve-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'swerve-toast';
    toast.textContent = message;
    
    // Style the toast
    const styles = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '999999',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        cursor: 'pointer'
    };

    // Set type-specific colors
    const colors = {
        info: '#007bff',
        success: '#28a745',
        error: '#dc3545'
    };
    
    Object.assign(toast.style, styles);
    toast.style.backgroundColor = colors[type] || colors.info;

    // Add to page
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Auto-remove after delay (longer for errors)
    const delay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, delay);

    // Allow manual dismiss
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    });
}

/**
 * Check if Shift key was held during bookmarklet activation
 * If so, show configuration UI instead of capturing
 */
function checkForConfigMode() {
    // This will be set by the bookmarklet based on event detection
    return window.swerveConfigMode || false;
}

/**
 * Main bookmarklet entry point
 */
async function swerveMain() {
    // Check if user wants to configure (Shift+click)
    if (checkForConfigMode()) {
        SwerveConfigUI.showConfigModal();
        return;
    }

    // Normal capture flow
    await runSwerve();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runSwerve,
        showToast,
        swerveMain
    };
}