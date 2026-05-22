import os
import json
import uuid
import requests
import base64
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("ALLOWED_ORIGINS", "*")}})

# Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_USER = os.getenv("GITHUB_USER")
GITHUB_REPO = os.getenv("GITHUB_REPO")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
API_SECRET = os.getenv("API_SECRET")
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", 90000))

def check_auth():
    api_key = request.headers.get("X-API-Key")
    return api_key == API_SECRET

def github_api_request(method, path, data=None):
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    if method == "GET":
        response = requests.get(url, headers=headers, params={"ref": GITHUB_BRANCH})
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers, json=data)
    return response

def get_file_content(path):
    response = github_api_request("GET", path)
    if response.status_code == 200:
        content_b64 = response.json()['content']
        sha = response.json()['sha']
        content = json.loads(base64.b64decode(content_b64).decode('utf-8'))
        size = response.json()['size']
        return content, sha, size
    return None, None, 0

def save_file_content(path, content, sha=None, message="Update data"):
    content_str = json.dumps(content, indent=2)
    content_b64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')
    data = {
        "message": message,
        "content": content_b64,
        "branch": GITHUB_BRANCH
    }
    if sha:
        data["sha"] = sha
    response = github_api_request("PUT", path, data)
    return response

def get_all_data_files():
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.get(url, headers=headers, params={"ref": GITHUB_BRANCH})
    if response.status_code == 200:
        files = [f['name'] for f in response.json() if f['name'].startswith('data') and f['name'].endswith('.json')]
        return sorted(files)
    return []

def get_storage_stats():
    files = get_all_data_files()
    storage_info = []
    total_entries = 0
    added_today = 0
    today = datetime.utcnow().date().isoformat()
    
    for f in files:
        content, sha, size = get_file_content(f)
        if content:
            entries = content.get('entries', [])
            count = len(entries)
            total_entries += count
            for e in entries:
                if e.get('created_at', '').split('T')[0] == today:
                    added_today += 1
            storage_info.append({
                "file": f,
                "size": size,
                "percentage": round((size / MAX_FILE_BYTES) * 100, 2),
                "entries": count
            })
    return {
        "files": storage_info,
        "total_entries": total_entries,
        "total_files": len(files),
        "added_today": added_today,
        "max_file_bytes": MAX_FILE_BYTES
    }

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}), 200

@app.route('/api/storage', methods=['GET'])
def storage():
    return jsonify(get_storage_stats()), 200

@app.route('/api/entries', methods=['GET'])
def get_entries():
    files = get_all_data_files()
    all_entries = []
    for f in files:
        content, sha, size = get_file_content(f)
        if content:
            all_entries.extend(content.get('entries', []))
    
    # Sort by created_at desc
    all_entries.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify({
        "entries": all_entries,
        "storage": get_storage_stats()
    }), 200

@app.route('/api/entries', methods=['POST'])
def create_entry():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    if not data.get('title') or not data.get('description'):
        return jsonify({"error": "Title and Description are required"}), 400
    
    new_entry = {
        "id": str(uuid.uuid4()),
        "title": data.get('title'),
        "description": data.get('description'),
        "image": data.get('image', ''),
        "link": data.get('link', ''),
        "tags": [tag.strip() for tag in data.get('tags', '').split(',') if tag.strip()] if isinstance(data.get('tags'), str) else data.get('tags', []),
        "rating": data.get('rating', 0),
        "year": data.get('year', ''),
        "emoji": data.get('emoji', '🎬'),
        "bg": data.get('bg', ''),
        "episodes": data.get('episodes', 0),
        "seasons": data.get('seasons', 0),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    files = get_all_data_files()
    if not files:
        files = ['data1.json']
    
    target_file = files[-1]
    content, sha, size = get_file_content(target_file)
    
    if not content:
        content = {
            "meta": {"file": target_file, "created": datetime.utcnow().isoformat(), "entry_count": 0},
            "entries": []
        }
        sha = None

    # Check if we need to partition
    if size > MAX_FILE_BYTES:
        new_file_num = len(files) + 1
        target_file = f"data{new_file_num}.json"
        content = {
            "meta": {"file": target_file, "created": datetime.utcnow().isoformat(), "entry_count": 0},
            "entries": []
        }
        sha = None

    content['entries'].append(new_entry)
    content['meta']['last_updated'] = datetime.utcnow().isoformat()
    content['meta']['entry_count'] = len(content['entries'])
    
    resp = save_file_content(target_file, content, sha, message=f"Add entry: {new_entry['title']}")
    
    if resp.status_code in [200, 201]:
        return jsonify({
            "entry": new_entry,
            "storage": get_storage_stats()
        }), 201
    return jsonify({"error": "Failed to save to GitHub", "details": resp.text}), 500

@app.route('/api/entries/<id>', methods=['PUT'])
def update_entry(id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    files = get_all_data_files()
    
    for f in files:
        content, sha, size = get_file_content(f)
        if not content: continue
        
        for entry in content['entries']:
            if entry['id'] == id:
                entry.update({
                    "title": data.get('title', entry['title']),
                    "description": data.get('description', entry['description']),
                    "image": data.get('image', entry['image']),
                    "link": data.get('link', entry['link']),
                    "tags": [tag.strip() for tag in data.get('tags', '').split(',') if tag.strip()] if isinstance(data.get('tags'), str) else data.get('tags', entry['tags']),
                    "rating": data.get('rating', entry.get('rating', 0)),
                    "year": data.get('year', entry.get('year', '')),
                    "emoji": data.get('emoji', entry.get('emoji', '🎬')),
                    "bg": data.get('bg', entry.get('bg', '')),
                    "episodes": data.get('episodes', entry.get('episodes', 0)),
                    "seasons": data.get('seasons', entry.get('seasons', 0)),
                    "updated_at": datetime.utcnow().isoformat()
                })
                content['meta']['last_updated'] = datetime.utcnow().isoformat()
                save_file_content(f, content, sha, message=f"Update entry: {entry['title']}")
                return jsonify({
                    "entry": entry,
                    "storage": get_storage_stats()
                }), 200
                
    return jsonify({"error": "Entry not found"}), 404

@app.route('/api/entries/<id>', methods=['DELETE'])
def delete_entry(id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    
    files = get_all_data_files()
    for f in files:
        content, sha, size = get_file_content(f)
        if not content: continue
        
        initial_count = len(content['entries'])
        content['entries'] = [e for e in content['entries'] if e['id'] != id]
        
        if len(content['entries']) < initial_count:
            content['meta']['last_updated'] = datetime.utcnow().isoformat()
            content['meta']['entry_count'] = len(content['entries'])
            save_file_content(f, content, sha, message=f"Delete entry: {id}")
            return jsonify({
                "message": "Entry deleted",
                "storage": get_storage_stats()
            }), 200
            
    return jsonify({"error": "Entry not found"}), 404

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').lower()
    files = get_all_data_files()
    results = []
    for f in files:
        content, sha, size = get_file_content(f)
        if content:
            for e in content['entries']:
                if query in e['title'].lower() or query in e['description'].lower() or any(query in t.lower() for t in e['tags']):
                    results.append(e)
    return jsonify({
        "results": results,
        "storage": get_storage_stats()
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
