#!/usr/bin/env python3
"""
Simple web-based Akave O3 bucket viewer
Run this script and open http://localhost:8080 in your browser
"""

import os
import sys
import json
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import requests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from akave.mcache import Akave
from logs import setup_logging

load_dotenv = lambda: None
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

logger = setup_logging("bucket-viewer")


class BucketViewerHandler(BaseHTTPRequestHandler):
    akave = Akave()
    bucket_name = "akave-bucket"
    endpoint_url = "https://o3-rc2.akave.xyz"
    profile = "akave-o3"

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        params = parse_qs(parsed_path.query)

        if path == "/" or path == "/index.html":
            self.serve_index()
        elif path == "/api/list":
            self.api_list_objects()
        elif path == "/api/preview":
            object_key = params.get("key", [None])[0]
            if object_key:
                self.api_preview_object(object_key)
            else:
                self.send_error(400, "Missing 'key' parameter")
        elif path == "/api/metadata":
            object_key = params.get("key", [None])[0]
            if object_key:
                self.api_object_metadata(object_key)
            else:
                self.send_error(400, "Missing 'key' parameter")
        elif path == "/api/presigned":
            object_key = params.get("key", [None])[0]
            if object_key:
                self.api_presigned_url(object_key)
            else:
                self.send_error(400, "Missing 'key' parameter")
        else:
            self.send_error(404)

    def serve_index(self):
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>Akave O3 Bucket Viewer</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        .controls {
            background: white;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
        }
        button:hover {
            background: #45a049;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        #status {
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
            display: none;
        }
        .success { background: #d4edda; color: #155724; display: block; }
        .error { background: #f8d7da; color: #721c24; display: block; }
        .info { background: #d1ecf1; color: #0c5460; display: block; }
        table {
            width: 100%;
            background: white;
            border-collapse: collapse;
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th {
            background: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        tr:hover {
            background: #f5f5f5;
        }
        .hash {
            font-family: monospace;
            font-size: 12px;
            color: #666;
            word-break: break-all;
        }
        .actions button {
            margin-right: 5px;
            padding: 5px 10px;
            font-size: 12px;
        }
        .preview {
            background: white;
            padding: 15px;
            margin-top: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .preview pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        .close-preview {
            background: #f44336;
            float: right;
        }
        .close-preview:hover {
            background: #da190b;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>🗄️ Akave O3 Bucket Viewer</h1>

    <div class="controls">
        <button onclick="loadObjects()">🔄 Refresh Objects</button>
        <button onclick="showHelp()">❓ Help</button>
        <div id="status"></div>
    </div>

    <div id="objectList">
        <p class="loading">Click "Refresh Objects" to load bucket contents...</p>
    </div>

    <div id="previewArea" style="display:none;"></div>

    <script>
        function setStatus(message, type) {
            const status = document.getElementById('status');
            status.className = type;
            status.textContent = message;
        }

        async function loadObjects() {
            setStatus('Loading objects...', 'info');
            const container = document.getElementById('objectList');
            container.innerHTML = '<p class="loading">Loading...</p>';

            try {
                const response = await fetch('/api/list');
                const data = await response.json();

                if (data.error) {
                    setStatus('Error: ' + data.error, 'error');
                    container.innerHTML = '<p>No objects found or error occurred.</p>';
                    return;
                }

                if (!data.Contents || data.Contents.length === 0) {
                    container.innerHTML = '<p>No objects found in bucket.</p>';
                    setStatus('Bucket is empty', 'info');
                    return;
                }

                let html = '<table><thead><tr><th>Key (Hash)</th><th>Size</th><th>Last Modified</th><th>Actions</th></tr></thead><tbody>';

                data.Contents.forEach(obj => {
                    const sizeKB = (obj.Size / 1024).toFixed(2);
                    const date = new Date(obj.LastModified).toLocaleString();
                    html += `
                        <tr>
                            <td class="hash" title="${obj.Key}">${obj.Key.substring(0, 32)}...</td>
                            <td>${sizeKB} KB</td>
                            <td>${date}</td>
                            <td class="actions">
                                <button onclick="previewObject('${obj.Key}')">👁️ Preview</button>
                                <button onclick="getPresignedUrl('${obj.Key}')">🔗 Get URL</button>
                                <button onclick="getMetadata('${obj.Key}')">ℹ️ Info</button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;
                setStatus(`Found ${data.Contents.length} objects`, 'success');
            } catch (error) {
                setStatus('Error loading objects: ' + error.message, 'error');
                container.innerHTML = '<p>Error loading objects. Check console for details.</p>';
                console.error(error);
            }
        }

        async function previewObject(key) {
            setStatus('Loading preview...', 'info');
            const previewArea = document.getElementById('previewArea');
            previewArea.style.display = 'block';
            previewArea.innerHTML = '<div class="preview"><p class="loading">Loading preview...</p></div>';

            try {
                const response = await fetch(`/api/preview?key=${encodeURIComponent(key)}`);
                const data = await response.json();

                if (data.error) {
                    previewArea.innerHTML = `<div class="preview"><button class="close-preview" onclick="closePreview()">✖ Close</button><h3>Error</h3><p>${data.error}</p></div>`;
                    setStatus('Error loading preview', 'error');
                    return;
                }

                const content = data.preview || 'No preview available';
                previewArea.innerHTML = `
                    <div class="preview">
                        <button class="close-preview" onclick="closePreview()">✖ Close</button>
                        <h3>Preview: ${key.substring(0, 32)}...</h3>
                        <pre>${escapeHtml(content)}</pre>
                    </div>
                `;
                setStatus('Preview loaded', 'success');
                previewArea.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                setStatus('Error: ' + error.message, 'error');
                console.error(error);
            }
        }

        async function getPresignedUrl(key) {
            setStatus('Generating presigned URL...', 'info');
            try {
                const response = await fetch(`/api/presigned?key=${encodeURIComponent(key)}`);
                const data = await response.json();

                if (data.url) {
                    const previewArea = document.getElementById('previewArea');
                    previewArea.style.display = 'block';
                    previewArea.innerHTML = `
                        <div class="preview">
                            <button class="close-preview" onclick="closePreview()">✖ Close</button>
                            <h3>Presigned URL</h3>
                            <p><strong>Key:</strong> ${key}</p>
                            <p><strong>URL:</strong></p>
                            <pre style="word-break: break-all;">${data.url}</pre>
                            <button onclick="copyToClipboard('${data.url}')">📋 Copy to Clipboard</button>
                        </div>
                    `;
                    setStatus('Presigned URL generated', 'success');
                    previewArea.scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStatus('Error generating URL: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                setStatus('Error: ' + error.message, 'error');
                console.error(error);
            }
        }

        async function getMetadata(key) {
            setStatus('Loading metadata...', 'info');
            try {
                const response = await fetch(`/api/metadata?key=${encodeURIComponent(key)}`);
                const data = await response.json();

                const previewArea = document.getElementById('previewArea');
                previewArea.style.display = 'block';
                previewArea.innerHTML = `
                    <div class="preview">
                        <button class="close-preview" onclick="closePreview()">✖ Close</button>
                        <h3>Object Metadata</h3>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    </div>
                `;
                setStatus('Metadata loaded', 'success');
                previewArea.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                setStatus('Error: ' + error.message, 'error');
                console.error(error);
            }
        }

        function closePreview() {
            document.getElementById('previewArea').style.display = 'none';
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                setStatus('Copied to clipboard!', 'success');
            }).catch(err => {
                setStatus('Failed to copy', 'error');
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showHelp() {
            const previewArea = document.getElementById('previewArea');
            previewArea.style.display = 'block';
            previewArea.innerHTML = `
                <div class="preview">
                    <button class="close-preview" onclick="closePreview()">✖ Close</button>
                    <h3>Help</h3>
                    <h4>What is this?</h4>
                    <p>This is a web-based viewer for your Akave O3 bucket contents.</p>
                    <h4>Actions:</h4>
                    <ul>
                        <li><strong>👁️ Preview:</strong> View the contents of the object (first 500 chars)</li>
                        <li><strong>🔗 Get URL:</strong> Generate a presigned URL for accessing the object</li>
                        <li><strong>ℹ️ Info:</strong> View metadata (size, content-type, etc.)</li>
                    </ul>
                    <h4>Understanding Keys:</h4>
                    <p>Keys are SHA256 hashes of the uploaded content. They serve as unique identifiers for objects in the bucket.</p>
                </div>
            `;
            previewArea.scrollIntoView({ behavior: 'smooth' });
        }
    </script>
</body>
</html>
        """
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode())

    def api_list_objects(self):
        command = [
            "aws", "s3api", "list-objects-v2",
            "--bucket", self.bucket_name,
            "--endpoint-url", self.endpoint_url,
            "--profile", self.profile
        ]

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            data = json.loads(result.stdout)
            self.send_json_response(data)
        else:
            self.send_json_response({"error": result.stderr})

    def api_preview_object(self, object_key):
        try:
            # Generate presigned URL and fetch content
            url = self.akave.get_presigned_url(object_key)
            if url:
                response = requests.get(url)
                if response.status_code == 200:
                    content = response.text[:500]  # First 500 chars
                    self.send_json_response({"preview": content, "full_length": len(response.text)})
                else:
                    self.send_json_response({"error": f"Failed to fetch object: {response.status_code}"})
            else:
                self.send_json_response({"error": "Failed to generate presigned URL"})
        except Exception as e:
            self.send_json_response({"error": str(e)})

    def api_object_metadata(self, object_key):
        command = [
            "aws", "s3api", "head-object",
            "--bucket", self.bucket_name,
            "--key", object_key,
            "--endpoint-url", self.endpoint_url,
            "--profile", self.profile
        ]

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            data = json.loads(result.stdout)
            self.send_json_response(data)
        else:
            self.send_json_response({"error": result.stderr})

    def api_presigned_url(self, object_key):
        try:
            url = self.akave.get_presigned_url(object_key)
            if url:
                self.send_json_response({"url": url})
            else:
                self.send_json_response({"error": "Failed to generate presigned URL"})
        except Exception as e:
            self.send_json_response({"error": str(e)})

    def send_json_response(self, data):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        # Suppress default logging
        pass


def main():
    port = 8080
    server_address = ('', port)
    httpd = HTTPServer(server_address, BucketViewerHandler)

    print("\n" + "="*60)
    print("🌐 Akave O3 Bucket Viewer")
    print("="*60)
    print(f"\n✅ Server running on http://localhost:{port}")
    print(f"\n📂 Open your browser and navigate to:")
    print(f"   http://localhost:{port}\n")
    print("Press Ctrl+C to stop the server\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")
        httpd.server_close()


if __name__ == "__main__":
    main()
