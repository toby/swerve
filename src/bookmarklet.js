/**
 * Swerve Bookmarklet - Main Entry Point
 * AI bookmarklet that ships entire pages to your brainy backend with privacy controls
 */

(async () => {
    // Prevent multiple executions
    if (window.swerveActive) {
        console.log('Swerve: Already running');
        return;
    }
    window.swerveActive = true;

    try {
        // Inline the redaction and config classes here for bookmarklet
        // This would normally be built/bundled for production

        /**
         * Simple Configuration for Bookmarklet
         */
        const getConfig = () => {
            try {
                const stored = localStorage.getItem('swerve-config');
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch (e) {
                console.warn('Swerve: Failed to load config:', e);
            }
            
            return {
                endpoint: 'https://service.example.com/ingest',
                privacy: {
                    redactionEnabled: true,
                    patterns: {
                        email: { enabled: true },
                        phone: { enabled: true },
                        ssn: { enabled: true },
                        creditCard: { enabled: true }
                    },
                    excludeSelectors: ['.swerve-no-redact', '#swerve-no-redact'],
                    visualIndicators: true
                }
            };
        };

        /**
         * Simple Redaction for Bookmarklet
         */
        const createRedactor = (config) => {
            const patterns = {
                email: {
                    enabled: config.privacy.patterns.email.enabled,
                    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                    replacement: '[EMAIL_REDACTED]'
                },
                phone: {
                    enabled: config.privacy.patterns.phone.enabled,
                    regex: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
                    replacement: '[PHONE_REDACTED]'
                },
                ssn: {
                    enabled: config.privacy.patterns.ssn.enabled,
                    regex: /\b(?:\d{3}[-.\s]?\d{2}[-.\s]?\d{4})\b/g,
                    replacement: '[SSN_REDACTED]'
                },
                creditCard: {
                    enabled: config.privacy.patterns.creditCard.enabled,
                    regex: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
                    replacement: '[CARD_REDACTED]'
                }
            };

            let redactionCount = 0;

            const redactText = (text) => {
                if (!text || typeof text !== 'string') return text;
                
                let redactedText = text;
                for (const [name, pattern] of Object.entries(patterns)) {
                    if (pattern.enabled && pattern.regex) {
                        const matches = text.match(pattern.regex);
                        if (matches) {
                            redactionCount += matches.length;
                        }
                        redactedText = redactedText.replace(pattern.regex, pattern.replacement);
                    }
                }
                return redactedText;
            };

            const shouldExcludeElement = (element) => {
                if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
                
                for (const selector of config.privacy.excludeSelectors) {
                    try {
                        if (element.matches && element.matches(selector)) {
                            return true;
                        }
                    } catch (e) {
                        // Invalid selector
                    }
                }
                return false;
            };

            const redactHTMLElement = (element) => {
                if (!element || shouldExcludeElement(element)) return;
                
                for (let node of Array.from(element.childNodes)) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const originalText = node.textContent;
                        const redactedText = redactText(originalText);
                        if (redactedText !== originalText) {
                            node.textContent = redactedText;
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        redactHTMLElement(node);
                    }
                }
            };

            const redactHTML = (htmlString) => {
                if (!htmlString || typeof htmlString !== 'string') return htmlString;
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlString;
                redactHTMLElement(tempDiv);
                return tempDiv.innerHTML;
            };

            return {
                redactText,
                redactHTML,
                getRedactionCount: () => redactionCount,
                resetCount: () => { redactionCount = 0; }
            };
        };

        /**
         * Create UI Preview
         */
        const createPreview = (data, redactor, config) => {
            // Create preview container
            const preview = document.createElement('div');
            preview.id = 'swerve-preview';
            preview.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 500px;
                background: white;
                border: 2px solid #333;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px;
                overflow: hidden;
            `;

            // Create header
            const header = document.createElement('div');
            header.style.cssText = `
                background: #333;
                color: white;
                padding: 12px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            header.innerHTML = `
                <span>Swerve Preview</span>
                <button id="swerve-close" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
            `;

            // Create content
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            `;

            // Show redaction stats
            const stats = document.createElement('div');
            stats.style.cssText = `
                background: #f5f5f5;
                padding: 8px;
                border-radius: 4px;
                margin-bottom: 12px;
                font-size: 12px;
            `;
            
            const redactionCount = redactor.getRedactionCount();
            stats.innerHTML = `
                <strong>Privacy Protection Active</strong><br>
                ${redactionCount} sensitive items redacted<br>
                Patterns: ${Object.keys(config.privacy.patterns).filter(k => config.privacy.patterns[k].enabled).join(', ')}
            `;

            // Show sample of content (first 500 chars)
            const sample = document.createElement('div');
            sample.style.cssText = `
                border: 1px solid #ddd;
                padding: 8px;
                border-radius: 4px;
                background: #fafafa;
                font-family: monospace;
                font-size: 11px;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;
            
            const sampleText = data.snapshot.html.substring(0, 500) + (data.snapshot.html.length > 500 ? '...' : '');
            sample.textContent = sampleText;

            // Add redacted content styling
            if (config.privacy.visualIndicators) {
                sample.innerHTML = sample.innerHTML.replace(
                    /\[([A-Z_]+_REDACTED)\]/g,
                    '<span style="background-color: #ffeb3b; color: #333; padding: 1px 3px; border-radius: 2px; font-weight: bold;">[$1]</span>'
                );
            }

            content.appendChild(stats);
            content.appendChild(sample);
            
            preview.appendChild(header);
            preview.appendChild(content);

            return preview;
        };

        // Get configuration
        const config = getConfig();
        
        // Show toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
        `;
        toast.textContent = 'Swerve: Processing page...';
        document.body.appendChild(toast);

        // Collect page data
        const selection = window.getSelection && window.getSelection();
        const selectionText = selection ? String(selection) : '';
        const selectionHtml = selection && selection.rangeCount ? (() => {
            const range = selection.getRangeAt(0);
            const fragment = range.cloneContents();
            const div = document.createElement('div');
            div.appendChild(fragment);
            return div.innerHTML;
        })() : '';

        const pageData = {
            version: '0',
            page: {
                url: location.href,
                title: document.title || null,
                referrer: document.referrer || null,
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
                encoding: 'plain',
                chunk: { index: 0, count: 1 }
            },
            client: {
                bookmarkletVersion: '0.2.0',
                language: navigator.language
            }
        };

        // Apply redaction if enabled
        if (config.privacy.redactionEnabled) {
            const startTime = performance.now();
            const redactor = createRedactor(config);
            
            // Redact the content
            pageData.snapshot.html = redactor.redactHTML(pageData.snapshot.html);
            pageData.snapshot.selectionText = redactor.redactText(pageData.snapshot.selectionText);
            pageData.snapshot.selectionHtml = redactor.redactHTML(pageData.snapshot.selectionHtml);
            
            const endTime = performance.now();
            const processTime = Math.round(endTime - startTime);
            
            // Add redaction info
            pageData.snapshot.redactionInfo = {
                enabled: true,
                redactionCount: redactor.getRedactionCount(),
                processTime,
                patterns: Object.keys(config.privacy.patterns).filter(k => config.privacy.patterns[k].enabled)
            };

            // Show preview if enabled
            if (config.ui && config.ui.showPreview) {
                const preview = createPreview(pageData, redactor, config);
                document.body.appendChild(preview);

                // Add close handler
                const closeBtn = document.getElementById('swerve-close');
                if (closeBtn) {
                    closeBtn.onclick = () => preview.remove();
                }

                // Auto-remove preview after 10 seconds
                setTimeout(() => {
                    if (preview.parentNode) {
                        preview.remove();
                    }
                }, 10000);
            }

            toast.textContent = `Swerve: Processed with privacy (${redactor.getRedactionCount()} redactions, ${processTime}ms)`;
        } else {
            toast.textContent = 'Swerve: Beaming page...';
        }

        // Send to endpoint
        const response = await fetch(config.endpoint, {
            method: 'POST',
            mode: 'cors',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pageData)
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        // Success
        toast.textContent = 'Swerve: Sent ✅';
        toast.style.background = '#4caf50';
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);

    } catch (error) {
        console.error('Swerve error:', error);
        
        // Show error toast
        const errorToast = document.createElement('div');
        errorToast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
        `;
        errorToast.textContent = `Swerve: Failed ❌ (${error.message})`;
        document.body.appendChild(errorToast);

        setTimeout(() => {
            if (errorToast.parentNode) {
                errorToast.remove();
            }
        }, 5000);
    } finally {
        // Clean up
        setTimeout(() => {
            window.swerveActive = false;
        }, 1000);
    }
})();