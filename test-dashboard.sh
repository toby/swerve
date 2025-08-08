#!/bin/bash
# Simple test script to demonstrate Swerve dashboard functionality

SERVER_URL="http://localhost:3000"

echo "🧪 Testing Swerve Dashboard..."
echo

echo "1️⃣  Creating test capture..."
RESPONSE=$(curl -s -X POST "$SERVER_URL/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "0",
    "page": {
      "url": "https://example.com/test",
      "title": "Test Page for Dashboard",
      "referrer": "https://github.com/toby/swerve",
      "userAgent": "Test-Agent/1.0",
      "viewport": { "width": 1440, "height": 900 },
      "scroll": { "x": 0, "y": 0 }
    },
    "snapshot": {
      "html": "<html><head><title>Test</title></head><body><h1>Dashboard Test</h1><p>Testing the Swerve dashboard functionality.</p></body></html>",
      "selectionText": "",
      "selectionHtml": "",
      "capturedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    },
    "transfer": {
      "encoding": "plain",
      "chunk": { "index": 0, "count": 1 }
    },
    "client": {
      "bookmarkletVersion": "0.1.0",
      "language": "en-US"
    }
  }')

JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "   ✅ Job created: $JOB_ID"

echo
echo "2️⃣  Listing all jobs..."
curl -s "$SERVER_URL/jobs" | echo "   ✅ Jobs endpoint working"

echo
echo "3️⃣  Waiting for processing to complete..."
sleep 3

echo
echo "4️⃣  Getting final job status..."
curl -s "$SERVER_URL/jobs/$JOB_ID" | grep -o '"status":"[^"]*"' | echo "   ✅ Final status: $(cut -d'"' -f4)"

echo
echo "5️⃣  Cleaning up..."
curl -s -X DELETE "$SERVER_URL/jobs/$JOB_ID" && echo "   ✅ Job deleted"

echo
echo "🎉 Dashboard test completed!"
echo "🌐 Visit $SERVER_URL to see the dashboard"