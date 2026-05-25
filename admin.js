/**
 * ComicNight Pro Dashboard — Enterprise Control Engine (2026)
 * Architect: Senior Full-Stack Lead
 */

const ADMIN_PASSWORD = "raven00$A";
const CONFIG = {
    SUPABASE_URL: "https://cnwiqvebnmpmhilwosot.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU"
};

/**
 * ── PRO DASHBOARD CLASS ──
 */
class ComicNightAdmin {
    constructor() {
        this.sb = null;
        this.entries = [];
        this.currentId = null;
        this.isLoggedIn = false;

        this.init();
    }

    init() {
        this.initSupabase();
        this.setupAuth();
        this.attachEvents();

        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            this.showDashboard();
        }
    }

    initSupabase() {
        if (window.supabase) {
            this.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        }
    }

    setupAuth() {
        const loginBtn = document.getElementById('login-btn');
        const passInput = document.getElementById('admin-password');

        loginBtn?.addEventListener('click', () => this.handleLogin(passInput.value));
        passInput?.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleLogin(passInput.value));

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            location.reload();
        });
    }

    handleLogin(pass) {
        if (pass === ADMIN_PASSWORD) {
            sessionStorage.setItem('isLoggedIn', 'true');
            this.showDashboard();
        } else {
            this.showToast("Unauthorized Access", "error");
        }
    }

    async showDashboard() {
        document.getElementById('login-gate').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        await this.loadData();
    }

    /**
     * ── DATA ENGINE ──
     */
    async loadData() {
        try {
            const { data, error } = await this.sb.from('comics').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            this.entries = data;
            this.render();
            this.updateStats();
        } catch (e) {
            this.showToast(e.message, "error");
        }
    }

    render() {
        const list = document.getElementById('admin-entry-list');
        if (!list) return;

        list.innerHTML = this.entries.map(entry => `
            <div class="entry-card">
                <img src="${entry.cover_url}" class="entry-img" onerror="this.src='https://via.placeholder.com/80x110'">
                <div class="entry-info">
                    <h4>${entry.title}</h4>
                    <p>${entry.chapters} Chapters · ${entry.volumes} Vol · ${entry.year}</p>
                </div>
                <div class="entry-actions">
                    <button class="edit-btn" onclick="admin.openDrawer('${entry.id}')"><i class="fas fa-pen"></i></button>
                    <button class="delete-btn" onclick="admin.confirmDelete('${entry.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        document.getElementById('stat-total').textContent = this.entries.length;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('stat-today').textContent = this.entries.filter(e => e.created_at?.startsWith(today)).length;
    }

    /**
     * ── ATOMIC FORM HANDLING ──
     */
    attachEvents() {
        document.getElementById('add-entry-btn')?.addEventListener('click', () => this.openDrawer());
        document.getElementById('close-drawer')?.addEventListener('click', () => this.closeDrawer());
        document.getElementById('form-overlay')?.addEventListener('click', () => this.closeDrawer());
        document.getElementById('entry-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Settings Sync
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.updateSettings());
    }

    openDrawer(id = null) {
        this.currentId = id;
        const drawer = document.getElementById('entry-drawer');
        const overlay = document.getElementById('form-overlay');
        const form = document.getElementById('entry-form');

        form.reset();
        document.getElementById('drawer-title').textContent = id ? "Refine Story Archive" : "Integrate New Work";

        if (id) {
            const entry = this.entries.find(e => e.id === id);
            if (entry) {
                // Precise mapping
                document.getElementById('form-title').value = entry.title;
                document.getElementById('form-description').value = entry.description;
                document.getElementById('form-chapters').value = entry.chapters;
                document.getElementById('form-volumes').value = entry.volumes;
                document.getElementById('form-rating').value = entry.rating;
                document.getElementById('form-year').value = entry.year;
                document.getElementById('form-image').value = entry.cover_url;
                document.getElementById('form-link').value = entry.link;
                document.getElementById('form-tags').value = entry.tags.join(', ');
                document.getElementById('form-emoji').value = entry.emoji;
                document.getElementById('form-bg').value = entry.bg;
                document.getElementById('form-active').checked = entry.is_active;
            }
        }

        drawer.classList.add('active');
        overlay.classList.add('active');
    }

    closeDrawer() {
        document.getElementById('entry-drawer').classList.remove('active');
        document.getElementById('form-overlay').classList.remove('active');
    }

    async handleSubmit(e) {
        e.preventDefault();
        const file = document.getElementById('form-file-input').files[0];
        let cover_url = document.getElementById('form-image').value;

        try {
            if (file) {
                this.showToast("Uploading Core Media...", "info");
                const path = `covers/${Date.now()}_${file.name}`;
                const { error: upErr } = await this.sb.storage.from('comic-covers').upload(path, file);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = this.sb.storage.from('comic-covers').getPublicUrl(path);
                cover_url = publicUrl;
            }

            const payload = {
                title: document.getElementById('form-title').value,
                description: document.getElementById('form-description').value,
                chapters: parseInt(document.getElementById('form-chapters').value) || 0,
                volumes: parseInt(document.getElementById('form-volumes').value) || 0,
                rating: parseFloat(document.getElementById('form-rating').value) || 0,
                year: parseInt(document.getElementById('form-year').value) || 2024,
                cover_url: cover_url,
                link: document.getElementById('form-link').value,
                tags: document.getElementById('form-tags').value.split(',').map(t => t.trim()),
                emoji: document.getElementById('form-emoji').value || '📖',
                bg: document.getElementById('form-bg').value || '#12122c',
                is_active: document.getElementById('form-active').checked
            };

            const result = this.currentId
                ? await this.sb.from('comics').update(payload).eq('id', this.currentId)
                : await this.sb.from('comics').insert([payload]);

            if (result.error) throw result.error;

            this.showToast("Data Cluster Synchronized", "success");
            this.closeDrawer();
            await this.loadData();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async updateSettings() {
        const payload = {
            id: 1,
            maintenance_mode: document.getElementById('setting-maintenance').checked,
            announcement: document.getElementById('setting-announcement').value,
            video_ad_url: document.getElementById('setting-video').value
        };

        const { error } = await this.sb.from('settings').upsert(payload);
        if (error) this.showToast(error.message, "error");
        else this.showToast("Global Protocol Updated", "success");
    }

    async confirmDelete(id) {
        if (confirm("Permanently Eradicate this Entry?")) {
            const { error } = await this.sb.from('comics').delete().eq('id', id);
            if (error) this.showToast(error.message, "error");
            else {
                this.showToast("Record Purged", "success");
                await this.loadData();
            }
        }
    }

    showToast(msg, type = "success") {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span>${msg}</span>`;
        container?.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }
}

const admin = new ComicNightAdmin();
