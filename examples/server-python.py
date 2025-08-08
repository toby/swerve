"""
Python/Flask example for handling Swerve payloads with LZ compression
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import time
import random
import string

# You'll need to install: pip install lzstring flask flask-cors
try:
    import lzstring
except ImportError:
    print("Please install lzstring: pip install lzstring")
    exit(1)

app = Flask(__name__)
CORS(app)  # Enable CORS for bookmarklet support

@app.route('/ingest', methods=['POST', 'OPTIONS'])
def handle_ingest():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Get raw body as it might be compressed
        raw_body = request.get_data(as_text=True)
        
        # Try to parse as JSON first
        payload = json.loads(raw_body)
        
        # Check if payload is compressed
        if payload.get('transfer', {}).get('encoding') == 'lz':
            # Decompress the entire body
            decompressor = lzstring.LZString()
            decompressed = decompressor.decompress(raw_body)
            payload = json.loads(decompressed)
            
            print(f"Decompressed payload from {len(raw_body)} to {len(decompressed)} bytes")
        
        # Process the payload
        print("Received page capture:")
        print(f"- URL: {payload['page']['url']}")
        print(f"- Title: {payload['page']['title']}")
        print(f"- HTML size: {len(payload['snapshot']['html'])} bytes")
        print(f"- Transfer encoding: {payload['transfer']['encoding']}")
        print(f"- Client version: {payload['client']['bookmarkletVersion']}")
        
        # Generate job ID
        job_id = f"job_{int(time.time())}_{generate_random_id()}"
        
        # Simulate processing
        print(f"Storing job {job_id} for processing...")
        
        # Return success response
        return jsonify({
            'jobId': job_id,
            'trackUrl': f'https://your-service.com/jobs/{job_id}',
            'status': 'accepted',
            'message': 'Page capture received and queued for processing'
        }), 202
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return jsonify({'error': 'Invalid JSON payload'}), 400
    except Exception as e:
        print(f"Processing error: {e}")
        return jsonify({'error': 'Failed to process payload'}), 500

def generate_random_id():
    """Generate a random ID for job tracking"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

@app.route('/jobs/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Simple job status endpoint (simulation)"""
    return jsonify({
        'jobId': job_id,
        'status': 'processing',
        'message': 'Job is being processed...'
    })

if __name__ == '__main__':
    print("Swerve ingest server starting...")
    print("Endpoint: http://localhost:5000/ingest")
    app.run(host='0.0.0.0', port=5000, debug=True)