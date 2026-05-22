/**
 * CineNight Frontend Logic
 * Fetches data from the backend API
 */

const CONFIG = {
    // These should ideally be set in a way that doesn't require editing app.js
    // For now, we'll try to get them from localStorage or use defaults
    API_URL: localStorage.getItem('apiUrl') || '',
    // Usually the public site might fetch from a public endpoint or directly from GitHub
    // But since the original app.js used GITHUB_USER/REPO, we will maintain that fallback
    GITHUB_USER: "mahamadhewa00-coder",
    GITHUB_REPO: "contenthub-data",
    GITHUB_BRANCH: "main",
    DATA_FILE: "data1.json",
    get rawBaseUrl() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USER}/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}`;
    }
};

let entries = [];
let currentIdx = 0;
let isDragging = false, dragStartX = 0, dragDelta = 0;
let autoTimer;

// ── Initialize ──
async function init() {
    await loadEntries();
    if (entries.length > 0) {
        buildStack();
        buildTrending();
        startAutoRotate();
    } else {
        document.getElementById('stackContainer').innerHTML = '<div style="text-align: center; padding-top: 100px; color: var(--muted);">No comics found. Add some in the Admin panel!</div>';
    }
    setupSearch();
}

async function loadEntries() {
    try {
        let data;
        // Try to fetch from Backend API first if configured
        if (CONFIG.API_URL) {
            const resp = await fetch(`${CONFIG.API_URL}/api/entries`);
            if (resp.ok) {
                const json = await resp.json();
                data = json.entries;
            }
        }

        // Fallback to GitHub raw JSON
        if (!data) {
            const resp = await fetch(`${CONFIG.rawBaseUrl}/${CONFIG.DATA_FILE}?t=${Date.now()}`);
            if (resp.ok) {
                const json = await resp.json();
                data = Array.isArray(json) ? json : (json.entries || []);
            }
        }

        if (data) {
            entries = data.map(m => ({
                id: m.id,
                title: m.title,
                emoji: m.emoji || "📖",
                rating: m.rating || 0,
                year: m.year || "",
                genre: Array.isArray(m.tags) ? m.tags : (m.tags ? m.tags.split(',').map(t => t.trim()) : []),
                desc: m.description,
                bg: m.bg || "linear-gradient(160deg, #1a1030 0%, #0f1a30 100%)",
                image: m.image,
                link: m.link,
                episodes: m.episodes || 0,
                seasons: m.seasons || 0
            }));
        }
    } catch (e) {
        console.error("Error loading entries:", e);
    }
}

// ── Build stack ──
function buildStack() {
    const container = document.getElementById('stackContainer');
    if (!container) return;
    container.innerHTML = '';

    // Show up to 3 cards
    const layers = Math.min(3, entries.length);
    for (let layer = layers - 1; layer >= 0; layer--) {
        const mIdx = (currentIdx + layer) % entries.length;
        const m = entries[mIdx];
        const card = document.createElement('div');
        card.className = 'movie-card card-pos-' + layer;
        card.dataset.idx = mIdx;

        const posterStyle = m.image ? `background-image: url(${m.image}); background-size: cover; background-position: center;` : `background: ${m.bg};`;

        card.innerHTML = `
            <div class="poster-bg" style="${posterStyle}"></div>
            <div class="overlay"></div>
            <div class="card-rating">⭐ ${m.rating}</div>
            ${!m.image ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60px;z-index:1;opacity:0.6">${m.emoji}</div>` : ''}
            <div class="card-title-label">${m.title}</div>
        `;
        if (layer === 0) {
            card.addEventListener('click', () => { if (!isDragging) openModal(mIdx); });
        }
        container.appendChild(card);
    }

    buildDots();
    setupDrag();
}

// ── Pagination dots ──
function buildDots() {
    const d = document.getElementById('pagDots');
    if (!d) return;
    d.innerHTML = '';
    entries.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'pag-dot' + (i === currentIdx ? ' active' : '');
        dot.addEventListener('click', () => { currentIdx = i; buildStack(); resetAutoRotate(); });
        d.appendChild(dot);
    });
}

// ── Navigation ──
function goNext() {
    if (entries.length === 0) return;
    currentIdx = (currentIdx + 1) % entries.length;
    buildStack();
}
function goPrev() {
    if (entries.length === 0) return;
    currentIdx = (currentIdx - 1 + entries.length) % entries.length;
    buildStack();
}

document.getElementById('nextBtn')?.addEventListener('click', () => { goNext(); resetAutoRotate(); });
document.getElementById('prevBtn')?.addEventListener('click', () => { goPrev(); resetAutoRotate(); });

// ── Drag / Swipe ──
function setupDrag() {
    const container = document.getElementById('stackContainer');
    if (!container) return;

    const onStart = (x) => { isDragging = false; dragStartX = x; dragDelta = 0; clearInterval(autoTimer); };
    const onMove = (x) => {
        if (!dragStartX) return;
        dragDelta = x - dragStartX;
        if (Math.abs(dragDelta) > 8) isDragging = true;
    };
    const onEnd = () => {
        if (dragDelta < -40) goNext();
        else if (dragDelta > 40) goPrev();
        setTimeout(() => { isDragging = false; }, 100);
        dragStartX = 0;
        startAutoRotate();
    };

    container.onmousedown = e => onStart(e.clientX);
    window.onmousemove = e => onMove(e.clientX);
    window.onmouseup = onEnd;

    container.ontouchstart = e => onStart(e.touches[0].clientX);
    container.ontouchmove = e => onMove(e.touches[0].clientX);
    container.ontouchend = onEnd;
}

// ── Auto rotate ──
function startAutoRotate() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(goNext, 5000);
}
function resetAutoRotate() {
    startAutoRotate();
}

// ── Modal ──
function openModal(idx) {
    const m = entries[idx];
    const modalBg = document.getElementById('modalBg');
    if (m.image) {
        modalBg.style.backgroundImage = `url(${m.image})`;
        modalBg.style.backgroundSize = 'cover';
        modalBg.style.backgroundPosition = 'center';
        document.getElementById('modalEmoji').textContent = "";
    } else {
        modalBg.style.background = m.bg;
        document.getElementById('modalEmoji').textContent = m.emoji;
    }

    document.getElementById('modalTitle').textContent = m.title;
    document.getElementById('modalDesc').textContent = m.desc;
    document.getElementById('modalTags').innerHTML = m.genre.map(g => `<span class="tag">${g}</span>`).join('') + (m.year ? `<span class="tag">📅 ${m.year}</span>` : '');
    document.getElementById('modalMeta').innerHTML = `
        <div class="meta-item"><div class="meta-val" style="color:#fbbf24">⭐ ${m.rating}</div><div class="meta-lbl">Rating</div></div>
        <div class="meta-item"><div class="meta-val">${m.seasons || 0}</div><div class="meta-lbl">Volumes</div></div>
        <div class="meta-item"><div class="meta-val">${m.episodes || 0}</div><div class="meta-lbl">Chapters</div></div>
        <div class="meta-item"><div class="meta-val">${m.year || 'N/A'}</div><div class="meta-lbl">Year</div></div>
    `;

    const watchBtn = document.getElementById('modalWatchBtn');
    if (m.link) {
        watchBtn.style.display = 'block';
        watchBtn.onclick = () => window.open(m.link, '_blank');
    } else {
        watchBtn.style.display = 'none';
    }

    document.getElementById('modalOverlay').classList.add('open');
}

document.getElementById('modalClose')?.addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.remove('open');
});
document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay'))
        document.getElementById('modalOverlay').classList.remove('open');
});

// ── Trending grid ──
function buildTrending() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;
    const sorted = [...entries].sort((a, b) => b.rating - a.rating).slice(0, 8);
    grid.innerHTML = sorted.map((m, i) => {
        const posterStyle = m.image ? `background-image: url(${m.image}); background-size: cover; background-position: center;` : `background: ${m.bg};`;
        return `
            <div class="trending-card" onclick="openModal(${entries.indexOf(m)})">
                <div class="tc-poster" style="${posterStyle}">
                    <div class="tc-overlay"></div>
                    <span class="tc-num">#${i + 1}</span>
                    ${!m.image ? `<span style="position:relative;z-index:1">${m.emoji}</span>` : ''}
                </div>
                <div class="tc-info">
                    <div class="tc-name">${m.title}</div>
                    <div class="tc-rating">⭐ ${m.rating}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ── Search ──
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) { searchResults.style.display = 'none'; return; }

        const matches = entries.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.genre.some(g => g.toLowerCase().includes(q)) ||
            m.desc.toLowerCase().includes(q)
        );

        if (matches.length === 0) {
            searchResults.style.display = 'block';
            searchResults.innerHTML = `<div class="search-result-item"><div class="sr-info"><div class="sr-title" style="color:var(--muted)">No results found for "${q}"</div></div></div>`;
            return;
        }

        searchResults.style.display = 'block';
        searchResults.innerHTML = matches.map(m => `
            <div class="search-result-item" onclick="selectSearch(${entries.indexOf(m)})">
                <div class="sr-poster" style="background:${m.bg}">${m.emoji}</div>
                <div class="sr-info">
                    <div class="sr-title">${m.title}</div>
                    <div class="sr-meta">${m.genre.join(' · ')} ${m.year ? '· ' + m.year : ''}</div>
                </div>
                <div class="sr-rating">⭐ ${m.rating}</div>
            </div>
        `).join('');
    });

    window.selectSearch = function(idx) {
        searchResults.style.display = 'none';
        searchInput.value = '';
        openModal(idx);
    };

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrap')) searchResults.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', init);
