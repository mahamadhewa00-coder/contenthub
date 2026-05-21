#!/usr/bin/env python3
"""
ContentHub Telegram Bot Admin
Allows managing Supabase content via Telegram commands.
"""

import os
import logging
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load config
load_dotenv()

# Configuration
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID") # Optional: Only allow specific user

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def supabase_request(method, data=None):
    url = f"{SUPABASE_URL}/rest/v1/entries"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    if method == "POST":
        return requests.post(url, headers=headers, json=data)
    elif method == "GET":
        return requests.get(f"{url}?select=*&order=created_at.desc", headers=headers)
    return None

def send_telegram_msg(chat_id, text):
    url = f"https://api.github.com/repos/mahamadhewa00-coder/contenthub-data/contents/data1.json" # Not this
    # Correction: Use Telegram API
    tg_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    requests.post(tg_url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})

def handle_update(update):
    if "message" not in update: return
    msg = update["message"]
    chat_id = msg["chat"]["id"]
    text = msg.get("text", "")

    # Security Check
    if ADMIN_CHAT_ID and str(chat_id) != str(ADMIN_CHAT_ID):
        send_telegram_msg(chat_id, "🚫 Unauthorized access.")
        return

    if text.startswith("/start"):
        send_telegram_msg(chat_id, "🚀 *Welcome to ContentHub Bot!* \nUse `/add Title | Description | Link` to add new content.")

    elif text.startswith("/add"):
        try:
            parts = text.replace("/add", "").split("|")
            if len(parts) < 2:
                send_telegram_msg(chat_id, "❌ Usage: `/add Title | Description | Link (opt) | Tags (opt)`")
                return

            entry = {
                "title": parts[0].strip(),
                "description": parts[1].strip(),
                "link": parts[2].strip() if len(parts) > 2 else "",
                "tags": [t.strip() for t in parts[3].split(",")] if len(parts) > 3 else [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            res = supabase_request("POST", entry)
            if res.status_code in [200, 201]:
                send_telegram_msg(chat_id, "✅ *Success!* Content added to website.")
            else:
                send_telegram_msg(chat_id, f"❌ Error: {res.text}")
        except Exception as e:
            send_telegram_msg(chat_id, f"⚠️ Error: {str(e)}")

    elif text.startswith("/list"):
        res = supabase_request("GET")
        if res.status_code == 200:
            entries = res.json()[:10] # Show last 10
            reply = "*Last 10 Entries:*\n"
            for e in entries:
                reply += f"• {e['title']}\n"
            send_telegram_msg(chat_id, reply)
        else:
            send_telegram_msg(chat_id, "❌ Failed to fetch list.")

def main():
    if not all([TELEGRAM_TOKEN, SUPABASE_URL, SUPABASE_KEY]):
        print("❌ Error: Missing env variables (TELEGRAM_TOKEN, SUPABASE_URL, SUPABASE_KEY)")
        return

    print("🤖 ContentHub Telegram Bot is running...")
    last_update_id = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
            res = requests.get(url, params={"offset": last_update_id + 1, "timeout": 30})
            updates = res.json().get("result", [])
            for update in updates:
                handle_update(update)
                last_update_id = update["update_id"]
        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"Poll Error: {e}")

if __name__ == "__main__":
    main()
