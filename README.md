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

## Installing the bookmarklet (manual)

We’ll ship a generated link in a later commit. For now:
- Create a new bookmark called “Swerve.”
- Paste this as the URL (placeholder, not final endpoint):

javascript:(async()=>{try{const E="https://service.example.com/ingest";const m={v:"0.1.0"};const d=document;const s=window.getSelection&&window.getSelection();const selectionText=s?String(s):"";const selectionHtml=s&&s.rangeCount?(()=>{const r=s.getRangeAt(0);const f=r.cloneContents();const e=d.createElement("div");e.appendChild(f);return e.innerHTML})():"";const payload={version:"0",page:{url:location.href,title:d.title||null,referrer:d.referrer||document.referrer||null,userAgent:navigator.userAgent,viewport:{width:window.innerWidth,height:window.innerHeight},scroll:{x:window.scrollX,y:window.scrollY}},snapshot:{html:d.documentElement.outerHTML,selectionText,selectionHtml,capturedAt:new Date().toISOString()},transfer:{encoding:"plain",chunk:{index:0,count:1}},client:{bookmarkletVersion:m.v,language:navigator.language}};const res=await fetch(E,{method:"POST",mode:"cors",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(!res.ok)throw new Error("upload failed" );alert("Swerve: sent ✅")}catch(e){console.error(e);alert("Swerve: failed ❌")}})();

Replace https://service.example.com/ingest with your real endpoint.

## Jobs Dashboard

Swerve now includes a built-in dashboard for tracking your page captures and AI processing results in real-time.

### Features

- **Real-time job tracking**: See capture status as it progresses from pending → processing → completed/failed
- **Auto-refresh**: Dashboard updates every 3 seconds without manual intervention
- **Processing results**: View AI-generated summaries, insights, and analysis
- **Job management**: View details, delete individual jobs, or clear all jobs
- **Responsive design**: Clean, minimal interface that works on desktop and mobile
- **Processing simulation**: Built-in AI processing simulator for demonstration

### Quick Start

1. **Install dependencies and start the server:**
   ```bash
   npm install
   npm start
   ```

2. **Open the dashboard:**
   Navigate to `http://localhost:3000` in your browser

3. **Set up the bookmarklet:**
   - The dashboard shows a ready-to-use bookmarklet configured for your server
   - Drag the "Swerve Capture" link to your bookmarks bar
   - Visit any webpage and click the bookmarklet to capture it

4. **Track your captures:**
   - Jobs appear instantly in the dashboard
   - Status updates automatically as processing progresses
   - Click "Details" to view AI processing results
   - Use "Delete" to remove individual jobs or "Clear All Jobs" for bulk cleanup

### API Endpoints

The dashboard server provides these endpoints:

- `POST /ingest` - Accept bookmarklet page captures
- `GET /jobs` - List all jobs with status and metadata  
- `GET /jobs/:jobId` - Get detailed job information including results
- `DELETE /jobs/:jobId` - Delete a specific job
- `GET /` - Serve the dashboard interface

### Job Status Flow

```
PENDING → PROCESSING → COMPLETED ✅
                   └→ FAILED ❌
```

Each job includes:
- **Metadata**: URL, title, creation/update times
- **Status indicator**: Color-coded dots with animations for active processing
- **Processing results**: AI-generated summaries, insights, and analysis (when completed)
- **Error details**: Failure reasons and retry guidance (when failed)

## Roadmap

- Generator: produce a minified bookmarklet from /src and inject the configured endpoint + token
- Optional compression (lz-string) and chunking
- Readability-like text extraction mode
- On-page preview of what will be sent
- Per-site allowlist / denylist
- ✅ **Tiny dashboard that shows job status after send**

## Developer notes

- Bookmarklet size: keep under ~2–4 KB unminified for legibility (we’ll ship a minified version later).
- CSP realities: some sites block inline script execution via strict CSP. In those cases, a bookmarklet may not run. We’ll document fallbacks and a helper page that can open the current tab’s URL in a proxy capture if needed.
- Prior art: great inspiration from the bookmarklet ecosystem—e.g., WhatFont, perfmap, bullshit.js, and tools like bookmarkleter for building bookmarklets.

## Contributing

Issues and PRs welcome. Please include a short description, repro (if a bug), and screenshots for UX tweaks.

## License

MIT

# Swerve

Grab those web pages and give them to AI.
