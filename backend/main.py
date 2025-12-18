import os
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for Netlify frontend
CORS(app, origins=["https://charming-otter-6124d0.netlify.app"])

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Railway monitoring"""
    return jsonify({
        'status': 'healthy',
        'message': 'Clinic+ API is running',
        'version': '1.0.0',
        'environment': 'production'
    }), 200

@app.route('/api/test', methods=['GET'])
def api_test():
    """API test endpoint"""
    return jsonify({
        'success': True,
        'message': 'Clinic+ Backend API is working correctly',
        'service': 'Railway Backend',
        'endpoints': [
            '/api/health',
            '/api/test'
        ]
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
