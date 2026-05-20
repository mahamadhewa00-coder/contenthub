# ContentHub 🚀

A complete full-stack web application for content curation.

## Architecture
- **Frontend & Admin**: Pure HTML/CSS/JS (GitHub Pages)
- **Backend**: Python Flask API (Render.com)
- **Database**: GitHub repository with partitioned JSON files

---

## 🛠️ Step-by-Step Deployment Guide (100% Free)

### Step 1: GitHub for Data (The Database)
1. Create a **Private** repository named `contenthub-data`.
2. Upload the `data1.json` file from this project to the repository.
3. Generate a **GitHub Personal Access Token (classic)**:
   - Go to Settings -> Developer Settings -> Personal access tokens -> Tokens (classic).
   - Generate a new token with `repo` scope. **Save this token!**

### Step 2: GitHub for Code
1. Create a **Public** repository named `contenthub`.
2. Upload all other files (`index.html`, `style.css`, `app.js`, `admin.html`, `admin.css`, `admin.js`, `backend.py`, `requirements.txt`, `render.yaml`).

### Step 3: Enable GitHub Pages
1. In your `contenthub` code repository, go to **Settings -> Pages**.
2. Under **Build and deployment**, select **Branch: main** and folder **/(root)**.
3. Click **Save**. Your site will be at `https://<your-username>.github.io/contenthub/`.

### Step 4: Render.com for Backend
1. Sign up/Login to [Render.com](https://render.com) using your GitHub account.
2. Click **New +** and select **Web Service**.
3. Connect your `contenthub` code repository.
4. Render will automatically detect `render.yaml`.
5. Add the following **Environment Variables**:
   - `GITHUB_TOKEN`: Your GitHub token from Step 1.
   - `GITHUB_USER`: Your GitHub username.
   - `GITHUB_REPO`: `contenthub-data`.
   - `API_SECRET`: A secure password of your choice for the API.
6. Once deployed, copy your Render service URL (e.g., `https://contenthub-backend.onrender.com`).

---

## ⚙️ Connecting Everything

### 1. Update Public Site (`app.js`)
Edit the `CONFIG` block at the top of `app.js`:
```javascript
const CONFIG = {
    GITHUB_USER: "your-username",
    GITHUB_REPO: "contenthub-data",
    GITHUB_BRANCH: "main",
    // ...
};
```

### 2. Configure Admin Panel (`admin.js`)
Edit the `ADMIN_PASSWORD` constant at the top of `admin.js`:
```javascript
const ADMIN_PASSWORD = "your-secure-admin-password";
```

### 3. Connect Admin to API
1. Open your live admin panel: `https://<your-username>.github.io/contenthub/admin.html`.
2. Login with your `ADMIN_PASSWORD`.
3. In the **Configuration** section at the bottom of the drawer:
   - **Backend API URL**: Paste your Render URL.
   - **API Secret Key**: Paste your `API_SECRET`.
4. Click **Save Entry** (even if empty) to save these settings to your browser.

---

## 📦 Features
- **Auto-partitioning**: Backend creates `data2.json`, `data3.json`, etc., when files exceed 90KB.
- **Mobile First**: Admin panel works perfectly on phones.
- **Search & Filter**: Instant search and tag filtering on the public site.
- **Storage Status**: Live indicator of JSON file size and capacity.

## 📄 License
MIT
