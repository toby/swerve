#!/usr/bin/env node

// Simple test script to demonstrate Swerve dashboard functionality
// Run with: node test-dashboard.js

// Use built-in fetch or fallback to http module for simple requests
const http = require('http');

const SERVER_URL = 'http://localhost:3000';

async function testDashboard() {
  console.log('🧪 Testing Swerve Dashboard...\n');
  
  try {
    // Test 1: Create a job via ingest endpoint
    console.log('1️⃣  Creating test capture...');
    const testCapture = {
      version: "0",
      page: {
        url: "https://example.com/test",
        title: "Test Page for Dashboard",
        referrer: "https://github.com/toby/swerve",
        userAgent: "Test-Agent/1.0",
        viewport: { width: 1440, height: 900 },
        scroll: { x: 0, y: 0 }
      },
      snapshot: {
        html: "<html><head><title>Test</title></head><body><h1>Dashboard Test</h1><p>Testing the Swerve dashboard functionality.</p></body></html>",
        selectionText: "",
        selectionHtml: "",
        capturedAt: new Date().toISOString()
      },
      transfer: {
        encoding: "plain",
        chunk: { index: 0, count: 1 }
      },
      client: {
        bookmarkletVersion: "0.1.0",
        language: "en-US"
      }
    };
    
    const ingestResponse = await fetch(`${SERVER_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCapture)
    });
    
    const { jobId, trackUrl } = await ingestResponse.json();
    console.log(`   ✅ Job created: ${jobId}`);
    console.log(`   🔗 Track URL: ${trackUrl}`);
    
    // Test 2: List jobs
    console.log('\n2️⃣  Listing all jobs...');
    const jobsResponse = await fetch(`${SERVER_URL}/jobs`);
    const jobs = await jobsResponse.json();
    console.log(`   ✅ Found ${jobs.length} job(s)`);
    
    // Test 3: Get specific job details
    console.log('\n3️⃣  Getting job details...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for processing to start
    
    const jobResponse = await fetch(`${SERVER_URL}/jobs/${jobId}`);
    const job = await jobResponse.json();
    console.log(`   ✅ Job status: ${job.status}`);
    console.log(`   📄 Page title: ${job.data.page.title}`);
    
    // Test 4: Wait for completion and show results
    console.log('\n4️⃣  Waiting for AI processing...');
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedJob = await (await fetch(`${SERVER_URL}/jobs/${jobId}`)).json();
      
      if (updatedJob.status === 'completed') {
        console.log('   ✅ Processing completed!');
        console.log(`   📊 Summary: ${updatedJob.result.summary}`);
        console.log(`   💡 Insights: ${updatedJob.result.insights.join(', ')}`);
        console.log(`   ⏱️  Processing time: ${updatedJob.result.processingTime}`);
        break;
      } else if (updatedJob.status === 'failed') {
        console.log(`   ❌ Processing failed: ${updatedJob.error}`);
        break;
      } else {
        console.log(`   ⏳ Status: ${updatedJob.status}...`);
      }
      attempts++;
    }
    
    // Test 5: Delete the job
    console.log('\n5️⃣  Cleaning up test job...');
    const deleteResponse = await fetch(`${SERVER_URL}/jobs/${jobId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log('   ✅ Job deleted successfully');
    } else {
      console.log('   ❌ Failed to delete job');
    }
    
    console.log('\n🎉 Dashboard test completed successfully!');
    console.log(`\n🌐 Visit ${SERVER_URL} to see the dashboard in action`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDashboard();
}

module.exports = { testDashboard };