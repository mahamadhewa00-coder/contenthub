# ComicNight 📖 — Full-Stack Comic Library

A modern, serverless comic and manga library built with a high-fidelity interactive UI and Supabase integration.

## 🚀 Deployment Guide (100% Free)

### 1. Database Setup (Supabase)
1. Sign up at [Supabase](https://supabase.com/).
2. Create a new project.
3. **SQL Setup:** Go to the SQL Editor and run:
   ```sql
   create table comics (
     id uuid default uuid_generate_v4() primary key,
     title text not null,
     description text,
     cover_url text,
     link text,
     tags text[],
     rating float8,
     year int4,
     emoji text,
     bg text,
     episodes int4,
     seasons int4,
     is_active boolean default true,
     created_at timestamp with time zone default now()
   );

   create table settings (
     id int primary key default 1,
     maintenance_mode boolean default false,
     announcement text,
     video_ad_url text,
     updated_at timestamp with time zone default now()
   );

   insert into settings (id, maintenance_mode, announcement) values (1, false, 'Welcome to ComicNight!');
   ```
4. **Storage Setup:** Go to "Storage", create a bucket named `comic-covers`, and set it to **Public**.

### 2. Connect Your App
1. Get your **Project URL** and **Anon Key** from Supabase Settings -> API.
2. Open `app.js` and paste them into the `SUPABASE_URL` and `SUPABASE_KEY` variables.

### 3. Hosting on Netlify (No GitHub link!)
If you don't want to use GitHub and want a clean link:
1. Put all your project files into one folder on your computer.
2. Go to [Netlify Drop](https://app.netlify.com/drop).
3. Drag and drop your folder.
4. Netlify will give you a random link like `https://shiny-comic-123.netlify.app`.
5. You can change this name in "Site Settings" to something like `https://comicnight-v1.netlify.app`.

### 4. Admin Panel
- Access your dashboard at: `your-netlify-link.com/admin.html`
- Login Password: `raven00$A`
- **First Time:** When adding your first book, enter your Supabase URL/Key in the settings at the bottom of the admin form.

## ✨ Features
- **Dynamic UI:** Draggable card stack for featured content.
- **Maintenance Mode:** Toggle from admin to show a "Work in Progress" screen.
- **Image Uploads:** Upload covers directly to Supabase from the browser.
- **Promo System:** Display a video trailer or ad via the admin settings.

## 📄 License
MIT
