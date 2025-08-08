/**
 * Swerve Server Example - Chunk Reassembly
 * Example server implementation for handling chunked payloads
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// In-memory storage for chunks (use proper database in production)
const chunkStore = new Map(); // jobId -> { chunks: Map, metadata: Object, receivedChunks: number }

/**
 * POST /ingest - Handle page capture chunks
 */
app.post('/ingest', async (req, res) => {
  try {
    const payload = req.body;
    
    // Validate payload
    if (!payload || !payload.version) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    // Handle finalization call
    if (payload.type === 'finalization') {
      return handleFinalization(payload, res);
    }

    // Handle regular chunk or single payload
    if (!payload.transfer || !payload.transfer.chunk) {
      return res.status(400).json({ error: 'Missing chunk information' });
    }

    const { jobId } = payload;
    const { index, count, total, isLast } = payload.transfer.chunk;

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }

    // Initialize chunk store for this job if needed
    if (!chunkStore.has(jobId)) {
      chunkStore.set(jobId, {
        chunks: new Map(),
        metadata: extractMetadata(payload),
        receivedChunks: 0,
        totalExpected: total || count,
        startTime: Date.now()
      });
    }

    const jobData = chunkStore.get(jobId);

    // Store the chunk
    jobData.chunks.set(index, {
      html: payload.snapshot.html,
      receivedAt: new Date().toISOString()
    });
    jobData.receivedChunks++;

    console.log(`Received chunk ${index + 1}/${jobData.totalExpected} for job ${jobId}`);

    // Check if all chunks have been received
    if (jobData.receivedChunks === jobData.totalExpected) {
      console.log(`All chunks received for job ${jobId}, reassembling...`);
      const reassembledCapture = await reassembleChunks(jobId);
      
      if (reassembledCapture) {
        // Process the complete capture (store, enqueue for AI, etc.)
        await processCompleteCapture(jobId, reassembledCapture);
      }
    }

    // Return success response
    res.status(202).json({
      jobId: jobId,
      trackUrl: `https://service.example.com/jobs/${jobId}`,
      chunkReceived: index + 1,
      totalChunks: jobData.totalExpected,
      isComplete: jobData.receivedChunks === jobData.totalExpected
    });

  } catch (error) {
    console.error('Error processing chunk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle finalization call
 */
function handleFinalization(payload, res) {
  const { jobId } = payload;
  const jobData = chunkStore.get(jobId);

  if (!jobData) {
    return res.status(404).json({ error: 'Job not found' });
  }

  console.log(`Finalization received for job ${jobId}`);
  
  // Mark as finalized
  jobData.finalized = true;
  jobData.finalizedAt = new Date().toISOString();

  // If not already reassembled, try now
  if (!jobData.reassembled && jobData.receivedChunks === jobData.totalExpected) {
    reassembleChunks(jobId).then(capture => {
      if (capture) {
        processCompleteCapture(jobId, capture);
      }
    });
  }

  res.status(200).json({
    jobId: jobId,
    status: 'finalized',
    chunksReceived: jobData.receivedChunks,
    totalExpected: jobData.totalExpected
  });
}

/**
 * Reassemble chunks into complete capture
 */
async function reassembleChunks(jobId) {
  const jobData = chunkStore.get(jobId);
  if (!jobData) {
    console.error(`No job data found for ${jobId}`);
    return null;
  }

  try {
    // Sort chunks by index and concatenate HTML
    const sortedChunks = Array.from(jobData.chunks.entries())
      .sort(([indexA], [indexB]) => indexA - indexB)
      .map(([index, chunk]) => chunk.html);

    const completeHtml = sortedChunks.join('');

    // Create complete capture object
    const completeCapture = {
      ...jobData.metadata,
      snapshot: {
        ...jobData.metadata.snapshot,
        html: completeHtml
      },
      reassembly: {
        chunksCount: jobData.chunks.size,
        reassembledAt: new Date().toISOString(),
        processingTimeMs: Date.now() - jobData.startTime
      }
    };

    jobData.reassembled = true;
    jobData.completeCapture = completeCapture;

    console.log(`Successfully reassembled ${jobData.chunks.size} chunks for job ${jobId}`);
    return completeCapture;

  } catch (error) {
    console.error(`Error reassembling chunks for job ${jobId}:`, error);
    return null;
  }
}

/**
 * Extract metadata from the first chunk
 */
function extractMetadata(payload) {
  return {
    version: payload.version,
    jobId: payload.jobId,
    page: payload.page,
    snapshot: {
      selectionText: payload.snapshot.selectionText,
      selectionHtml: payload.snapshot.selectionHtml,
      capturedAt: payload.snapshot.capturedAt
    },
    client: payload.client
  };
}

/**
 * Process complete capture (placeholder for your AI pipeline)
 */
async function processCompleteCapture(jobId, capture) {
  console.log(`Processing complete capture for job ${jobId}`);
  
  // Here you would:
  // 1. Store the complete capture in your database
  // 2. Enqueue for AI processing
  // 3. Generate summary/insights
  // 4. Send notifications
  
  console.log(`Capture size: ${capture.snapshot.html.length} characters`);
  console.log(`Page title: ${capture.page.title}`);
  console.log(`Processing completed in ${capture.reassembly.processingTimeMs}ms`);
  
  // Clean up chunk store after processing
  setTimeout(() => {
    chunkStore.delete(jobId);
    console.log(`Cleaned up chunk store for job ${jobId}`);
  }, 60000); // Clean up after 1 minute
}

/**
 * GET /jobs/:jobId - Check job status
 */
app.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const jobData = chunkStore.get(jobId);

  if (!jobData) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: jobId,
    status: jobData.reassembled ? 'completed' : 'processing',
    chunksReceived: jobData.receivedChunks,
    totalExpected: jobData.totalExpected,
    finalized: jobData.finalized || false,
    startTime: jobData.startTime,
    processingTimeMs: Date.now() - jobData.startTime
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeJobs: chunkStore.size,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Swerve server listening on port ${PORT}`);
  console.log(`POST /ingest - Accept page capture chunks`);
  console.log(`GET /jobs/:jobId - Check job status`);
  console.log(`GET /health - Health check`);
});

module.exports = app;