/**
 * Data Privacy and Redaction Module for Swerve
 * Handles client-side redaction of sensitive information before transmission
 */

class SwerveRedaction {
    constructor(config = {}) {
        this.config = {
            // Default redaction patterns
            patterns: {
                email: {
                    enabled: true,
                    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                    replacement: '[EMAIL_REDACTED]'
                },
                phone: {
                    enabled: true,
                    regex: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
                    replacement: '[PHONE_REDACTED]'
                },
                ssn: {
                    enabled: true,
                    regex: /\b(?:\d{3}[-.\s]?\d{2}[-.\s]?\d{4})\b/g,
                    replacement: '[SSN_REDACTED]'
                },
                creditCard: {
                    enabled: true,
                    regex: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
                    replacement: '[CARD_REDACTED]'
                }
            },
            // DOM elements to exclude from redaction (by class or id)
            excludeSelectors: [
                '.swerve-no-redact',
                '#swerve-no-redact',
                '.swerve-preview'
            ],
            // Visual indicator for redacted content
            visualIndicator: {
                enabled: true,
                className: 'swerve-redacted',
                style: 'background-color: #ffeb3b; color: #333; padding: 2px 4px; border-radius: 3px; font-weight: bold;'
            },
            ...config
        };

        this.redactionCount = 0;
        this.redactionLog = [];
    }

    /**
     * Redact sensitive information from text content
     */
    redactText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let redactedText = text;
        this.redactionCount = 0;

        for (const [patternName, pattern] of Object.entries(this.config.patterns)) {
            if (pattern.enabled && pattern.regex) {
                const matches = text.match(pattern.regex);
                if (matches) {
                    this.redactionCount += matches.length;
                    this.redactionLog.push({
                        pattern: patternName,
                        count: matches.length,
                        timestamp: new Date().toISOString()
                    });
                }
                redactedText = redactedText.replace(pattern.regex, pattern.replacement);
            }
        }

        return redactedText;
    }

    /**
     * Redact sensitive information from HTML content while preserving structure
     */
    redactHTML(htmlString) {
        if (!htmlString || typeof htmlString !== 'string') {
            return htmlString;
        }

        // Create a temporary DOM for processing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        // Redact text nodes while avoiding excluded elements
        this.redactHTMLElement(tempDiv);

        return tempDiv.innerHTML;
    }

    /**
     * Recursively redact text nodes in DOM element
     */
    redactHTMLElement(element) {
        if (!element) return;

        // Check if this element should be excluded from redaction
        if (this.shouldExcludeElement(element)) {
            return;
        }

        // Process child nodes
        for (let node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
                // Redact text content
                const originalText = node.textContent;
                const redactedText = this.redactText(originalText);
                if (redactedText !== originalText) {
                    node.textContent = redactedText;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Recursively process child elements
                this.redactHTMLElement(node);
            }
        }
    }

    /**
     * Check if an element should be excluded from redaction
     */
    shouldExcludeElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Check against exclude selectors
        for (const selector of this.config.excludeSelectors) {
            try {
                if (element.matches && element.matches(selector)) {
                    return true;
                }
            } catch (e) {
                // Invalid selector, continue
            }
        }

        return false;
    }

    /**
     * Create a visual preview of redacted content
     */
    createRedactedPreview(htmlString) {
        if (!this.config.visualIndicator.enabled) {
            return this.redactHTML(htmlString);
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        this.createVisualRedactionInElement(tempDiv);

        return tempDiv.innerHTML;
    }

    /**
     * Apply visual indicators to redacted content
     */
    createVisualRedactionInElement(element) {
        if (!element || this.shouldExcludeElement(element)) return;

        for (let node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
                const originalText = node.textContent;
                let modifiedHTML = originalText;

                // Apply visual redaction for each pattern
                for (const [patternName, pattern] of Object.entries(this.config.patterns)) {
                    if (pattern.enabled && pattern.regex) {
                        modifiedHTML = modifiedHTML.replace(pattern.regex, (match) => {
                            return `<span class="${this.config.visualIndicator.className}" style="${this.config.visualIndicator.style}" title="Redacted ${patternName}: ${match}">${pattern.replacement}</span>`;
                        });
                    }
                }

                if (modifiedHTML !== originalText) {
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = modifiedHTML;
                    node.parentNode.replaceChild(wrapper, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                this.createVisualRedactionInElement(node);
            }
        }
    }

    /**
     * Process page data before transmission
     */
    processPageData(pageData) {
        const startTime = performance.now();
        
        const processedData = {
            ...pageData,
            snapshot: {
                ...pageData.snapshot,
                html: this.redactHTML(pageData.snapshot.html),
                selectionText: this.redactText(pageData.snapshot.selectionText || ''),
                selectionHtml: this.redactHTML(pageData.snapshot.selectionHtml || ''),
                redactionInfo: {
                    enabled: true,
                    patternsUsed: Object.keys(this.config.patterns).filter(key => this.config.patterns[key].enabled),
                    redactionCount: this.redactionCount,
                    redactionLog: this.redactionLog,
                    processTime: 0 // Will be set below
                }
            }
        };

        const endTime = performance.now();
        processedData.snapshot.redactionInfo.processTime = Math.round(endTime - startTime);

        return processedData;
    }

    /**
     * Get redaction statistics
     */
    getRedactionStats() {
        return {
            totalRedactions: this.redactionCount,
            redactionLog: this.redactionLog,
            enabledPatterns: Object.keys(this.config.patterns).filter(key => this.config.patterns[key].enabled)
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            patterns: {
                ...this.config.patterns,
                ...(newConfig.patterns || {})
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SwerveRedaction;
}