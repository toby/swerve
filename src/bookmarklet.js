/**
 * Swerve Bookmarklet
 * Enhanced version with user-friendly UI feedback system
 */
(async () => {
  try {
    // Configuration
    const ENDPOINT = 'https://service.example.com/ingest';
    const VERSION = { v: '0.2.0' };
    const CHUNK_SIZE = 512 * 1024; // 512KB chunks
    
    // Initialize UI system - inline the toast and progress classes
    %%TOAST_CODE%%
    %%PROGRESS_CODE%%
    
    // Get or create toast instance
    const toast = getSwerveToast();
    const progress = new SwerveProgress(toast);
    
    // Start the operation
    const operationId = 'capture_' + Date.now();
    progress.startOperation(operationId, 'Capturing Page', {
      theme: 'light',
      position: 'top-right'
    });
    
    // Small delay to show the starting state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture page data
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
    
    const payload = {
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
        html: d.documentElement.outerHTML,
        selectionText,
        selectionHtml,
        capturedAt: new Date().toISOString()
      },
      transfer: {
        encoding: 'plain',
        chunk: { index: 0, count: 1 }
      },
      client: {
        bookmarkletVersion: VERSION.v,
        language: navigator.language
      }
    };
    
    const payloadJson = JSON.stringify(payload);
    const payloadSize = new Blob([payloadJson]).size;
    
    // Update progress - data captured
    progress.updateProgress(operationId, 1, 3, 'Data captured, preparing upload...');
    
    // Determine if we need chunking
    if (payloadSize <= CHUNK_SIZE) {
      // Single chunk upload
      progress.updateProgress(operationId, 2, 3, 'Uploading data...');
      
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        keepalive: true,
        headers: {
          'content-type': 'application/json'
        },
        body: payloadJson
      });
      
      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
      }
      
      // Try to get response data for job tracking
      let responseData = null;
      try {
        responseData = await res.json();
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      const successMessage = responseData && responseData.jobId ? 
        `Job ID: ${responseData.jobId}` : 
        `Uploaded ${Math.round(payloadSize / 1024)}KB successfully`;
      
      progress.completeOperation(operationId, true, successMessage);
      
      // Show additional toast with job tracking if available
      if (responseData && responseData.trackUrl) {
        setTimeout(() => {
          toast.show('info', 'Track Your Job', 'Click to view processing status', {
            duration: 8000,
            closable: true
          });
        }, 1000);
      }
      
    } else {
      // Chunked upload
      const chunks = [];
      const chunkCount = Math.ceil(payloadSize / CHUNK_SIZE);
      
      // Split into chunks
      for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, payloadJson.length);
        chunks.push(payloadJson.slice(start, end));
      }
      
      progress.updateProgress(operationId, 1, chunkCount + 1, `Uploading ${chunkCount} chunks...`);
      
      // Upload chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        const chunkPayload = {
          ...payload,
          transfer: {
            encoding: 'plain',
            chunk: { index: i, count: chunkCount }
          },
          snapshot: {
            ...payload.snapshot,
            html: chunks[i] // This is simplified - real implementation would need proper chunking
          }
        };
        
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'cors',
          keepalive: true,
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(chunkPayload)
        });
        
        if (!res.ok) {
          throw new Error(`Chunk ${i + 1}/${chunkCount} failed: ${res.status} ${res.statusText}`);
        }
        
        progress.updateProgress(operationId, i + 2, chunkCount + 1, `Uploaded chunk ${i + 1}/${chunkCount}`);
      }
      
      progress.completeOperation(operationId, true, `Uploaded ${chunkCount} chunks (${Math.round(payloadSize / 1024)}KB)`);
    }
    
  } catch (error) {
    console.error('Swerve error:', error);
    
    // Try to complete the operation as failed
    if (typeof progress !== 'undefined' && typeof operationId !== 'undefined') {
      progress.completeOperation(operationId, false, error.message);
    } else {
      // Fallback to simple toast if progress system failed
      if (typeof toast !== 'undefined') {
        toast.show('error', 'Upload Failed', error.message, { duration: 5000 });
      } else {
        // Ultimate fallback to alert
        alert(`Swerve failed: ${error.message}`);
      }
    }
  }
})();