#!/usr/bin/env node

/**
 * Integration test for server chunk handling
 */

const http = require('http');

async function testChunkSubmission() {
  const jobId = `job_test_${Date.now()}_abc123`;
  
  const testPayload = {
    version: "0",
    jobId: jobId,
    page: {
      url: "http://localhost:3000/test",
      title: "Test Page",
      referrer: null,
      userAgent: "Node.js Test Client",
      viewport: { width: 1024, height: 768 },
      scroll: { x: 0, y: 0 }
    },
    snapshot: {
      html: "<html><body><h1>Test content for chunk 1</h1></body></html>",
      selectionText: "",
      selectionHtml: "",
      capturedAt: new Date().toISOString()
    },
    transfer: {
      encoding: "plain",
      chunk: {
        index: 0,
        count: 2,
        total: 2,
        isLast: false
      }
    },
    client: {
      bookmarkletVersion: "0.1.0",
      language: "en-US"
    }
  };

  console.log('🧪 Testing server chunk submission...\n');

  try {
    // Submit first chunk
    console.log(`📤 Submitting chunk 1/2 for job ${jobId}`);
    const response1 = await submitChunk(testPayload);
    console.log(`✅ Chunk 1 response:`, JSON.stringify(response1, null, 2));

    // Submit second chunk
    const payload2 = {
      ...testPayload,
      snapshot: {
        ...testPayload.snapshot,
        html: "<html><body><h1>Test content for chunk 2</h1></body></html>"
      },
      transfer: {
        ...testPayload.transfer,
        chunk: {
          index: 1,
          count: 2,
          total: 2,
          isLast: true
        }
      }
    };

    console.log(`📤 Submitting chunk 2/2 for job ${jobId}`);
    const response2 = await submitChunk(payload2);
    console.log(`✅ Chunk 2 response:`, JSON.stringify(response2, null, 2));

    // Send finalization
    const finalizationPayload = {
      version: "0",
      jobId: jobId,
      type: "finalization",
      transfer: {
        encoding: "plain",
        chunk: {
          index: -1,
          count: 2,
          total: 2,
          isFinalization: true
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log(`🏁 Sending finalization for job ${jobId}`);
    const finalizationResponse = await submitChunk(finalizationPayload);
    console.log(`✅ Finalization response:`, JSON.stringify(finalizationResponse, null, 2));

    // Check job status
    console.log(`📊 Checking job status for ${jobId}`);
    const statusResponse = await getJobStatus(jobId);
    console.log(`✅ Job status:`, JSON.stringify(statusResponse, null, 2));

    console.log('\n🎯 Integration test completed successfully!');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

function submitChunk(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

function getJobStatus(jobId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/jobs/${jobId}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Run test
if (require.main === module) {
  testChunkSubmission();
}