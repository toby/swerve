/**
 * Site Allowlist/Denylist functionality for Swerve bookmarklet
 * Manages which sites can and cannot be captured
 */

const SwerveAllowlist = {
    // Storage keys
    STORAGE_KEYS: {
        ALLOWLIST: 'swerve_allowlist',
        DENYLIST: 'swerve_denylist',
        MODE: 'swerve_mode' // 'allowlist', 'denylist', or 'disabled'
    },

    // Default mode is disabled (allow all sites)
    defaultMode: 'disabled',

    /**
     * Get current allowlist/denylist mode
     */
    getMode: function() {
        try {
            return localStorage.getItem(this.STORAGE_KEYS.MODE) || this.defaultMode;
        } catch (e) {
            return this.defaultMode;
        }
    },

    /**
     * Set current allowlist/denylist mode
     */
    setMode: function(mode) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.MODE, mode);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get list of patterns from storage
     */
    getList: function(type) {
        try {
            const key = type === 'allowlist' ? this.STORAGE_KEYS.ALLOWLIST : this.STORAGE_KEYS.DENYLIST;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Save list of patterns to storage
     */
    saveList: function(type, patterns) {
        try {
            const key = type === 'allowlist' ? this.STORAGE_KEYS.ALLOWLIST : this.STORAGE_KEYS.DENYLIST;
            localStorage.setItem(key, JSON.stringify(patterns));
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Add pattern to a list
     */
    addPattern: function(type, pattern) {
        const list = this.getList(type);
        if (!list.includes(pattern)) {
            list.push(pattern);
            return this.saveList(type, list);
        }
        return true;
    },

    /**
     * Remove pattern from a list
     */
    removePattern: function(type, pattern) {
        const list = this.getList(type);
        const index = list.indexOf(pattern);
        if (index > -1) {
            list.splice(index, 1);
            return this.saveList(type, list);
        }
        return true;
    },

    /**
     * Test if a URL matches a pattern
     * Supports:
     * - Exact domain matching: example.com
     * - Wildcard subdomains: *.example.com
     * - Path wildcards: example.com/path/*
     * - Basic regex patterns: /pattern/flags
     */
    matchesPattern: function(url, pattern) {
        try {
            // Parse the URL
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const fullUrl = url;

            // Handle regex patterns
            if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
                const lastSlash = pattern.lastIndexOf('/');
                const regexPattern = pattern.slice(1, lastSlash);
                const flags = pattern.slice(lastSlash + 1);
                const regex = new RegExp(regexPattern, flags);
                return regex.test(fullUrl);
            }

            // Handle wildcard patterns
            if (pattern.includes('*')) {
                // Convert wildcards to regex
                const regexPattern = pattern
                    .replace(/\./g, '\\.')
                    .replace(/\*/g, '.*');
                
                // Test against hostname for domain patterns
                if (!pattern.includes('/')) {
                    return new RegExp('^' + regexPattern + '$', 'i').test(hostname);
                }
                
                // Test against full URL for path patterns
                return new RegExp('^https?://' + regexPattern + '$', 'i').test(fullUrl);
            }

            // Exact domain matching
            if (!pattern.includes('/')) {
                return hostname.toLowerCase() === pattern.toLowerCase();
            }

            // URL path matching
            return fullUrl.toLowerCase().startsWith(pattern.toLowerCase());

        } catch (e) {
            return false;
        }
    },

    /**
     * Check if current URL is allowed for capture
     */
    isAllowed: function(url) {
        const mode = this.getMode();
        
        if (mode === 'disabled') {
            return { allowed: true, reason: null };
        }

        if (mode === 'allowlist') {
            const allowlist = this.getList('allowlist');
            if (allowlist.length === 0) {
                return { allowed: true, reason: null };
            }
            
            for (const pattern of allowlist) {
                if (this.matchesPattern(url, pattern)) {
                    return { allowed: true, reason: null };
                }
            }
            return { allowed: false, reason: 'Site not in allowlist' };
        }

        if (mode === 'denylist') {
            const denylist = this.getList('denylist');
            for (const pattern of denylist) {
                if (this.matchesPattern(url, pattern)) {
                    return { allowed: false, reason: 'Site is blocked by denylist' };
                }
            }
            return { allowed: true, reason: null };
        }

        return { allowed: true, reason: null };
    }
};