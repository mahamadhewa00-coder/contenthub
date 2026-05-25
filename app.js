/**
 * ComicNight Frontend Logic - Supabase Integrated (Production Ready)
 */

const SUPABASE_CONFIG = {
    url: 'https://cnwiqvebnmpmhilwosot.supabase.co',
    key: 'sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU'
};

let sbInstance = null;
let entries = [];
let currentIdx = 0;
let isDragging = false, dragStartX = 0, dragDelta = 0;
let autoTimer;

// ── Initialize ──
async function init() {
    if (!initSupabase()) {
        console.error("Supabase SDK not loaded or config missing.");
        const container = document.getElementById('stackContainer');
        if (container) container.innerHTML = '<div style="text-align: center; padding-top: 100px; color: var(--danger);">Configuration Error: Please check Supabase keys.</div>';
        return;
    }

    await loadEntries();

    if (entries.length > 0) {
        buildStack();
        buildTrending();
        startAutoRotate();
    } else {
        const container = document.getElementById('stackContainer');
        if (container) container.innerHTML = '<div style="text-align: center; padding-top: 100px; color: var(--muted);">No comics found. Add some in the Admin panel!</div>';
    }
    setupSearch();
}

function initSupabase() {
    if (window.supabase && SUPABASE_CONFIG.url) {
        sbInstance = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        return true;
    }
    return false;
}

async function loadEntries() {
    if (!sbInstance) return;

    try {
        // Check maintenance & announcement
        const { data: sData, error: sError } = await sbInstance.from('settings').select('*').single();
        if (!sError && sData) {
            if (sData.maintenance_mode) {
                const overlay = document.getElementById('maintenance-overlay');
                if (overlay) overlay.style.display = 'flex';
                return;
            }
            if (sData.announcement) {
                const bar = document.getElementById('announcement-bar');
                const text = document.getElementById('announcement-text');
                if (bar) bar.style.display = 'block';
                if (text) text.textContent = sData.announcement;
            }
            if (sData.video_ad_url) {
                const pBtn = document.getElementById('promo-btn');
                if (pBtn) {
                    pBtn.style.display = 'flex';
                    pBtn.onclick = () => {
                        const modal = document.getElementById('modalOverlay');
                        const mTitle = document.getElementById('modalTitle');
                        const mDesc = document.getElementById('modalDesc');
                        const mTags = document.getElementById('modalTags');
                        const mMeta = document.getElementById('modalMeta');
                        const mBg = document.getElementById('modalBg');

                        if (mTitle) mTitle.textContent = "Featured Promo";
                        if (mDesc) mDesc.innerHTML = `<video src="${sData.video_ad_url}" controls autoplay style="width:100%; border-radius:15px"></video>`;
                        if (mTags) mTags.innerHTML = "";
                        if (mMeta) mMeta.innerHTML = "";
                        if (mBg) mBg.style.background = "var(--accent)";
                        if (modal) modal.classList.add('open');
                    };
                }
            }
        }

        const { data, error } = await sbInstance
            .from('comics')
            .select('*')
            // Using logic where if column is_active doesn't exist, we show all.
            // But user report says we should have it or at least handle the provided columns.
            .order('created_at', { ascending: false });

        if (error) throw error;

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
                image: m.cover_url,
                link: m.link,
                episodes: m.chapters || 0,
                seasons: m.volumes || 0
            }));
        }
    } catch (e) {
        console.error("Error loading entries from Supabase:", e);
    }
}

// ── Build stack ──
function buildStack() {
    const container = document.getElementById('stackContainer');
    if (!container) return;
    container.innerHTML = '';

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

// Event delegation or direct binding
document.addEventListener('click', e => {
    if (e.target.id === 'nextBtn') { goNext(); resetAutoRotate(); }
    if (e.target.id === 'prevBtn') { goPrev(); resetAutoRotate(); }
});

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
    const modalEmoji = document.getElementById('modalEmoji');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalTags = document.getElementById('modalTags');
    const modalMeta = document.getElementById('modalMeta');
    const watchBtn = document.getElementById('modalWatchBtn');
    const overlay = document.getElementById('modalOverlay');

    if (m.image) {
        if (modalBg) {
            modalBg.style.backgroundImage = `url(${m.image})`;
            modalBg.style.backgroundSize = 'cover';
            modalBg.style.backgroundPosition = 'center';
        }
        if (modalEmoji) modalEmoji.textContent = "";
    } else {
        if (modalBg) {
            modalBg.style.backgroundImage = 'none';
            modalBg.style.background = m.bg;
        }
        if (modalEmoji) modalEmoji.textContent = m.emoji;
    }

    if (modalTitle) modalTitle.textContent = m.title;
    if (modalDesc) modalDesc.textContent = m.desc;
    if (modalTags) modalTags.innerHTML = m.genre.map(g => `<span class="tag">${g}</span>`).join('') + (m.year ? `<span class="tag">📅 ${m.year}</span>` : '');
    if (modalMeta) modalMeta.innerHTML = `
        <div class="meta-item"><div class="meta-val" style="color:#fbbf24">⭐ ${m.rating}</div><div class="meta-lbl">Rating</div></div>
        <div class="meta-item"><div class="meta-val">${m.seasons || 0}</div><div class="meta-lbl">Volumes</div></div>
        <div class="meta-item"><div class="meta-val">${m.episodes || 0}</div><div class="meta-lbl">Chapters</div></div>
        <div class="meta-item"><div class="meta-val">${m.year || 'N/A'}</div><div class="meta-lbl">Year</div></div>
    `;

    if (watchBtn) {
        if (m.link) {
            watchBtn.style.display = 'block';
            watchBtn.onclick = () => window.open(m.link, '_blank');
        } else {
            watchBtn.style.display = 'none';
        }
    }

    if (overlay) overlay.classList.add('open');
}

// Direct binding for modal close
document.addEventListener('click', e => {
    if (e.target.id === 'modalClose' || e.target.id === 'modalOverlay') {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.remove('open');
    }
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
            (m.title && m.title.toLowerCase().includes(q)) ||
            (m.genre && m.genre.some(g => g.toLowerCase().includes(q))) ||
            (m.desc && m.desc.toLowerCase().includes(q))
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
