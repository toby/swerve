const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory job storage (would be a database in production)
let jobs = new Map();
let jobCounter = 1;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Job status enum
const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Simulate AI processing
function simulateProcessing(jobId) {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = JobStatus.PROCESSING;
      job.updatedAt = new Date().toISOString();
      
      // Simulate processing time (2-5 seconds)
      setTimeout(() => {
        if (jobs.has(jobId)) {
          const finalJob = jobs.get(jobId);
          finalJob.status = Math.random() > 0.1 ? JobStatus.COMPLETED : JobStatus.FAILED;
          finalJob.updatedAt = new Date().toISOString();
          
          if (finalJob.status === JobStatus.COMPLETED) {
            finalJob.result = {
              summary: `AI processed summary of "${finalJob.data.page.title || 'Untitled Page'}"`,
              insights: [
                'This page contains valuable information',
                'Key topics identified: ' + (finalJob.data.page.url.includes('github') ? 'Software Development' : 'General Content'),
                'Processing completed successfully'
              ],
              processingTime: '2.3s',
              wordCount: finalJob.data.snapshot.html.length
            };
          } else {
            finalJob.error = 'AI processing failed - please try again';
          }
        }
      }, Math.random() * 3000 + 2000);
    }
  }, 1000);
}

// API Routes

// POST /ingest - Accept bookmarklet data
app.post('/ingest', (req, res) => {
  try {
    const jobId = `job_${Date.now()}_${jobCounter++}`;
    const trackUrl = `${req.protocol}://${req.get('host')}/jobs/${jobId}`;
    
    const job = {
      id: jobId,
      status: JobStatus.PENDING,
      data: req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackUrl
    };
    
    jobs.set(jobId, job);
    
    // Start processing simulation
    simulateProcessing(jobId);
    
    res.status(202).json({
      jobId,
      trackUrl
    });
  } catch (error) {
    console.error('Error in /ingest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /jobs - List all jobs
app.get('/jobs', (req, res) => {
  const jobList = Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(job => ({
      id: job.id,
      status: job.status,
      url: job.data.page.url,
      title: job.data.page.title,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      trackUrl: job.trackUrl
    }));
  
  res.json(jobList);
});

// GET /jobs/:jobId - Get specific job
app.get('/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// DELETE /jobs/:jobId - Delete specific job
app.delete('/jobs/:jobId', (req, res) => {
  if (jobs.has(req.params.jobId)) {
    jobs.delete(req.params.jobId);
    res.json({ message: 'Job deleted successfully' });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Swerve server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});