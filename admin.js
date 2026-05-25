/**
 * ComicNight — Advanced Serverless Admin Panel
 * Synchronized and Optimized with Precision Layout Configuration
 */

const CONFIG = {
    SUPABASE_URL: "https://cnwiqvebnmpmhilwosot.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU"
};

// تهيئة الاتصال بشكل رسمي ومباشر بقاعدة البيانات
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let comics = [];
let currentEditId = null;
const ADMIN_PASSWORD = "raven00$A"; //

// ── إدارة عمليات التحقق والولوج ──
document.getElementById('login-btn')?.addEventListener('click', handleLogin);
document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

function handleLogin() {
    const pin = document.getElementById('admin-password').value;
    if (pin === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        const err = document.getElementById('login-error');
        if (err) err.classList.remove('hidden');
    }
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    location.reload();
});

function checkAuth() {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    }
}

function showAdminPanel() {
    document.getElementById('login-gate')?.classList.add('hidden');
    document.getElementById('admin-panel')?.classList.remove('hidden');
    loadComics();
}

// ── سحب ومعالجة البيانات من الجداول ──
async function loadComics() {
    try {
        const { data, error } = await supabaseClient
            .from('comics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        comics = data || [];
        renderAdminList();
        updateStats();
    } catch (e) {
        showToast("Failed to fetch records: " + e.message, "error");
    }
}

function renderAdminList() {
    const listContainer = document.getElementById('admin-entry-list');
    if (!listContainer) return;

    if (comics.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--muted); font-size:14px;"><i class="fas fa-box-open" style="font-size:24px; display:block; margin-bottom:10px;"></i> No comics found in your database. Click "Add New Comic" to begin!</div>';
        return;
    }

    listContainer.innerHTML = comics.map(c => `
        <div class="admin-item">
            <div class="item-meta">
                ${c.cover_url ? `<img src="${c.cover_url}" style="width:45px; height:60px; border-radius:6px; object-fit:cover; border:1px solid var(--border);">` : `<div style="font-size:24px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">📖</div>`}
                <div>
                    <div class="item-title">${c.title}</div>
                    <div class="item-sub">⭐ ${c.rating || 0} · 📖 ${c.chapters || 0} Chapters · 📦 ${c.volumes || 0} Volumes</div>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-sm btn-secondary" onclick="openEditDrawer('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-sm btn-danger" onclick="confirmDelete('${c.id}')"><i class="fas fa-trash-alt"></i> Wreck</button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const totalElem = document.getElementById('stat-total');
    const todayElem = document.getElementById('stat-today');
    if (totalElem) totalElem.textContent = comics.length;

    const todayStr = new Date().toDateString();
    const todayCount = comics.filter(c => {
        if (!c.created_at) return false;
        return new Date(c.created_at).toDateString() === todayStr;
    }).length;
    if (todayElem) todayElem.textContent = todayCount;
}

// ── التحكم في الفتح التلقائي والسلس للـ Drawer ──
const drawer = document.getElementById('entry-drawer');
const overlay = document.getElementById('form-overlay');

document.getElementById('add-entry-btn')?.addEventListener('click', () => {
    currentEditId = null;
    const form = document.getElementById('entry-form');
    if (form) form.reset();
    
    document.getElementById('entry-id').value = '';
    document.getElementById('drawer-title').textContent = 'Add New Comic';
    document.getElementById('image-preview')?.classList.add('hidden');
    
    drawer?.classList.add('open');
    overlay?.classList.add('open');
});

function closeDrawer() {
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
}

document.getElementById('close-drawer')?.addEventListener('click', closeDrawer);
document.getElementById('cancel-btn')?.addEventListener('click', closeDrawer);
overlay?.addEventListener('click', closeDrawer);

// تفعيل ميزة المعاينة الفورية للأغلفة المرفوعة
document.getElementById('form-image-file')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const previewImg = document.getElementById('preview-img');
            if (previewImg) previewImg.src = event.target.result;
            document.getElementById('image-preview')?.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// ── معالجة الحفظ والتحديث المباشر داخل الجداول ──
document.getElementById('entry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('form-title').value;
    const description = document.getElementById('form-desc').value;
    const link = document.getElementById('form-link').value;
    const tags = document.getElementById('form-tags').value;
    const rating = parseFloat(document.getElementById('form-rating').value) || 0;
    const year = parseInt(document.getElementById('form-year').value) || null;
    const emoji = document.getElementById('form-emoji').value || "📖";
    const bg = document.getElementById('form-bg').value || "#12122c";
    const chapters = parseInt(document.getElementById('form-chapters').value) || 0;
    const volumes = parseInt(document.getElementById('form-volumes').value) || 0;
    
    const fileInput = document.getElementById('form-image-file');
    let coverUrl = comics.find(c => c.id === currentEditId)?.cover_url || "";

    try {
        // معالجة الرفع السحابي لـ Bucket السيرفر التابع لك المسمى comic-covers
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('comic-covers')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient
                .storage
                .from('comic-covers')
                .getPublicUrl(fileName);

            coverUrl = urlData.publicUrl;
        }

        const comicData = {
            title, description, link, tags, rating, year, emoji, bg, chapters, volumes, cover_url: coverUrl
        };

        if (currentEditId) {
            const { error } = await supabaseClient
                .from('comics')
                .update(comicData)
                .eq('id', currentEditId);

            if (error) throw error;
            showToast("Comic entry updated with success!", "success");
        } else {
            const { error } = await supabaseClient
                .from('comics')
                .insert([comicData]);

            if (error) throw error;
            showToast("Brand new comic cataloged into database!", "success");
        }

        closeDrawer();
        loadComics();
    } catch (error) {
        showToast("Operation blocked: " + error.message, "error");
    }
});

// ── تعديل وسحب سجل قديم ──
window.openEditDrawer = function(id) {
    const c = comics.find(item => item.id === id);
    if (!c) return;

    currentEditId = id;
    document.getElementById('entry-id').value = c.id;
    document.getElementById('form-title').value = c.title || '';
    document.getElementById('form-desc').value = c.description || '';
    document.getElementById('form-link').value = c.link || '';
    document.getElementById('form-tags').value = c.tags || '';
    document.getElementById('form-rating').value = c.rating || '';
    document.getElementById('form-year').value = c.year || '';
    document.getElementById('form-emoji').value = c.emoji || '📖';
    document.getElementById('form-bg').value = c.bg || '';
    document.getElementById('form-chapters').value = c.chapters || '';
    document.getElementById('form-volumes').value = c.volumes || '';

    if (c.cover_url) {
        const previewImg = document.getElementById('preview-img');
        if (previewImg) previewImg.src = c.cover_url;
        document.getElementById('image-preview')?.classList.remove('hidden');
    } else {
        document.getElementById('image-preview')?.classList.add('hidden');
    }

    document.getElementById('drawer-title').textContent = 'Edit Comic Profile';
    drawer?.classList.add('open');
    overlay?.classList.add('open');
};

// ── نظام الحذف المباشر والآمن ──
let idToDelete = null;
window.confirmDelete = function(id) {
    idToDelete = id;
    document.getElementById('confirm-overlay')?.classList.remove('hidden');
};

document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay')?.classList.add('hidden');
    idToDelete = null;
});

document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!idToDelete) return;
    try {
        const { error } = await supabaseClient
            .from('comics')
            .delete()
            .eq('id', idToDelete);

        if (error) throw error;
        showToast("Record successfully removed.", "success");
        loadComics();
    } catch (e) {
        showToast("Drop query failed: " + e.message, "error");
    } finally {
        document.getElementById('confirm-overlay')?.classList.add('hidden');
        idToDelete = null;
    }
});

// ── البحث السريع التفاعلي ──
document.getElementById('admin-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
        loadComics();
        return;
    }
    const filtered = comics.filter(c => 
        c.title?.toLowerCase().includes(query) || 
        c.description?.toLowerCase().includes(query)
    );
    
    const listContainer = document.getElementById('admin-entry-list');
    if (listContainer) {
        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">No matching entries found.</div>';
            return;
        }
        // رندرة مخصصة لنتائج التصفية الحالية
        listContainer.innerHTML = filtered.map(c => `
            <div class="admin-item">
                <div class="item-meta">
                    ${c.cover_url ? `<img src="${c.cover_url}" style="width:45px; height:60px; border-radius:6px; object-fit:cover;">` : `<div style="font-size:24px;">📖</div>`}
                    <div>
                        <div class="item-title">${c.title}</div>
                        <div class="item-sub">⭐ ${c.rating || 0} · 📖 ${c.chapters || 0} Chapters</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm btn-secondary" onclick="openEditDrawer('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-sm btn-danger" onclick="confirmDelete('${c.id}')"><i class="fas fa-trash-alt"></i> Wreck</button>
                </div>
            </div>
        `).join('');
    }
});

// ── واجهة عرض التنبيهات المنبثقة (Toasts) ──
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: rgba(19, 19, 36, 0.85); color: #fff; padding: 14px 24px; border-radius: 12px;
        margin-top: 10px; border-left: 4px solid ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); backdrop-filter: blur(10px);
        font-size: 14px; display: flex; align-items: center; gap: 10px; transition: 0.3s ease;
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="color:${type === 'success' ? 'var(--success)' : 'var(--danger)'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// البدء في التحقق عند جاهزية المتصفح
document.addEventListener('DOMContentLoaded', checkAuth);
