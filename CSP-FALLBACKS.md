# Content Security Policy (CSP) Fallbacks for Swerve

## Overview

Content Security Policy (CSP) is a security feature implemented by web browsers to help prevent cross-site scripting (XSS) and other injection attacks. However, strict CSP policies can sometimes block legitimate bookmarklet functionality. This document describes how Swerve handles CSP restrictions and provides fallback mechanisms.

## How CSP Affects Bookmarklets

### Common CSP Restrictions that Impact Swerve:

1. **`connect-src` restrictions** - Block fetch/XHR requests to external domains
2. **`script-src` restrictions** - Block inline script execution (bookmarklets)
3. **`form-action` restrictions** - Block form submissions to external domains
4. **`frame-src` restrictions** - Block iframe creation for fallback methods

### CSP Policies That Commonly Cause Issues:

```csp
# Blocks all external connections
connect-src 'self'

# Blocks inline scripts (prevents bookmarklet execution entirely)
script-src 'self'

# Blocks form submissions to external domains
form-action 'self'

# Very restrictive - blocks most bookmarklet functionality
default-src 'self'; script-src 'none'
```

## Swerve's CSP Fallback Strategy

Swerve implements a three-tier fallback strategy to maximize compatibility:

### Tier 1: Fetch API (Primary Method)
- **Method**: `fetch()` with CORS
- **Advantages**: Full response handling, modern API
- **CSP Requirements**: `connect-src` must allow target endpoint
- **Typical Error**: `TypeError: Failed to fetch`

### Tier 2: Beacon API (First Fallback)
- **Method**: `navigator.sendBeacon()`
- **Advantages**: Fire-and-forget, designed for analytics
- **CSP Requirements**: `connect-src` must allow target endpoint
- **Limitations**: No response data, size limits (~64KB)
- **Typical Error**: Silently fails (returns `false`)

### Tier 3: Form POST via Hidden Iframe (Final Fallback)
- **Method**: Hidden iframe with form submission
- **Advantages**: Works with looser CSP policies
- **CSP Requirements**: `form-action` must allow target endpoint
- **Limitations**: No response data, requires DOM manipulation
- **Typical Error**: Iframe load failures

## CSP Detection Logic

Swerve automatically detects CSP-related failures using the following heuristics:

```javascript
function isCSPError(error) {
    const message = error.message.toLowerCase();
    return message.includes('csp') || 
           message.includes('content security policy') ||
           message.includes('blocked by content security policy') ||
           (error.name === 'TypeError' && message.includes('failed to fetch'));
}
```

## User Guidance for CSP Issues

When all fallback methods fail due to CSP restrictions, Swerve provides clear guidance:

### Automated Message
```
This site's Content Security Policy blocks the bookmarklet.
```

### Suggested Alternatives
1. **Use the Swerve Helper Page** - Proxy capture via separate page
2. **Copy URL manually** - Paste into Swerve service directly  
3. **Contact site administrator** - Request CSP policy adjustment

## Helper Page Fallback

When the bookmarklet cannot run at all due to strict CSP (e.g., `script-src 'self'`), Swerve provides a helper page that can proxy-capture content.

### How It Works:
1. User navigates to the Swerve helper page
2. Pastes the URL of the target page
3. Helper page requests content via server-side proxy
4. Proxy fetches page content (bypassing client-side CSP)
5. Helper page sends captured content to Swerve endpoint

### Benefits:
- Bypasses client-side CSP restrictions
- Works even when bookmarklet execution is completely blocked
- Provides same data structure as direct bookmarklet capture

### Limitations:
- Requires additional user steps
- May miss dynamic content that loads after initial page render
- Requires server-side proxy infrastructure

## Testing CSP Compatibility

### Test Sites with Known Strict CSP:

1. **GitHub** - Restrictive `connect-src` and `script-src`
2. **Google Services** - Various CSP restrictions
3. **Banking Sites** - Very strict CSP policies
4. **Corporate Intranets** - Often have custom restrictive policies

### Testing Approach:

```javascript
// Test CSP detection
const testErrors = [
    new Error('Content Security Policy'),
    new TypeError('Failed to fetch'),
    new Error('blocked by CSP')
];

testErrors.forEach(error => {
    console.log(`${error.message}: ${isCSPError(error)}`);
});

// Test fallback chain
async function testFallbacks(payload) {
    const methods = [fetchMethod, beaconMethod, formPostMethod];
    for (const method of methods) {
        try {
            return await method(payload);
        } catch (error) {
            console.log('Method failed, trying next:', error.message);
        }
    }
    throw new Error('All methods failed');
}
```

## Implementation Notes

### Performance Considerations:
- Fallback detection adds ~100-200ms overhead per failed method
- Form POST fallback requires DOM manipulation (heavier)
- Helper page requires additional round-trip to proxy service

### Security Considerations:
- Helper page proxy must validate and sanitize requests
- Rate limiting essential to prevent abuse
- Consider authentication for proxy access
- Log proxy requests for monitoring

### Browser Compatibility:
- `fetch()`: All modern browsers
- `sendBeacon()`: All modern browsers
- Form POST: Universal support
- Helper page: Works in all browsers with JavaScript

## Best Practices

### For Swerve Users:
1. Try the bookmarklet first (fastest method)
2. If blocked, use the helper page
3. Bookmark both the bookmarklet and helper page
4. Contact site administrators about CSP policies if needed

### For Site Administrators:
1. Consider allowing specific domains in CSP for productivity tools
2. Use `'unsafe-inline'` cautiously for script-src if bookmarklets are needed
3. Consider `'unsafe-eval'` alternatives for connect-src restrictions
4. Implement CSP reporting to understand impact on users

### CSP-Friendly Configurations:

```csp
# Allow Swerve endpoint specifically
connect-src 'self' https://your-swerve-endpoint.com;

# Allow bookmarklets while maintaining security
script-src 'self' 'unsafe-inline';

# Allow form posts to Swerve
form-action 'self' https://your-swerve-endpoint.com;
```

## Troubleshooting

### Common Issues and Solutions:

**Issue**: Bookmarklet doesn't run at all
- **Cause**: `script-src` blocks inline scripts
- **Solution**: Use helper page

**Issue**: "Failed to fetch" error
- **Cause**: `connect-src` blocks external requests
- **Solution**: Automatic fallback to beacon/form POST

**Issue**: All methods fail silently
- **Cause**: Very restrictive CSP with multiple blocks
- **Solution**: Helper page or manual copy-paste

**Issue**: Partial data captured
- **Cause**: Some CSP directives block style/script parsing
- **Solution**: Expected behavior - Swerve captures what's available

### Debug Commands:

```javascript
// Check current page CSP
const cspMeta = document.querySelector('meta[http-equiv*="Content-Security-Policy"]');
console.log('CSP Meta:', cspMeta?.content);

// Test connectivity
fetch('https://your-swerve-endpoint.com/health')
    .then(() => console.log('Endpoint reachable'))
    .catch(e => console.log('CSP or network block:', e.message));
```

## Future Enhancements

### Planned Improvements:
1. **CSP Reporting Integration** - Use CSP violation reports for better detection
2. **Automatic Endpoint Testing** - Pre-flight checks for CSP compatibility
3. **Browser Extension Alternative** - For sites with very strict CSP
4. **WebSocket Fallback** - Additional transport method for real-time sites

### Community Contributions:
- CSP test cases for additional sites
- Improved CSP detection heuristics  
- Alternative fallback methods
- Performance optimizations

---

For more information about CSP and web security, see:
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Level 3 Specification](https://www.w3.org/TR/CSP3/)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)