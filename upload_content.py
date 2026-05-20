import os
import json
import uuid
import base64
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load variables from .env file if it exists
load_dotenv()

# --- CONFIGURATION ---
# You can set these here or in a .env file
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_USER = os.getenv("GITHUB_USER")
GITHUB_REPO = os.getenv("GITHUB_REPO")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
DATA_FILE = "data1.json"

def get_input(prompt, required=False):
    while True:
        val = input(prompt).strip()
        if required and not val:
            print("Error: This field is required.")
            continue
        return val

def github_request(method, path, data=None):
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    if method == "GET":
        return requests.get(url, headers=headers, params={"ref": GITHUB_BRANCH})
    elif method == "PUT":
        return requests.put(url, headers=headers, json=data)
    return None

def main():
    print("🚀 ContentHub - Data Uploader Script")
    print("-" * 40)

    if not all([GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO]):
        print("❌ Error: Missing GITHUB_TOKEN, GITHUB_USER, or GITHUB_REPO in environment variables.")
        return

    # 1. Collect Data
    title = get_input("Enter Title (Required): ", required=True)
    description = get_input("Enter Description (Required): ", required=True)
    comments = get_input("Enter Comments/Notes (Optional): ")
    image = get_input("Enter Image URL (Optional): ")
    link = get_input("Enter Link URL (Optional): ")
    tags_str = get_input("Enter Tags (comma separated): ")
    tags = [t.strip() for t in tags_str.split(",") if t.strip()]

    new_entry = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "comments": comments,
        "image": image,
        "link": link,
        "tags": tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    print(f"\n📡 Connecting to GitHub ({GITHUB_USER}/{GITHUB_REPO})...")

    # 2. Get existing file
    resp = github_request("GET", DATA_FILE)
    sha = None
    content = {"meta": {"file": DATA_FILE, "created": datetime.now(timezone.utc).isoformat()}, "entries": []}

    if resp.status_code == 200:
        file_data = resp.json()
        sha = file_data['sha']
        content_b64 = file_data['content']
        content = json.loads(base64.b64decode(content_b64).decode('utf-8'))
    elif resp.status_code == 404:
        print("ℹ️ File not found. Creating new data1.json...")
    else:
        print(f"❌ Failed to fetch data: {resp.status_code}")
        print(resp.text)
        return

    # 3. Update Content
    if "entries" not in content: content["entries"] = []
    content["entries"].append(new_entry)

    # Update Meta
    if "meta" not in content: content["meta"] = {}
    content["meta"]["last_updated"] = datetime.now(timezone.utc).isoformat()
    content["meta"]["entry_count"] = len(content["entries"])

    # 4. Upload back to GitHub
    content_str = json.dumps(content, indent=2)
    content_b64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')

    payload = {
        "message": f"Add entry: {title}",
        "content": content_b64,
        "branch": GITHUB_BRANCH
    }
    if sha:
        payload["sha"] = sha

    print("📤 Uploading new data...")
    put_resp = github_request("PUT", DATA_FILE, payload)

    if put_resp.status_code in [200, 201]:
        print("\n✅ SUCCESS! Information added and uploaded to GitHub.")
        print(f"🔗 View changes at: https://github.com/{GITHUB_USER}/{GITHUB_REPO}/blob/{GITHUB_BRANCH}/{DATA_FILE}")
    else:
        print(f"\n❌ FAILED to upload: {put_resp.status_code}")
        print(put_resp.text)

if __name__ == "__main__":
    main()
