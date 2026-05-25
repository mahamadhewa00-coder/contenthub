// CONFIG: تأكد أن هذه البيانات تطابق تماماً البيانات الموجودة في ملف admin.js الخاص بك
const CONFIG = {
    SUPABASE_URL: "https://cnwiqvebnmpmhilwosot.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU" // ضع مفتاحك هنا إذا كان مختلفاً
};

// تهيئة الاتصال بـ Supabase
const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseKey = CONFIG.SUPABASE_ANON_KEY;
// نتحقق من وجود مكتبة السوبابيس أولاً
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// المتغيرات العامة لحفظ البيانات المسترجعة
let allComics = [];
let currentIndex = 0;

// تشغيل جلب البيانات فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    if (!supabaseClient) {
        // إذا لم تكن المكتبة محملة عبر السيرفر، نقوم بتحميلها ديناميكياً
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            initComicApp();
        };
        document.head.appendChild(script);
    } else {
        window.supabaseClient = supabaseClient;
        initComicApp();
    }
});

// بدء تشغيل التطبيق وجلب البيانات
async function initComicApp() {
    await fetchComicsFromSupabase();
    setupEventListeners();
}

// دالة جلب البيانات الاحترافية المتوافقة مع جدولك الجديد
async function fetchComicsFromSupabase() {
    try {
        const { data, error } = await window.supabaseClient
            .from('comics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allComics = data || [];
        
        if (allComics.length === 0) {
            document.getElementById('stackContainer').innerHTML = `<div style="text-align: center; padding-top: 100px; color: #8585a3;">No comics available yet. Add some from the admin panel!</div>`;
            return;
        }

        // رندر البيانات في الواجهة
        renderHeroStack();
        renderTrendingGrid();

    } catch (err) {
        console.error('Error fetching data from Supabase:', err);
        document.getElementById('stackContainer').innerHTML = `<div style="text-align: center; padding-top: 100px; color: #ff4a4a;">Failed to load library.</div>`;
    }
}

// رندر الكروت الكبيرة في الهيرو (Hero Cards)
function renderHeroStack() {
    const stackContainer = document.getElementById('stackContainer');
    const pagDots = document.getElementById('pagDots');
    if (!stackContainer) return;

    stackContainer.innerHTML = '';
    pagDots.innerHTML = '';

    // نأخذ أول 5 كتب للتوب هيرو
    const heroItems = allComics.slice(0, 5);

    heroItems.forEach((comic, idx) => {
        // إنشاء الكرت بتأثير الغلاسمورفيزم
        const card = document.createElement('div');
        card.className = `stack-card ${idx === currentIndex ? 'active' : ''}`;
        card.style.transform = `rotate(${(idx - currentIndex) * 4}deg) translateY(${(idx - currentIndex) * 10}px)`;
        card.style.zIndex = heroItems.length - idx;
        card.style.opacity = idx === currentIndex ? '1' : '0.4';
        card.style.backgroundColor = comic.bg || '#12122c';

        card.innerHTML = `
            <div class="card-cover-wrap" style="background-image: url('${comic.cover_url}')"></div>
            <div class="card-info-overlay">
                <span class="card-emoji">${comic.emoji || '📖'}</span>
                <h3>${comic.title}</h3>
                <div class="card-meta-line">⭐ ${comic.rating || '0'} · ${comic.chapters || '0'} Chapters</div>
            </div>
        `;

        card.addEventListener('click', () => openComicModal(comic));
        stackContainer.appendChild(card);

        // النقاط التفاعلية في الأسفل
        const dot = document.createElement('div');
        dot.className = `dot ${idx === currentIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => {
            currentIndex = idx;
            renderHeroStack();
        });
        pagDots.appendChild(dot);
    });
}

// رندر شبكة الكتب التريند (Trending Grid)
function renderTrendingGrid() {
    const trendingGrid = document.getElementById('trendingGrid');
    if (!trendingGrid) return;

    trendingGrid.innerHTML = '';

    allComics.forEach(comic => {
        const item = document.createElement('div');
        item.className = 'trending-item';
        item.innerHTML = `
            <div class="trending-thumb" style="background-image: url('${comic.cover_url}')">
                <div class="trending-rating">⭐ ${comic.rating || '0'}</div>
            </div>
            <div class="trending-info">
                <h4>${comic.title}</h4>
                <p>${comic.chapters || '0'} Ch. · ${comic.volumes || '0'} Vol.</p>
            </div>
        `;
        item.addEventListener('click', () => openComicModal(comic));
        trendingGrid.appendChild(item);
    });
}

// فتح نافذة التفاصيل (Modal) عند الضغط على أي كتاب
function openComicModal(comic) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerText = comic.title;
    document.getElementById('modalDesc').innerText = comic.description || 'No description available.';
    document.getElementById('modalEmoji').innerText = comic.emoji || '📖';
    document.getElementById('modalBg').style.backgroundImage = `url('${comic.cover_url}')`;
    
    // تقسيم التاقات
    const tagsContainer = document.getElementById('modalTags');
    tagsContainer.innerHTML = '';
    if (comic.tags) {
        comic.tags.split(',').forEach(tag => {
            tagsContainer.innerHTML += `<span class="m-tag">${tag.trim()}</span>`;
        });
    }

    // الميتا داتا (السنة، الفصول، المجلدات)
    document.getElementById('modalMeta').innerHTML = `
        <span>📅 Year: <b>${comic.year || 'N/A'}</b></span>
        <span>📖 Chapters: <b>${comic.chapters || '0'}</b></span>
        <span>📦 Volumes: <b>${comic.volumes || '0'}</b></span>
    `;

    // زر القراءة أونلاين
    const watchBtn = document.getElementById('modalWatchBtn');
    if (comic.link) {
        watchBtn.onclick = () => window.open(comic.link, '_blank');
        watchBtn.style.display = 'block';
    } else {
        watchBtn.style.display = 'none';
    }

    overlay.classList.add('active');
}

// إعداد أزرار التنقل (Arrows) والبحث
function setupEventListeners() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const modalClose = document.getElementById('modalClose');
    const overlay = document.getElementById('modalOverlay');

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentIndex > 0) { currentIndex--; renderHeroStack(); }
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentIndex < Math.min(allComics.length, 5) - 1) { currentIndex++; renderHeroStack(); }
        };
    }
    if (modalClose) {
        modalClose.onclick = () => overlay.classList.remove('active');
    }

    // كود السيرش التفاعلي الفوري (Realtime Search)
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                searchResults.style.display = 'none';
                return;
            }

            const filtered = allComics.filter(c => 
                c.title.toLowerCase().includes(query) || 
                (c.tags && c.tags.toLowerCase().includes(query))
            );

            searchResults.innerHTML = '';
            if (filtered.length === 0) {
                searchResults.innerHTML = `<div class="search-item-empty">No matching results found</div>`;
            } else {
                filtered.forEach(comic => {
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerHTML = `
                        <img src="${comic.cover_url}" style="width:35px; height:50px; border-radius:4px; object-fit:cover;">
                        <div>
                            <div style="font-weight:600; font-size:14px;">${comic.title}</div>
                            <div style="font-size:12px; color:var(--muted)">⭐ ${comic.rating}</div>
                        </div>
                    `;
                    div.onclick = () => {
                        openComicModal(comic);
                        searchResults.style.display = 'none';
                        searchInput.value = '';
                    };
                    searchResults.appendChild(div);
                });
            }
            searchResults.style.display = 'block';
        });

        // إغلاق قائمة البحث عند الضغط في أي مكان خارجها
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
}
