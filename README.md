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

- **Consent-first philosophy**: the bookmarklet only sends the current page when you click it.
- **Scope control**: configurable to send selection only, above-the-fold only, or full DOM.
- **Privacy protection**: built-in client-side redaction for emails, phone numbers, SSNs, and credit cards.
- **DOM exclusion**: exclude specific elements from redaction using CSS selectors.
- **Visual indicators**: optional preview showing what content was redacted.
- **Performance optimized**: redaction processing typically <200ms overhead.
- **CSP-aware**: tries fetch; if blocked, gracefully fails with guidance.
- **No cookies sent**: use a bearer token query param or header you control.

### Privacy Features (New!)

Swerve now includes comprehensive client-side privacy protection:

- 🔒 **Automatic redaction** of sensitive data (emails, phones, SSNs, credit cards)
- 🎯 **Configurable patterns** - enable/disable specific redaction types
- 🚫 **DOM exclusion** - protect specific page elements with CSS selectors
- 👁️ **Visual preview** - see what content will be redacted before sending
- ⚡ **High performance** - minimal processing overhead (<200ms typical)
- 🛡️ **Client-side only** - sensitive data never leaves your browser unprotected

Configure privacy settings at `src/config.html` or see `PRIVACY.md` for detailed documentation.

## Installing the bookmarklet

### Quick Install (Recommended)

1. Open `install.html` in your browser for an easy drag-and-drop installation
2. Configure your endpoint and privacy settings at `src/config.html`
3. Drag the generated bookmarklet to your bookmarks bar

### Manual Install (Legacy)

We’ll ship a generated link in a later commit. For now:
- Create a new bookmark called “Swerve.”
- Paste this as the URL (placeholder, not final endpoint):

javascript:(async()=>{try{const E="https://service.example.com/ingest";const m={v:"0.1.0"};const d=document;const s=window.getSelection&&window.getSelection();const selectionText=s?String(s):"";const selectionHtml=s&&s.rangeCount?(()=>{const r=s.getRangeAt(0);const f=r.cloneContents();const e=d.createElement("div");e.appendChild(f);return e.innerHTML})():"";const payload={version:"0",page:{url:location.href,title:d.title||null,referrer:d.referrer||document.referrer||null,userAgent:navigator.userAgent,viewport:{width:window.innerWidth,height:window.innerHeight},scroll:{x:window.scrollX,y:window.scrollY}},snapshot:{html:d.documentElement.outerHTML,selectionText,selectionHtml,capturedAt:new Date().toISOString()},transfer:{encoding:"plain",chunk:{index:0,count:1}},client:{bookmarkletVersion:m.v,language:navigator.language}};const res=await fetch(E,{method:"POST",mode:"cors",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(!res.ok)throw new Error("upload failed" );alert("Swerve: sent ✅")}catch(e){console.error(e);alert("Swerve: failed ❌")}})();

Replace `https://service.example.com/ingest` with your real endpoint.

**⚠️ Important**: The manual version above does not include privacy protection. Use the build system in `src/` for full functionality with redaction features.

## Roadmap

- ✅ **Privacy & Redaction System**: Client-side redaction of sensitive data with configurable patterns
- ✅ **Configuration Interface**: Simple UI for managing redaction settings and DOM exclusions
- ✅ **Visual Preview**: On-page preview showing redacted content before transmission
- ✅ **Performance Optimized**: <200ms processing overhead with redaction enabled
- Generator: produce a minified bookmarklet from /src and inject the configured endpoint + token
- Optional compression (lz-string) and chunking
- Readability-like text extraction mode
- On-page preview of what will be sent (enhanced version)
- Per-site allowlist / denylist
- Tiny dashboard that shows job status after send

## Developer notes

- Bookmarklet size: keep under ~2–4 KB unminified for legibility (we’ll ship a minified version later).
- CSP realities: some sites block inline script execution via strict CSP. In those cases, a bookmarklet may not run. We’ll document fallbacks and a helper page that can open the current tab’s URL in a proxy capture if needed.
- Prior art: great inspiration from the bookmarklet ecosystem—e.g., WhatFont, perfmap, bullshit.js, and tools like bookmarkleter for building bookmarklets.

### Source Files

- `src/bookmarklet.js` - Main bookmarklet with privacy features
- `src/redaction.js` - Privacy and redaction engine
- `src/config.js` - Configuration management system
- `src/config.html` - Browser-based configuration interface
- `src/build.js` - Build system for generating minified bookmarklet
- `src/test-redaction.js` - Test suite for privacy features
- `PRIVACY.md` - Comprehensive privacy documentation
- `install.html` - Generated installation page

## Contributing

Issues and PRs welcome. Please include a short description, repro (if a bug), and screenshots for UX tweaks.

## License

MIT

# Swerve

Grab those web pages and give them to AI.
