/**
 * ComicNight S-Tier Core — Global Market Standard (2026)
 * Architect: Senior Full-Stack Lead
 */

const SUPABASE_CONFIG = {
    url: 'https://cnwiqvebnmpmhilwosot.supabase.co',
    key: 'sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU'
};

const CACHE_CONFIG = {
    DATA: 'cn_v2_data',
    SETTINGS: 'cn_v2_settings',
    EXPIRY: 1000 * 60 * 30 // 30 Minutes
};

/**
 * ── ARCHITECTURAL ENGINE ──
 */
class ComicNightApp {
    constructor() {
        this.sb = null;
        this.entries = [];
        this.currentIdx = 0;
        this.isInitialized = false;

        this.init();
    }

    async init() {
        this.initSupabase();
        this.setupGlobalListeners();

        // Parallelized Boot Sequence
        await this.synchronize();
        this.isInitialized = true;
    }

    initSupabase() {
        if (window.supabase) {
            this.sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        }
    }

    /**
     * ── DATA INTEGRITY LAYER ──
     */
    async synchronize() {
        this.updateStatus('syncing');

        try {
            const [comicsRes, settingsRes] = await Promise.all([
                this.sb.from('comics').select('*').order('created_at', { ascending: false }),
                this.sb.from('settings').select('*').single()
            ]);

            if (comicsRes.data) {
                this.entries = this.sanitizeData(comicsRes.data);
                this.persist(CACHE_CONFIG.DATA, this.entries);
            }

            if (settingsRes.data) {
                this.applySettings(settingsRes.data);
                this.persist(CACHE_CONFIG.SETTINGS, settingsRes.data);
            }

            this.updateStatus('online');
        } catch (e) {
            console.error("Connectivity Interrupted. Invoking Fail-Safe...");
            this.entries = this.loadCached(CACHE_CONFIG.DATA) || [];
            this.updateStatus('offline');
        }

        this.render();
    }

    sanitizeData(data) {
        return data.map(item => ({
            id: item.id,
            title: item.title || "Unknown Title",
            description: item.description || "No description provided.",
            cover_url: this.validateImage(item.cover_url),
            chapters: item.chapters || 0,
            volumes: item.volumes || 0,
            rating: parseFloat(item.rating) || 0,
            year: item.year || "2024",
            tags: item.tags || [],
            bg: item.bg || "#12122c",
            emoji: item.emoji || "📖",
            is_active: item.is_active !== false
        })).filter(e => e.is_active);
    }

    validateImage(url) {
        if (!url || !url.startsWith('http')) {
            return 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop';
        }
        return url;
    }

    /**
     * ── RENDERING ENGINE (S-TIER) ──
     */
    render() {
        if (this.entries.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.renderHeroStack();
        this.renderGrid();
    }

    /**
     * ── BULLETPROOF IMAGE RENDERING ENGINE ──
     */
    renderPoster(url, title, emoji) {
        const wrapper = document.createElement('div');
        wrapper.className = 'poster-wrapper';
        wrapper.style.position = 'relative';

        // 1. Validation Layer
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            return this.getFallbackUI(title, emoji);
        }

        // 2. Skeleton Loading State
        const skeleton = document.createElement('div');
        skeleton.className = 'image-skeleton';
        wrapper.appendChild(skeleton);

        // 3. Image with Handlers
        const img = document.createElement('img');
        img.className = 'poster-img';
        img.src = url;
        img.loading = 'lazy';
        img.alt = title;

        img.onload = () => {
            img.classList.add('loaded');
            skeleton.style.opacity = '0';
            setTimeout(() => skeleton.remove(), 600);
        };

        // 4. Zero-Broken-Images Handler
        img.onerror = () => {
            wrapper.innerHTML = '';
            wrapper.appendChild(this.getFallbackUI(title, emoji));
        };

        wrapper.appendChild(img);
        return wrapper;
    }

    getFallbackUI(title, emoji) {
        const fallback = document.createElement('div');
        fallback.className = 'fallback-poster';
        fallback.innerHTML = `
            <div class="fallback-emoji">${emoji || '📖'}</div>
            <div class="fallback-title">${title}</div>
        `;
        return fallback;
    }

