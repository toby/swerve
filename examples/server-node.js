/**
 * Server-side examples for handling Swerve payloads with LZ compression
 */

// Node.js/Express example
const express = require('express');
const LZString = require('lz-string');

const app = express();

// Middleware to handle both compressed and uncompressed payloads
app.use('/ingest', (req, res, next) => {
    // Handle raw body for potential compression
    let body = '';
    req.setEncoding('utf8');
    
    req.on('data', chunk => {
        body += chunk;
    });
    
    req.on('end', () => {
        try {
            let payload = JSON.parse(body);
            
            // Check if the payload is compressed
            if (payload.transfer && payload.transfer.encoding === 'lz') {
                // The entire body is compressed - decompress it
                const decompressed = LZString.decompress(body);
                payload = JSON.parse(decompressed);
                
                console.log('Decompressed payload from', body.length, 'to', decompressed.length, 'bytes');
            }
            
            req.swervePayload = payload;
            next();
            
        } catch (error) {
            console.error('Failed to parse/decompress payload:', error);
            return res.status(400).json({ error: 'Invalid payload format' });
        }
    });
});

// Main ingestion endpoint
app.post('/ingest', (req, res) => {
    const payload = req.swervePayload;
    
    // Process the payload
    console.log('Received page capture:');
    console.log('- URL:', payload.page.url);
    console.log('- Title:', payload.page.title);
    console.log('- HTML size:', payload.snapshot.html.length, 'bytes');
    console.log('- Transfer encoding:', payload.transfer.encoding);
    console.log('- Client version:', payload.client.bookmarkletVersion);
    
    // Simulate processing
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Store the payload (simulation)
    console.log(`Storing job ${jobId} for processing...`);
    
    // Return success response
    res.status(202).json({
        jobId,
        trackUrl: `https://your-service.com/jobs/${jobId}`,
        status: 'accepted',
        message: 'Page capture received and queued for processing'
    });
});

// CORS middleware for bookmarklet support
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Swerve ingest server running on port ${PORT}`);
    console.log('Endpoint: http://localhost:${PORT}/ingest');
});

module.exports = app;