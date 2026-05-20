#!/usr/bin/env python3
"""
ContentHub Professional Manager
A high-grade CLI tool for managing your ContentHub database on GitHub.
"""

import os
import sys
import json
import uuid
import base64
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("❌ Critical Error: Missing dependencies.")
    print("Please run: pip install requests python-dotenv")
    sys.exit(1)

# Load configuration
load_dotenv()

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class ContentManager:
    """Handles all interactions with the GitHub-hosted JSON database."""

    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        self.user = os.getenv("GITHUB_USER")
        self.repo = os.getenv("GITHUB_REPO")
        self.branch = os.getenv("GITHUB_BRANCH", "main")
        self.filename = "data1.json"

        self._validate_config()
        self.base_url = f"https://api.github.com/repos/{self.user}/{self.repo}/contents/{self.filename}"
        self.headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def _validate_config(self):
        missing = []
        if not self.token: missing.append("GITHUB_TOKEN")
        if not self.user: missing.append("GITHUB_USER")
        if not self.repo: missing.append("GITHUB_REPO")

        if missing:
            logger.error(f"Missing environment variables: {', '.join(missing)}")
            print("\n💡 Tip: Create a .env file with the following:")
            print("GITHUB_TOKEN=your_personal_access_token")
            print("GITHUB_USER=your_github_username")
            print("GITHUB_REPO=your_repo_name")
            sys.exit(1)

    def _get_raw_data(self) -> Tuple[Dict[str, Any], Optional[str]]:
        """Fetches the current JSON content and its SHA from GitHub."""
        try:
            response = requests.get(self.base_url, headers=self.headers, params={"ref": self.branch}, timeout=10)
            if response.status_code == 200:
                data = response.json()
                sha = data['sha']
                content_decoded = base64.b64decode(data['content']).decode('utf-8')
                return json.loads(content_decoded), sha
            elif response.status_code == 404:
                return {"meta": {}, "entries": []}, None
            else:
                logger.error(f"Failed to fetch data: {response.status_code} - {response.text}")
                return {"meta": {}, "entries": []}, None
        except Exception as e:
            logger.error(f"Network error during fetch: {e}")
            return {"meta": {}, "entries": []}, None

    def _push_data(self, content: Dict[str, Any], sha: Optional[str], message: str) -> bool:
        """Uploads the updated JSON content to GitHub."""
        try:
            content_json = json.dumps(content, indent=2, ensure_ascii=False)
            content_b64 = base64.b64encode(content_json.encode('utf-8')).decode('utf-8')

            payload = {
                "message": message,
                "content": content_b64,
                "branch": self.branch
            }
            if sha:
                payload["sha"] = sha

            response = requests.put(self.base_url, headers=self.headers, json=payload, timeout=15)
            if response.status_code in [200, 201]:
                return True
            else:
                logger.error(f"Failed to push data: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Network error during push: {e}")
            return False

    def list_entries(self):
        """Displays all current entries in a formatted list."""
        data, _ = self._get_raw_data()
        entries = data.get("entries", [])

        print(f"\n--- Current Content ({len(entries)} items) ---")
        if not entries:
            print("No entries found.")
            return

        for i, entry in enumerate(entries):
            title = entry.get("title", "Untitled")
            tags = ", ".join(entry.get("tags", []))
            print(f"[{i}] {title} | Tags: {tags}")

    def add_entry(self):
        """Interactive prompt to add a new content entry."""
        print("\n--- Add New Resource ---")
        title = self._prompt("Title", required=True)
        description = self._prompt("Description", required=True)
        comments = self._prompt("Comments/Notes")
        link = self._prompt("Link URL")
        image = self._prompt("Image URL")
        tags_raw = self._prompt("Tags (comma separated)")
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

        new_entry = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "comments": comments,
            "link": link,
            "image": image,
            "tags": tags,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        data, sha = self._get_raw_data()
        if "entries" not in data: data["entries"] = []
        data["entries"].insert(0, new_entry)

        # Update Metadata
        data["meta"] = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "entry_count": len(data["entries"]),
            "updated_by": "Professional Content Manager"
        }

        print("📡 Syncing with GitHub...")
        if self._push_data(data, sha, f"Add resource: {title}"):
            print("✅ Successfully added and synced.")
        else:
            print("❌ Sync failed. Check logs.")

    def delete_entry(self):
        """Interactive prompt to delete an entry by its index."""
        data, sha = self._get_raw_data()
        entries = data.get("entries", [])

        if not entries:
            print("Nothing to delete.")
            return

        self.list_entries()
        try:
            idx = int(self._prompt("Enter the index number to delete", required=True))
            if 0 <= idx < len(entries):
                removed = entries.pop(idx)
                data["meta"]["last_updated"] = datetime.now(timezone.utc).isoformat()
                data["meta"]["entry_count"] = len(entries)

                print(f"⚠️ Deleting '{removed['title']}'...")
                if self._push_data(data, sha, f"Delete resource: {removed['title']}"):
                    print("✅ Deleted successfully.")
                else:
                    print("❌ Delete failed.")
            else:
                print("❌ Invalid index.")
        except ValueError:
            print("❌ Please enter a valid number.")

    def _prompt(self, label: str, required: bool = False) -> str:
        while True:
            val = input(f"{label}{' (Required)' if required else ''}: ").strip()
            if required and not val:
                print(f"   Error: {label} cannot be empty.")
                continue
            return val

def show_menu():
    print("\n" + "="*40)
    print("   CONTENTHUB PROFESSIONAL MANAGER")
    print("="*40)
    print("1. 📋 View All Resources")
    print("2. ➕ Add New Resource")
    print("3. 🗑️ Delete Resource")
    print("4. 🚪 Exit")
    return input("\nSelect an option: ").strip()

def main():
    manager = ContentManager()

    while True:
        choice = show_menu()
        if choice == '1':
            manager.list_entries()
        elif choice == '2':
            manager.add_entry()
        elif choice == '3':
            manager.delete_entry()
        elif choice == '4' or choice.lower() == 'exit':
            print("Goodbye!")
            break
        else:
            print("Invalid selection. Try again.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