    renderHeroStack() {
        const container = document.getElementById('stackContainer');
        if (!container) return;

        container.innerHTML = '';
        const limit = Math.min(3, this.entries.length);

        for (let i = 0; i < limit; i++) {
            const entry = this.entries[(this.currentIdx + i) % this.entries.length];
            const card = document.createElement('div');
            card.className = `stack-card card-pos-${i}`;

            // Integrate Rendering Engine
            const poster = this.renderPoster(entry.cover_url, entry.title, entry.emoji);
            poster.className = 'card-image'; // Override class for stack specific styling

            card.appendChild(poster);

            const overlay = document.createElement('div');
            overlay.className = 'card-overlay';
            overlay.innerHTML = `
                <div class="comic-title">${entry.title}</div>
                <div class="comic-meta">⭐ ${entry.rating} · ${entry.year}</div>
            `;
            card.appendChild(overlay);

            if (i === 0) card.onclick = () => this.openDetails(entry);
            container.appendChild(card);
        }
    }

    renderGrid() {
        const grid = document.getElementById('trendingGrid');
        if (!grid) return;
        grid.innerHTML = '';

        this.entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'comic-card';
            card.onclick = () => this.openDetailsById(entry.id);

            const poster = this.renderPoster(entry.cover_url, entry.title, entry.emoji);
            card.appendChild(poster);

            const body = document.createElement('div');
            body.className = 'card-body';
            body.innerHTML = `
                <div class="title">${entry.title}</div>
                <div class="card-stats">
                    <span>${entry.chapters} Ch.</span>
                    <span class="score">⭐ ${entry.rating}</span>
                </div>
            `;
            card.appendChild(body);
            grid.appendChild(card);
        });
    }

    /**
     * ── EXPERIENCE LAYER ──
     */
    openDetails(entry) {
        const modal = document.getElementById('modalOverlay');
        if (!modal) return;

        document.getElementById('modalTitle').textContent = entry.title;
        document.getElementById('modalDesc').textContent = entry.description;
        document.getElementById('modalBg').style.backgroundImage = `url(${entry.cover_url})`;

        const meta = document.getElementById('modalMeta');
        meta.innerHTML = `
            <div class="meta-item"><div class="meta-val">${entry.rating}</div><div class="meta-lbl">Rating</div></div>
            <div class="meta-item"><div class="meta-val">${entry.chapters}</div><div class="meta-lbl">Chapters</div></div>
            <div class="meta-item"><div class="meta-val">${entry.volumes}</div><div class="meta-lbl">Volumes</div></div>
            <div class="meta-item"><div class="meta-val">${entry.year}</div><div class="meta-lbl">Year</div></div>
        `;

        modal.classList.add('open');
    }

    openDetailsById(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) this.openDetails(entry);
    }

    setupGlobalListeners() {
        document.addEventListener('click', e => {
            if (e.target.id === 'modalClose' || e.target.id === 'modalOverlay') {
                document.getElementById('modalOverlay').classList.remove('open');
            }
            if (e.target.id === 'nextBtn') this.rotate(1);
            if (e.target.id === 'prevBtn') this.rotate(-1);
        });
    }

    rotate(dir) {
        this.currentIdx = (this.currentIdx + dir + this.entries.length) % this.entries.length;
        this.renderHeroStack();
    }

    /**
     * ── PERSISTENCE & SETTINGS ──
     */
    persist(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
    loadCached(key) { return JSON.parse(localStorage.getItem(key)); }

    applySettings(s) {
        if (s.maintenance_mode) document.getElementById('maintenance-overlay').style.display = 'flex';
        if (s.announcement) {
            const bar = document.getElementById('announcement-bar');
            bar.style.display = 'block';
            document.getElementById('announcement-text').textContent = s.announcement;
        }
    }

    updateStatus(type) {
        const text = document.getElementById('status-text');
        const dot = document.getElementById('status-dot');
        if (!text || !dot) return;

        if (type === 'online') { text.textContent = "Archive Live"; dot.style.background = "#22c55e"; }
        if (type === 'offline') { text.textContent = "Offline Mode"; dot.style.background = "#ef4444"; }
    }

    renderEmptyState() { /* Premium Empty State Logic */ }
}

const app = new ComicNightApp();
