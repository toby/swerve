/**
 * Swerve Bookmarklet - AI Web Page Capture with Preview
 * Version: 0.2.0
 */

(async function() {
    'use strict';
    
    // Configuration
    const SWERVE_CONFIG = {
        endpoint: 'https://service.example.com/ingest',
        version: '0.2.0',
        ui: {
            modalId: 'swerve-preview-modal',
            backdropId: 'swerve-modal-backdrop'
        }
    };

    // Capture modes
    const CAPTURE_MODES = {
        FULL_PAGE: 'full-page',
        SELECTION: 'selection',
        TEXT_ONLY: 'text-only',
        VISIBLE_AREA: 'visible-area'
    };

    // State management
    let currentCaptureMode = CAPTURE_MODES.FULL_PAGE;
    let capturedData = null;
    let hiddenElements = new Set();

    /**
     * Data collection functions
     */
    function collectPageData(mode = CAPTURE_MODES.FULL_PAGE) {
        const d = document;
        const s = window.getSelection && window.getSelection();
        const selectionText = s ? String(s) : '';
        const selectionHtml = s && s.rangeCount ? (() => {
            const r = s.getRangeAt(0);
            const f = r.cloneContents();
            const e = d.createElement('div');
            e.appendChild(f);
            return e.innerHTML;
        })() : '';

        let html = '';
        let contentText = '';

        switch (mode) {
            case CAPTURE_MODES.FULL_PAGE:
                html = d.documentElement.outerHTML;
                contentText = d.body ? d.body.innerText : d.documentElement.innerText;
                break;
            case CAPTURE_MODES.SELECTION:
                html = selectionHtml;
                contentText = selectionText;
                break;
            case CAPTURE_MODES.TEXT_ONLY:
                html = '';
                contentText = extractTextContent();
                break;
            case CAPTURE_MODES.VISIBLE_AREA:
                html = getVisibleAreaHTML();
                contentText = getVisibleAreaText();
                break;
        }

        return {
            version: '0',
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
                html: html,
                selectionText: selectionText,
                selectionHtml: selectionHtml,
                textContent: contentText,
                capturedAt: new Date().toISOString(),
                captureMode: mode,
                hiddenElements: Array.from(hiddenElements)
            },
            transfer: {
                encoding: 'plain',
                chunk: { index: 0, count: 1 }
            },
            client: {
                bookmarkletVersion: SWERVE_CONFIG.version,
                language: navigator.language
            }
        };
    }

    function extractTextContent() {
        // Simple text extraction - could be enhanced with readability-like logic
        const content = document.body ? document.body.innerText : document.documentElement.innerText;
        return content.replace(/\s+/g, ' ').trim();
    }

    function getVisibleAreaHTML() {
        const viewport = {
            top: window.scrollY,
            left: window.scrollX,
            bottom: window.scrollY + window.innerHeight,
            right: window.scrollX + window.innerWidth
        };

        const elements = [];
        const walker = document.createTreeWalker(
            document.body || document.documentElement,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: function(node) {
                    const rect = node.getBoundingClientRect();
                    const absRect = {
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        bottom: rect.bottom + window.scrollY,
                        right: rect.right + window.scrollX
                    };

                    // Check if element is in viewport
                    if (absRect.bottom >= viewport.top && absRect.top <= viewport.bottom &&
                        absRect.right >= viewport.left && absRect.left <= viewport.right) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            elements.push(node);
        }

        // Create a simplified HTML structure
        const container = document.createElement('div');
        elements.forEach(el => {
            const clone = el.cloneNode(true);
            container.appendChild(clone);
        });

        return container.innerHTML;
    }

    function getVisibleAreaText() {
        const visibleHTML = getVisibleAreaHTML();
        const temp = document.createElement('div');
        temp.innerHTML = visibleHTML;
        return temp.innerText || temp.textContent || '';
    }

    /**
     * Preview UI Functions
     */
    function createPreviewModal() {
        // Remove existing modal if present
        removePreviewModal();

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = SWERVE_CONFIG.ui.backdropId;
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.id = SWERVE_CONFIG.ui.modalId;
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
            width: 90%;
            max-width: 800px;
            max-height: 90%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            display: flex;
            flex-direction: column;
        `;

        modal.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #e1e5e9;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                    📄 Swerve Preview - What will be sent?
                </h2>
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                        <input type="radio" name="captureMode" value="${CAPTURE_MODES.FULL_PAGE}" ${currentCaptureMode === CAPTURE_MODES.FULL_PAGE ? 'checked' : ''}>
                        Full Page
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                        <input type="radio" name="captureMode" value="${CAPTURE_MODES.SELECTION}" ${currentCaptureMode === CAPTURE_MODES.SELECTION ? 'checked' : ''}>
                        Selection Only
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                        <input type="radio" name="captureMode" value="${CAPTURE_MODES.TEXT_ONLY}" ${currentCaptureMode === CAPTURE_MODES.TEXT_ONLY ? 'checked' : ''}>
                        Text Only
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                        <input type="radio" name="captureMode" value="${CAPTURE_MODES.VISIBLE_AREA}" ${currentCaptureMode === CAPTURE_MODES.VISIBLE_AREA ? 'checked' : ''}>
                        Visible Area
                    </label>
                </div>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 20px;">
                <div id="swerve-content-preview" style="border: 1px solid #e1e5e9; border-radius: 4px; padding: 16px; background: #f8f9fa; font-size: 13px; line-height: 1.5; max-height: 300px; overflow-y: auto;">
                    Loading preview...
                </div>
                <div style="margin-top: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Redaction Tools</h3>
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: #666;">Click on elements in the page to hide them from capture (experimental)</p>
                    <button id="swerve-toggle-redaction" style="padding: 6px 12px; font-size: 12px; border: 1px solid #d0d7de; background: white; border-radius: 4px; cursor: pointer;">
                        Enable Element Selection
                    </button>
                    <button id="swerve-clear-redactions" style="padding: 6px 12px; font-size: 12px; border: 1px solid #d0d7de; background: white; border-radius: 4px; cursor: pointer; margin-left: 8px;">
                        Clear All
                    </button>
                </div>
            </div>
            <div style="padding: 20px; border-top: 1px solid #e1e5e9; display: flex; gap: 12px; justify-content: flex-end;">
                <button id="swerve-cancel" style="padding: 8px 16px; font-size: 14px; border: 1px solid #d0d7de; background: white; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                <button id="swerve-send" style="padding: 8px 16px; font-size: 14px; border: none; background: #0969da; color: white; border-radius: 4px; cursor: pointer;">
                    Send to Swerve ✨
                </button>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Set up event listeners
        setupModalEventListeners(modal, backdrop);
        
        // Initial preview update
        updatePreview();

        return modal;
    }

    function setupModalEventListeners(modal, backdrop) {
        // Capture mode radio buttons
        const radios = modal.querySelectorAll('input[name="captureMode"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentCaptureMode = e.target.value;
                updatePreview();
            });
        });

        // Redaction buttons
        const toggleRedactionBtn = modal.querySelector('#swerve-toggle-redaction');
        const clearRedactionsBtn = modal.querySelector('#swerve-clear-redactions');
        
        let redactionMode = false;
        
        toggleRedactionBtn.addEventListener('click', () => {
            redactionMode = !redactionMode;
            toggleRedactionBtn.textContent = redactionMode ? 'Disable Element Selection' : 'Enable Element Selection';
            toggleRedactionBtn.style.background = redactionMode ? '#fff3cd' : 'white';
            
            if (redactionMode) {
                enableRedactionMode();
            } else {
                disableRedactionMode();
            }
        });

        clearRedactionsBtn.addEventListener('click', () => {
            hiddenElements.clear();
            updateRedactionStyles();
            updatePreview();
        });

        // Action buttons
        modal.querySelector('#swerve-cancel').addEventListener('click', () => {
            removePreviewModal();
        });

        modal.querySelector('#swerve-send').addEventListener('click', async () => {
            await sendCapturedData();
        });

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                removePreviewModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                removePreviewModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    function updatePreview() {
        const previewElement = document.getElementById('swerve-content-preview');
        if (!previewElement) return;

        try {
            capturedData = collectPageData(currentCaptureMode);
            
            let previewContent = '';
            const snapshot = capturedData.snapshot;

            switch (currentCaptureMode) {
                case CAPTURE_MODES.FULL_PAGE:
                    previewContent = `
                        <strong>Page Title:</strong> ${capturedData.page.title || '(no title)'}<br>
                        <strong>URL:</strong> ${capturedData.page.url}<br>
                        <strong>Content Size:</strong> ${(snapshot.html.length / 1024).toFixed(1)} KB<br>
                        <strong>Text Length:</strong> ${snapshot.textContent.length} characters<br><br>
                        <strong>HTML Preview (first 500 chars):</strong><br>
                        <code style="display: block; background: white; padding: 8px; border-radius: 3px; white-space: pre-wrap; font-size: 11px;">${escapeHtml(snapshot.html.substring(0, 500))}${snapshot.html.length > 500 ? '...' : ''}</code>
                    `;
                    break;
                case CAPTURE_MODES.SELECTION:
                    previewContent = `
                        <strong>Selected Text:</strong> ${snapshot.selectionText.length} characters<br>
                        <strong>Selected HTML:</strong> ${(snapshot.selectionHtml.length / 1024).toFixed(1)} KB<br><br>
                        <strong>Text Preview:</strong><br>
                        <div style="background: white; padding: 8px; border-radius: 3px; max-height: 200px; overflow-y: auto;">${snapshot.selectionText || '(no selection)'}</div>
                    `;
                    break;
                case CAPTURE_MODES.TEXT_ONLY:
                    previewContent = `
                        <strong>Extracted Text:</strong> ${snapshot.textContent.length} characters<br><br>
                        <strong>Text Preview (first 500 chars):</strong><br>
                        <div style="background: white; padding: 8px; border-radius: 3px; max-height: 200px; overflow-y: auto;">${snapshot.textContent.substring(0, 500)}${snapshot.textContent.length > 500 ? '...' : ''}</div>
                    `;
                    break;
                case CAPTURE_MODES.VISIBLE_AREA:
                    previewContent = `
                        <strong>Visible Area Content:</strong> ${(snapshot.html.length / 1024).toFixed(1)} KB<br>
                        <strong>Text Length:</strong> ${snapshot.textContent.length} characters<br><br>
                        <strong>Content Preview (first 500 chars):</strong><br>
                        <div style="background: white; padding: 8px; border-radius: 3px; max-height: 200px; overflow-y: auto;">${snapshot.textContent.substring(0, 500)}${snapshot.textContent.length > 500 ? '...' : ''}</div>
                    `;
                    break;
            }

            if (hiddenElements.size > 0) {
                previewContent += `<br><strong>Hidden Elements:</strong> ${hiddenElements.size} elements will be excluded`;
            }

            previewElement.innerHTML = previewContent;
        } catch (error) {
            previewElement.innerHTML = `<span style="color: red;">Error generating preview: ${error.message}</span>`;
        }
    }

    function removePreviewModal() {
        const backdrop = document.getElementById(SWERVE_CONFIG.ui.backdropId);
        if (backdrop) {
            backdrop.remove();
        }
        disableRedactionMode();
        hiddenElements.clear();
        updateRedactionStyles();
    }

    /**
     * Redaction functionality
     */
    let redactionClickHandler = null;
    
    function enableRedactionMode() {
        disableRedactionMode(); // Clean up any existing handler
        
        redactionClickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const element = e.target;
            const selector = generateSelector(element);
            
            if (hiddenElements.has(selector)) {
                hiddenElements.delete(selector);
                element.style.outline = '';
                element.style.opacity = '';
            } else {
                hiddenElements.add(selector);
                element.style.outline = '2px solid red';
                element.style.opacity = '0.5';
            }
            
            updatePreview();
        };
        
        document.addEventListener('click', redactionClickHandler, true);
        document.body.style.cursor = 'crosshair';
    }
    
    function disableRedactionMode() {
        if (redactionClickHandler) {
            document.removeEventListener('click', redactionClickHandler, true);
            redactionClickHandler = null;
        }
        document.body.style.cursor = '';
    }
    
    function generateSelector(element) {
        if (element.id) {
            return '#' + element.id;
        }
        
        if (element.className) {
            const classes = element.className.trim().split(/\s+/);
            if (classes.length > 0 && classes[0]) {
                return element.tagName.toLowerCase() + '.' + classes[0];
            }
        }
        
        // Fallback to nth-child selector
        let path = [];
        let current = element;
        
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            
            if (current.parentNode) {
                const siblings = Array.from(current.parentNode.children);
                const index = siblings.indexOf(current);
                if (siblings.length > 1) {
                    selector += `:nth-child(${index + 1})`;
                }
            }
            
            path.unshift(selector);
            current = current.parentNode;
        }
        
        return path.join(' > ');
    }
    
    function updateRedactionStyles() {
        // Remove existing redaction styles
        document.querySelectorAll('[style*="outline: 2px solid red"]').forEach(el => {
            el.style.outline = '';
            el.style.opacity = '';
        });
        
        // Apply current redaction styles
        hiddenElements.forEach(selector => {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    element.style.outline = '2px solid red';
                    element.style.opacity = '0.5';
                }
            } catch (e) {
                // Invalid selector, remove from set
                hiddenElements.delete(selector);
            }
        });
    }

    /**
     * Data transmission
     */
    async function sendCapturedData() {
        const sendButton = document.getElementById('swerve-send');
        if (!sendButton) return;

        const originalText = sendButton.textContent;
        sendButton.textContent = 'Sending...';
        sendButton.disabled = true;

        try {
            const response = await fetch(SWERVE_CONFIG.endpoint, {
                method: 'POST',
                mode: 'cors',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(capturedData)
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            removePreviewModal();
            showToast('Swerve: Content sent successfully ✅', 'success');
            
            if (result.trackUrl) {
                setTimeout(() => {
                    showToast(`Track your submission: ${result.trackUrl}`, 'info', 5000);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Swerve upload error:', error);
            sendButton.textContent = originalText;
            sendButton.disabled = false;
            showToast(`Swerve: Failed to send - ${error.message} ❌`, 'error');
        }
    }

    /**
     * Toast notification
     */
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: white;
            z-index: 1000000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#0969da'
        };
        
        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;

        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, duration);
    }

    /**
     * Utility functions
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Main execution
     */
    try {
        // Check if we're already running
        if (document.getElementById(SWERVE_CONFIG.ui.modalId)) {
            showToast('Swerve preview is already open!', 'info');
            return;
        }

        // Create and show the preview modal
        createPreviewModal();
        
    } catch (error) {
        console.error('Swerve error:', error);
        showToast(`Swerve: Error - ${error.message} ❌`, 'error');
    }
})();