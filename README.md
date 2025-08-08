# Swerve — an AI bookmarklet that ships entire pages to your brainy backend

What if you could beam any web page into an AI service with a single click? Swerve is a tiny bookmarklet that grabs the page you’re looking at (DOM, meta, selection, and more) and posts it to a web endpoint for processing—summaries, insights, automations, you name it.

Swerve is for folks who want zero-install, works-everywhere capture that plays nicely with CSP, privacy, and the realities of the modern web.

## Why a bookmarklet?

- Zero install friction: drag to your bookmarks bar, click to run—works on Chrome, Safari, Firefox, Edge.
- Page-native context: runs in the page, has direct access to the live DOM and selection.
- IT-friendly: no extensions, no store approval, easy to audit (it’s just JavaScript).

## What gets captured

- HTML snapshot: document.documentElement.outerHTML
- URL, title, referrer, viewport size, user agent
- Selection (if any): text + minimal HTML

- Scroll position and visible region
- Timing hints: when capture started/finished

Optional (opt-in, may be blocked by CSP):

- Inline style snapshot (computed styles for visible elements)
- Text-only extraction (readability-like heuristic)

What we do NOT do by default:

- Fetch cross-origin resources
- Walk iframes from other origins
- Exfiltrate cookies or storage

## Architecture at a glance

Client (bookmarklet)
- Collect page snapshot and metadata
- Compress (optional) and chunk if needed
- POST to a configurable endpoint

Server (your AI web service)
- Accepts JSON or multipart chunks
- Reassembles snapshots
- Stores + enqueues for AI pipelines
- Returns a receipt (job id / link)

ASCII sketch

Browser ──(bookmarklet)──▶ POST /ingest
	│                           │
	│                           ├─▶ Storage (blob + meta)

	│                           └─▶ Queue → Workers → AI
	│
	└──◀── receipt (jobId, trackUrl)

## Data contract (v0)

POST /ingest
Content-Type: application/json

{
	"version": "0",
	"page": {
		"url": "https://example.com/article",
		"title": "Example Article",
		"referrer": "https://news.ycombinator.com/",
		"userAgent": "...",
		"viewport": { "width": 1440, "height": 900 },
		"scroll": { "x": 0, "y": 842 }
	},
	"snapshot": {
		"html": "<html>...</html>",
		"selectionText": "...optional...",
		"selectionHtml": "...optional...",
		"capturedAt": "2025-08-08T12:34:56.000Z"
	},
	"transfer": {
		"encoding": "plain|lz",
		"chunk": { "index": 0, "count": 1 }
	},
	"client": {
		"bookmarkletVersion": "0.1.0",
		"language": "en-US"
	}
}

Response 202 Accepted
{
	"jobId": "job_abc123",
	"trackUrl": "https://service.example.com/jobs/job_abc123"
}

Notes
- Keep CORS open for your origin policy. The server must set Access-Control-Allow-Origin: * (or your host) and allow POST/JSON + optional compression.
- For very large pages (>1–2 MB), prefer chunking (sequential POSTs with the same job token or session id).

## Bookmarklet behavior choices

- Transport: fetch() with CORS and keepalive true; fallback to navigator.sendBeacon for small payloads; optional form POST to a hidden iframe for hard CSP sites.
- Compression: lz-string inline (fast, browser-only) to reduce payload size by ~30–60% on text-heavy pages.
- Chunking: 256–512 KB chunks with ordered dispatch and finalization call.
- Minimal UI: a tiny toast that says “Beaming page to Swerve…” with success/failure.

## Security and privacy

- Consent-first philosophy: the bookmarklet only sends the current page when you click it.
- Scope control: configurable to send selection only, above-the-fold only, or full DOM.
- Redaction hooks: client-side replacers for emails, numbers, patterns before upload.
- CSP-aware: tries fetch; if blocked, gracefully fails with guidance.
- No cookies sent: use a bearer token query param or header you control.

## Installing the bookmarklet

### Option 1: Build from source (recommended)
```bash
npm run build
```
Then copy the generated bookmarklet and paste it as a bookmark URL.

### Option 2: Use development version  
For quick testing, create a new bookmark called "Swerve" with the URL from `npm run build` output.

**Important:** Replace `https://service.example.com/ingest` with your real endpoint before using.

## Compression Features

Swerve now includes **LZ-string compression** that automatically reduces payload sizes:

- **Smart compression**: Only compresses payloads > 1KB where compression is beneficial  
- **High efficiency**: Achieves 30-86% size reduction depending on content type
- **Fast performance**: Compression overhead typically < 20ms
- **Automatic fallback**: Falls back to uncompressed if compression doesn't help

### Compression Benchmarks

| Content Type | Original Size | Compressed Size | Reduction | Time |
|--------------|---------------|-----------------|-----------|------|
| Small HTML (1KB) | 3.3 KB | 2.4 KB | 27% | 2ms |
| Medium HTML (10KB) | 12.4 KB | 4.7 KB | 62% | 4ms |  
| Large HTML (50KB) | 52.7 KB | 9.8 KB | 81% | 11ms |
| Repetitive Content | 22.5 KB | 4.7 KB | 79% | 4ms |

