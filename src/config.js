/**
 * Configuration Module for Swerve
 * Handles user preferences and redaction settings
 */

class SwerveConfig {
    constructor() {
        this.storageKey = 'swerve-config';
        this.defaultConfig = {
            endpoint: 'https://service.example.com/ingest',
            privacy: {
                redactionEnabled: true,
                patterns: {
                    email: { enabled: true, custom: false },
                    phone: { enabled: true, custom: false },
                    ssn: { enabled: true, custom: false },
                    creditCard: { enabled: true, custom: false }
                },
                excludeSelectors: [
                    '.swerve-no-redact',
                    '#swerve-no-redact',
                    '.swerve-preview'
                ],
                visualIndicators: true
            },
            capture: {
                scope: 'full', // 'full', 'selection', 'above-fold'
                includeStyles: false,
                compression: true
            },
            ui: {
                showPreview: true,
                showStats: true,
                position: 'top-right'
            }
        };
        
        this.config = this.loadConfig();
    }

    /**
     * Load configuration from localStorage
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return this.mergeConfig(this.defaultConfig, parsed);
            }
        } catch (e) {
            console.warn('Swerve: Failed to load config from localStorage:', e);
        }
        
        return { ...this.defaultConfig };
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (e) {
            console.warn('Swerve: Failed to save config to localStorage:', e);
            return false;
        }
    }

    /**
     * Deep merge configuration objects
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const [key, value] of Object.entries(userConfig)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                merged[key] = this.mergeConfig(defaultConfig[key] || {}, value);
            } else {
                merged[key] = value;
            }
        }
        
        return merged;
    }

    /**
     * Get current configuration
     */
    get() {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    update(updates) {
        this.config = this.mergeConfig(this.config, updates);
        return this.saveConfig();
    }

    /**
     * Reset to default configuration
     */
    reset() {
        this.config = { ...this.defaultConfig };
        return this.saveConfig();
    }

    /**
     * Get redaction configuration for SwerveRedaction
     */
    getRedactionConfig() {
        const privacy = this.config.privacy;
        
        return {
            patterns: {
                email: {
                    enabled: privacy.patterns.email.enabled,
                    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                    replacement: '[EMAIL_REDACTED]'
                },
                phone: {
                    enabled: privacy.patterns.phone.enabled,
                    regex: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
                    replacement: '[PHONE_REDACTED]'
                },
                ssn: {
                    enabled: privacy.patterns.ssn.enabled,
                    regex: /\b(?:\d{3}[-.\s]?\d{2}[-.\s]?\d{4})\b/g,
                    replacement: '[SSN_REDACTED]'
                },
                creditCard: {
                    enabled: privacy.patterns.creditCard.enabled,
                    regex: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
                    replacement: '[CARD_REDACTED]'
                }
            },
            excludeSelectors: privacy.excludeSelectors,
            visualIndicator: {
                enabled: privacy.visualIndicators,
                className: 'swerve-redacted',
                style: 'background-color: #ffeb3b; color: #333; padding: 2px 4px; border-radius: 3px; font-weight: bold;'
            }
        };
    }

    /**
     * Add custom redaction pattern
     */
    addCustomPattern(name, regex, replacement) {
        if (!this.config.privacy.patterns[name]) {
            this.config.privacy.patterns[name] = {
                enabled: true,
                custom: true
            };
        }
        
        return this.saveConfig();
    }

    /**
     * Remove custom redaction pattern
     */
    removeCustomPattern(name) {
        if (this.config.privacy.patterns[name] && this.config.privacy.patterns[name].custom) {
            delete this.config.privacy.patterns[name];
            return this.saveConfig();
        }
        return false;
    }

    /**
     * Add exclude selector
     */
    addExcludeSelector(selector) {
        if (!this.config.privacy.excludeSelectors.includes(selector)) {
            this.config.privacy.excludeSelectors.push(selector);
            return this.saveConfig();
        }
        return false;
    }

    /**
     * Remove exclude selector
     */
    removeExcludeSelector(selector) {
        const index = this.config.privacy.excludeSelectors.indexOf(selector);
        if (index > -1) {
            this.config.privacy.excludeSelectors.splice(index, 1);
            return this.saveConfig();
        }
        return false;
    }

    /**
     * Export configuration for sharing/backup
     */
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON string
     */
    import(configJson) {
        try {
            const imported = JSON.parse(configJson);
            this.config = this.mergeConfig(this.defaultConfig, imported);
            return this.saveConfig();
        } catch (e) {
            console.error('Swerve: Failed to import config:', e);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SwerveConfig;
}