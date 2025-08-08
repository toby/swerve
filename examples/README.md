# Swerve Examples

This directory contains example implementations and test files for Swerve chunking functionality.

## Files

### `server.js`
Example Node.js server that demonstrates how to handle and reassemble chunked payloads from the Swerve bookmarklet.

**Features:**
- Accepts both single and chunked payloads
- Reassembles chunks in proper order using jobId and chunk index
- Handles finalization calls to confirm completion
- Provides job status tracking
- Includes error handling and cleanup

**To run:**
```bash
cd examples
npm install
npm start
```

The server will start on `http://localhost:3000` with endpoints:
- `POST /ingest` - Accept page capture chunks
- `GET /jobs/:jobId` - Check job status  
- `GET /health` - Health check

### `package.json`
Dependencies for the example server.

### `test.html`
Comprehensive test page for validating chunking functionality.

**Features:**
- Generate large content (2MB+) to test chunking
- Built-in bookmarklet testing
- Visual feedback for chunk transmission
- Page size calculation

**To test chunking:**
1. Start the example server (`npm start` in `/examples`)
2. Open `test.html` in a web browser
3. Click "Generate Large Content" to create a >2MB page
4. Click "Test Chunking Bookmarklet" to test the functionality
5. Check browser console and server logs for detailed output

## Testing Chunking Behavior

The chunking system will automatically:
1. **Detect large payloads**: Pages >1MB are automatically chunked
2. **Create 256KB chunks**: Splits HTML content into manageable pieces
3. **Sequential transmission**: Sends chunks in order with 100ms delay
4. **Provide progress feedback**: Console logs show chunk progress
5. **Send finalization**: Final call confirms all chunks transmitted
6. **Server reassembly**: Server reconstructs the complete page

## Expected Server Logs

When testing with chunked content, you should see logs like:
```
Received chunk 1/8 for job job_1699123456789_abc123def
Received chunk 2/8 for job job_1699123456789_abc123def
...
All chunks received for job job_1699123456789_abc123def, reassembling...
Successfully reassembled 8 chunks for job job_1699123456789_abc123def
Finalization received for job job_1699123456789_abc123def
```

## Error Handling

The chunking system includes robust error handling:
- **Network failures**: Each chunk failure is reported with specific error
- **Missing chunks**: Server tracks expected vs received chunks
- **Timeout handling**: Server cleans up abandoned jobs after timeout
- **Invalid payloads**: Validation of chunk structure and metadata

## Production Considerations

When implementing in production:
1. **Use persistent storage**: Replace in-memory Map with database
2. **Add authentication**: Implement proper API key/token validation
3. **Rate limiting**: Prevent abuse of chunking endpoints
4. **Monitoring**: Track chunk success rates and reassembly performance
5. **Cleanup**: Implement proper garbage collection for old jobs
6. **Compression**: Add gzip/deflate support for additional size reduction