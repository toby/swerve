const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'swerve.db');

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH);

// Create table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS page_snapshots (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      referrer TEXT,
      user_agent TEXT,
      viewport_width INTEGER,
      viewport_height INTEGER,
      scroll_x INTEGER,
      scroll_y INTEGER,
      html_content TEXT NOT NULL,
      selection_text TEXT,
      selection_html TEXT,
      captured_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      bookmarklet_version TEXT,
      language TEXT,
      encoding TEXT,
      chunk_index INTEGER,
      chunk_count INTEGER,
      auth_token_used BOOLEAN DEFAULT 0
    )
  `);
});

// Helper function to validate payload structure
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload structure' };
  }

  if (!payload.page || !payload.snapshot) {
    return { valid: false, error: 'Missing required page or snapshot data' };
  }

  if (!payload.page.url || !payload.snapshot.html) {
    return { valid: false, error: 'Missing required URL or HTML content' };
  }

  return { valid: true };
}

// Helper function to authenticate request
function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { authenticated: true, tokenUsed: false }; // No auth required for now
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // For now, accept any token - in production you'd validate against known tokens
    return { authenticated: true, tokenUsed: true };
  }

  return { authenticated: false, tokenUsed: false };
}

// POST /ingest endpoint - receives bookmarklet data
app.post('/ingest', (req, res) => {
  try {
    // Authenticate request
    const authResult = authenticateRequest(req);
    if (!authResult.authenticated) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token'
      });
    }

    // Validate payload
    const validation = validatePayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error
      });
    }

    const payload = req.body;
    const jobId = `job_${uuidv4()}`;

    // Extract data for database storage
    const {
      page: {
        url,
        title,
        referrer,
        userAgent,
        viewport = {},
        scroll = {}
      },
      snapshot: {
        html,
        selectionText = '',
        selectionHtml = '',
        capturedAt
      },
      transfer: {
        encoding = 'plain',
        chunk = {}
      } = {},
      client: {
        bookmarkletVersion,
        language
      } = {}
    } = payload;

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO page_snapshots (
        id, url, title, referrer, user_agent,
        viewport_width, viewport_height, scroll_x, scroll_y,
        html_content, selection_text, selection_html, captured_at,
        bookmarklet_version, language, encoding,
        chunk_index, chunk_count, auth_token_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      jobId,
      url,
      title || null,
      referrer || null,
      userAgent || null,
      viewport.width || null,
      viewport.height || null,
      scroll.x || null,
      scroll.y || null,
      html,
      selectionText,
      selectionHtml,
      capturedAt || new Date().toISOString(),
      bookmarkletVersion || null,
      language || null,
      encoding,
      chunk.index || 0,
      chunk.count || 1,
      authResult.tokenUsed ? 1 : 0
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to store page snapshot'
        });
      }

      // Return success response matching the expected format
      res.status(202).json({
        jobId: jobId,
        trackUrl: `http://localhost:${PORT}/jobs/${jobId}`
      });
    });

    stmt.finalize();

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected server error'
    });
  }
});

// GET /jobs/:jobId - track job status (basic implementation)
app.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;

  db.get(
    'SELECT id, url, title, created_at FROM page_snapshots WHERE id = ?',
    [jobId],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to retrieve job status'
        });
      }

      if (!row) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Job not found'
        });
      }

      res.json({
        jobId: row.id,
        status: 'completed',
        url: row.url,
        title: row.title,
        createdAt: row.created_at
      });
    }
  );
});

// GET / - basic health check and info
app.get('/', (req, res) => {
  res.json({
    service: 'Swerve Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      ingest: 'POST /ingest',
      track: 'GET /jobs/:jobId'
    }
  });
});

// GET /stats - basic statistics
app.get('/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM page_snapshots', (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: 'Internal Server Error'
      });
    }

    res.json({
      totalSnapshots: row.total,
      database: DB_PATH
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Swerve backend server running on http://localhost:${PORT}`);
  console.log(`📊 Stats: http://localhost:${PORT}/stats`);
  console.log(`💾 Database: ${DB_PATH}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📤 Database connection closed.');
    }
    process.exit(0);
  });
});