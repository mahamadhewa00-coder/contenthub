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

## ⚙️ How to Update Your Site

To add new information to your site for free:
1. Run the professional manager:
   ```bash
   python content_manager.py
   ```
2. Follow the prompts to enter Title, Description, and **Comments**.
3. The script will automatically push the update to GitHub.
4. Refresh your website – the new content will appear instantly! 🚀

---

## 📦 Features
- **Zero Cost**: No server hosting required.
- **Comments/Notes**: Add private or public notes to each entry.
- **Instant Updates**: Uses cache-busting to show new data immediately.
- **Mobile First**: The site looks great on all devices.

## 📄 License
MIT
