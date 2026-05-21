# ContentHub 🚀

A complete full-stack web application for content curation, now with a **100% Free** "No-Backend" option.

## Architecture
- **Frontend**: Pure HTML/CSS/JS (GitHub Pages)
- **Data Storage**: GitHub repository with JSON files
- **Admin**: Standalone Python script (Update your site from your computer!)

---

## 🛠️ Step-by-Step Deployment Guide (100% Free)

### Step 1: GitHub Setup
1. Create a **Public** repository named `contenthub`.
2. Upload the project files: `index.html`, `style.css`, `app.js`, and `data1.json`.
3. Generate a **GitHub Personal Access Token (classic)**:
   - Go to Settings -> Developer Settings -> Personal access tokens -> Tokens (classic).
   - Generate a new token with `repo` scope. **Save this token!**

### Step 2: Enable GitHub Pages
1. In your `contenthub` code repository, go to **Settings -> Pages**.
2. Under **Build and deployment**, select **Branch: main** and folder **/(root)**.
3. Click **Save**. Your site will be live!

### Step 3: Configure Local Admin
1. On your computer, make sure you have Python installed.
2. Create a `.env` file in the project folder with:
   ```env
   GITHUB_TOKEN=your_token_here
   GITHUB_USER=your_username
   GITHUB_REPO=contenthub
   ```
3. Run `pip install requests python-dotenv`.

---

## 🤖 Advanced Option: Telegram Bot + Database (Real-time)

If you want to update your site directly from Telegram without using GitHub for storage:

### Step 1: Supabase Setup (Free Database)
1. Go to [Supabase](https://supabase.com/) and create a free project.
2. In the **SQL Editor**, run this command to create your table:
   ```sql
   create table entries (
     id uuid default uuid_generate_v4() primary key,
     title text not null,
     description text,
     comments text,
     image text,
     link text,
     tags text[],
     created_at timestamp with time zone default now()
   );
   ```
3. Get your **Project URL** and **Anon Key** from Settings -> API.

### Step 2: Telegram Bot Setup
1. Message [@BotFather](https://t.me/botfather) on Telegram.
2. Use `/newbot` and follow instructions to get your **Bot Token**.

### Step 3: Configure and Run
1. In your `.env` file, add:
   ```env
   TELEGRAM_TOKEN=your_bot_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```
2. Run the bot: `python telegram_admin.py`
3. In the website **Admin Panel** -> Settings, paste your Supabase URL and Key.
4. Now, simply send `/add Title | Description | Link` to your bot!

---

## ⚙️ How to Update Your Site (GitHub Method)

If you prefer the GitHub method:
1. Run: `python content_manager.py`
2. Enter the details as prompted.
3. Refresh your website – the new content will appear! 🚀

---

## 📦 Features
- **Zero Cost**: No server hosting required.
- **Comments/Notes**: Add private or public notes to each entry.
- **Instant Updates**: Uses cache-busting to show new data immediately.
- **Mobile First**: The site looks great on all devices.

## 📄 License
MIT