Run your own benchmarks: `npm run benchmark`

### Server-Side Decompression

The server can detect compressed payloads and decompress them:

**Node.js/Express example:**
```javascript
app.use('/ingest', (req, res, next) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        let payload = JSON.parse(body);
        
        // Check for compression
        if (payload.transfer?.encoding === 'lz') {
            const decompressed = LZString.decompress(body);
            payload = JSON.parse(decompressed);
        }
        
        req.swervePayload = payload;
        next();
    });
});
```

**Python/Flask example:**
```python
from lzstring import LZString

@app.route('/ingest', methods=['POST'])
def handle_ingest():
    payload = request.get_json()
    
    if payload.get('transfer', {}).get('encoding') == 'lz':
        raw_body = request.get_data(as_text=True)
        decompressed = LZString().decompress(raw_body)
        payload = json.loads(decompressed)
    
    # Process payload...
    return {'jobId': generate_id(), 'status': 'accepted'}
```

See `examples/` directory for complete server implementations.

We’ll ship a generated link in a later commit. For now:
- Create a new bookmark called “Swerve.”
- Paste this as the URL (placeholder, not final endpoint):

javascript:(async()=>{try{const E="https://service.example.com/ingest";const m={v:"0.1.0"};const d=document;const s=window.getSelection&&window.getSelection();const selectionText=s?String(s):"";const selectionHtml=s&&s.rangeCount?(()=>{const r=s.getRangeAt(0);const f=r.cloneContents();const e=d.createElement("div");e.appendChild(f);return e.innerHTML})():"";const payload={version:"0",page:{url:location.href,title:d.title||null,referrer:d.referrer||document.referrer||null,userAgent:navigator.userAgent,viewport:{width:window.innerWidth,height:window.innerHeight},scroll:{x:window.scrollX,y:window.scrollY}},snapshot:{html:d.documentElement.outerHTML,selectionText,selectionHtml,capturedAt:new Date().toISOString()},transfer:{encoding:"plain",chunk:{index:0,count:1}},client:{bookmarkletVersion:m.v,language:navigator.language}};const res=await fetch(E,{method:"POST",mode:"cors",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(!res.ok)throw new Error("upload failed" );alert("Swerve: sent ✅")}catch(e){console.error(e);alert("Swerve: failed ❌")}})();

Replace https://service.example.com/ingest with your real endpoint.

## Roadmap

- [x] **Optional compression (lz-string)** - ✅ Implemented with 30-86% size reduction
- [x] **Generator: produce minified bookmarklet from /src** - ✅ Available via `npm run build`  
- [ ] Chunking for very large pages (>1MB)
- [ ] Readability-like text extraction mode
- [ ] On-page preview of what will be sent
- [ ] Per-site allowlist / denylist
- [ ] Tiny dashboard that shows job status after send
- [ ] Configuration UI for compression settings

## Developer notes

- **Bookmarklet size**: Current build is ~4.5KB minified with compression support. Target is under 2–4KB for legibility in unminified form.
- **Project structure**:
  - `src/swerve.js` - Main bookmarklet source code with compression
  - `src/build.js` - Build script to generate minified bookmarklet
  - `test/benchmark.js` - Compression performance benchmarks  
  - `test/compression-test.html` - Interactive testing page
  - `examples/` - Server-side integration examples
- **CSP realities**: Some sites block inline script execution via strict CSP. In those cases, a bookmarklet may not run. We'll document fallbacks and a helper page that can open the current tab's URL in a proxy capture if needed.
- **Compression**: LZ-string implementation is inlined in the bookmarklet to keep it self-contained. Smart compression only activates for payloads >1KB where it provides >10% reduction.
- **Prior art**: Great inspiration from the bookmarklet ecosystem—e.g., WhatFont, perfmap, bullshit.js, and tools like bookmarkleter for building bookmarklets.

### Development workflow
```bash
npm run build        # Generate bookmarklet
npm run benchmark    # Test compression performance  
npm run serve-test   # Serve test page at localhost:8080
npm run example-node # Run Node.js server example
```

- Bookmarklet size: keep under ~2–4 KB unminified for legibility (we’ll ship a minified version later).
- CSP realities: some sites block inline script execution via strict CSP. In those cases, a bookmarklet may not run. We’ll document fallbacks and a helper page that can open the current tab’s URL in a proxy capture if needed.
- Prior art: great inspiration from the bookmarklet ecosystem—e.g., WhatFont, perfmap, bullshit.js, and tools like bookmarkleter for building bookmarklets.

## Contributing

Issues and PRs welcome. Please include a short description, repro (if a bug), and screenshots for UX tweaks.

## License

MIT

# Swerve

Grab those web pages and give them to AI.
