/**
 * ComicNight Admin Logic
 * Fully Integrated with Supabase (Database & Storage)
 */

const CONFIG = {
    SUPABASE_URL: "https://cnwiqvebnmpmhilwosot.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU"
};

// دروستکردنی پەیوەندی لەگەڵ Supabase
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let comics = [];
let currentEditId = null;

// پاسوۆردی چوونەژوورەوەی ئەدمین
const ADMIN_PASSWORD = "raven00$A"; 

// ── چوونەژوورەوە و پاراستنی دۆخەکە ──
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

// ── ڕاکێشانی داتا لە Supabase ──
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
        showToast("Error loading data: " + e.message, "error");
    }
}

// ── پیشاندانی لیستی بابەتەکان لە پانێڵەکە ──
function renderAdminList() {
    const listContainer = document.getElementById('admin-entry-list');
    if (!listContainer) return;

    if (comics.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">No comics found. Click "Add New Comic" to start!</div>';
        return;
    }

    listContainer.innerHTML = comics.map(c => `
        <div class="admin-item">
            <div class="item-meta">
                ${c.cover_url ? `<img src="${c.cover_url}" style="width:45px; height:45px; border-radius:8px; object-fit:cover;">` : `<div style="font-size:24px;">📚</div>`}
                <div>
                    <div class="item-title">${c.title}</div>
                    <div class="item-sub">⭐ ${c.rating || 0} · 📖 ${c.chapters || 0} Chapters</div>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-sm btn-secondary" onclick="openEditDrawer('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-sm btn-danger" onclick="confirmDelete('${c.id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

// ── نوێکردنەوەی ئامارەکان ──
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

// ── لۆجیکی Drawer ──
const drawer = document.getElementById('entry-drawer');
const overlay = document.getElementById('form-overlay');

document.getElementById('add-entry-btn')?.addEventListener('click', () => {
    currentEditId = null;
    const form = document.getElementById('entry-form');
    if (form) form.reset();
    
    const idInput = document.getElementById('entry-id');
    if (idInput) idInput.value = '';
    
    const titleElem = document.getElementById('drawer-title');
    if (titleElem) titleElem.textContent = 'Add New Comic';
    
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

// Preview بۆ وێنەکە
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

// ── پاشەکەوتکردن لە Supabase ──
document.getElementById('entry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('form-title').value;
    const description = document.getElementById('form-desc').value;
    const link = document.getElementById('form-link').value;
    const tags = document.getElementById('form-tags').value;
    const rating = parseFloat(document.getElementById('form-rating').value) || 0;
    const year = parseInt(document.getElementById('form-year').value) || null;
    const emoji = document.getElementById('form-emoji').value || "📚";
    const bg = document.getElementById('form-bg').value;
    const chapters = parseInt(document.getElementById('form-chapters').value) || 0;
    const volumes = parseInt(document.getElementById('form-volumes').value) || 0;
    
    const fileInput = document.getElementById('form-image-file');
    let coverUrl = comics.find(c => c.id === currentEditId)?.cover_url || "";

    try {
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
            showToast("Comic updated successfully!", "success");
        } else {
            const { error } = await supabaseClient
                .from('comics')
                .insert([comicData]);

            if (error) throw error;
            showToast("New comic added successfully!", "success");
        }

        closeDrawer();
        loadComics();
    } catch (error) {
        showToast("Operation failed: " + error.message, "error");
    }
});

// ── هێنانە پێشەوەی زانیارییەکان بۆ دەستکاریکردن ──
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
    document.getElementById('form-emoji').value = c.emoji || '📚';
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

    document.getElementById('drawer-title').textContent = 'Edit Comic';
    drawer?.classList.add('open');
    overlay?.classList.add('open');
};

// ── سڕینەوە ──
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
        showToast("Comic deleted successfully!", "success");
        loadComics();
    } catch (e) {
        showToast("Delete failed: " + e.message, "error");
    } finally {
        document.getElementById('confirm-overlay')?.classList.add('hidden');
        idToDelete = null;
    }
});

// ── دروستکردنی ئاگادارکردنەوەکان ──
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: #1e1b4b; color: #fff; padding: 12px 24px; border-radius: 10px;
        margin-top: 10px; border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
        box-shadow: 0 10px 25px rgba(0,0,0,0.3); transition: 0.3s;
    `;
    toast.innerHTML = `${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// لۆدکردنی ئۆتۆماتیکی پاش کردنەوەی پەڕەکە
document.addEventListener('DOMContentLoaded', checkAuth);
