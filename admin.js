/**
 * ComicNight Admin Panel Logic
 * Fully Integrated with Supabase Serverless Database & Storage
 */

// --- CONFIGURATION ---
const ADMIN_PASSWORD = "raven00$A"; // هێشتنەوەی پاسوۆردە ئەمنییەکەت وەک خۆی

const SUPABASE_CONFIG = {
    URL: "https://cnwiqvebnmpmhilwosot.supabase.co",
    ANON_KEY: "sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU",
    BUCKET_NAME: "comic-covers"
};

// دروستکردنی کلاینیتی Supabase بۆ پەیوەندی ڕاستەوخۆ
const supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// --- STATE MANAGEMENT ---
let allEntries = [];
let currentEntryId = null;

// --- DOM ELEMENTS ---
const loginGate = document.getElementById('login-gate');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const entryList = document.getElementById('admin-entry-list');
const searchInput = document.getElementById('admin-search');
const addBtn = document.getElementById('add-entry-btn');
const logoutBtn = document.getElementById('logout-btn');
const stickySaveBtn = document.getElementById('sticky-save-btn');

const drawer = document.getElementById('entry-drawer');
const drawerOverlay = document.getElementById('form-overlay');
const drawerTitle = document.getElementById('drawer-title');
const entryForm = document.getElementById('entry-form');
const closeDrawerBtn = document.getElementById('close-drawer');
const cancelBtn = document.getElementById('cancel-btn');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// --- INITIALIZATION ---
function init() {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showAdminPanel();
    }

    // Login Event
    loginBtn.onclick = handleLogin;
    passwordInput.onkeypress = (e) => e.key === 'Enter' && handleLogin();

    // UI Events
    logoutBtn.onclick = handleLogout;
    addBtn.onclick = () => openDrawer();
    closeDrawerBtn.onclick = closeDrawer;
    cancelBtn.onclick = closeDrawer;
    drawerOverlay.onclick = closeDrawer;
    
    searchInput.oninput = handleSearch;
    stickySaveBtn.onclick = () => showToast("Site is automatically synchronized with Supabase live database! 🚀");

    // Preview Image when Selected
    const fileInput = document.getElementById('form-image-file');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const preview = document.getElementById('image-preview');
            const img = document.getElementById('preview-img');
            const file = e.target.files[0];
            if (file) {
                img.src = URL.createObjectURL(file);
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
        };
    }

    // Delete Events
    cancelDeleteBtn.onclick = () => confirmOverlay.classList.add('hidden');
    confirmDeleteBtn.onclick = deleteEntry;

    // Form Submit
    entryForm.onsubmit = handleFormSubmit;
}

// --- AUTHENTICATION ---
function handleLogin() {
    if (passwordInput.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showAdminPanel();
    } else {
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

function showAdminPanel() {
    loginGate.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadData();
}

// --- FETCH DATA FROM SUPABASE ---
async function loadData() {
    try {
        const { data, error } = await supabaseClient
            .from('comics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allEntries = data || [];
        renderEntries(allEntries);
    } catch (err) {
        console.error("Error fetching data:", err);
        showToast("Failed to load data from Supabase", "error");
    }
}

// --- RENDER LIST ---
function renderEntries(entries) {
    if (!entryList) return;
    entryList.innerHTML = '';

    if (entries.length === 0) {
        entryList.innerHTML = `<div class="p-4 text-center text-muted">No comics found.</div>`;
        return;
    }

    entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'admin-item'; // هێشتنەوەی دیزاینی شوشەیی خۆت
        item.innerHTML = `
            <div class="item-meta">
                <img src="${entry.cover_url || 'https://via.placeholder.com/40x60'}" class="item-img" style="width:40px; height:55px; object-fit:cover; border-radius:4px;" />
                <div>
                    <div class="item-title">${entry.title}</div>
                    <div class="item-sub">Volumes: ${entry.volumes || 0} · Chapters: ${entry.chapters || 0} · ⭐ ${entry.rating || 0}</div>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-sm" onclick="openDrawer(${entry.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="askDelete(${entry.id})">Delete</button>
            </div>
        `;
        entryList.appendChild(item);
    });
}

// --- SEARCH ---
function handleSearch() {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) { renderEntries(allEntries); return; }
    const filtered = allEntries.filter(e => 
        e.title.toLowerCase().includes(q) || 
        (e.description && e.description.toLowerCase().includes(q))
    );
    renderEntries(filtered);
}

// --- DRAWER ACTIONS ---
window.openDrawer = function(id = null) {
    currentEntryId = id;
    entryForm.reset();
    document.getElementById('image-preview').classList.add('hidden');

    if (id) {
        drawerTitle.textContent = "Edit Comic";
        const entry = allEntries.find(e => e.id === id);
        if (entry) {
            document.getElementById('form-title').value = entry.title;
            document.getElementById('form-desc').value = entry.description || '';
            document.getElementById('form-volumes').value = entry.volumes || 0;
            document.getElementById('form-chapters').value = entry.chapters || 0;
            document.getElementById('form-rating').value = entry.rating || 0;
            document.getElementById('form-link').value = entry.link || '';
            
            if (entry.cover_url) {
                document.getElementById('preview-img').src = entry.cover_url;
                document.getElementById('image-preview').classList.remove('hidden');
            }
        }
    } else {
        drawerTitle.textContent = "Add New Comic";
    }
    drawer.classList.add('open');
    drawerOverlay.classList.add('open');
};

function closeDrawer() {
    drawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    currentEntryId = null;
}

// --- FORM SUBMIT (INSERT / UPDATE & IMAGE UPLOAD) ---
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = entryForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = "⏳ Saving...";

    const title = document.getElementById('form-title').value.trim();
    const description = document.getElementById('form-desc').value.trim();
    const volumes = document.getElementById('form-volumes').value.trim();
    const chapters = document.getElementById('form-chapters').value.trim();
    const rating = document.getElementById('form-rating').value.trim();
    const link = document.getElementById('form-link').value.trim();
    const fileInput = document.getElementById('form-image-file');
    const file = fileInput ? fileInput.files[0] : null;

    try {
        let coverUrl = "";
        
        // ئەگەر دەستکاری بکەین و وێنەی نوێ دانەنێین، وێنە کۆنەکە دەهێڵێتەوە
        if (currentEntryId) {
            const existing = allEntries.find(e => e.id === currentEntryId);
            if (existing) coverUrl = existing.cover_url;
        }

        // [یەکەم] ئەگەر وێنەی نوێ هەڵبژێردرابوو، بەرزی دەکاتەوە بۆ سێرڤەری وێنەکان
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage
                .from(SUPABASE_CONFIG.BUCKET_NAME)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage
                .from(SUPABASE_CONFIG.BUCKET_NAME)
                .getPublicUrl(fileName);

            coverUrl = urlData.publicUrl;
        }

        const payload = {
            title,
            description,
            volumes,
            chapters,
            rating,
            link,
            cover_url: coverUrl
        };

        if (currentEntryId) {
            //کرداری ئەپدێکردنەوە
            const { error } = await supabaseClient
                .from('comics')
                .update(payload)
                .eq('id', currentEntryId);
            if (error) throw error;
            showToast("Comic updated successfully! 🎉");
        } else {
            //کرداری زیادکردنی نوێ
            const { error } = await supabaseClient
                .from('comics')
                .insert([payload]);
            if (error) throw error;
            showToast("New Comic added successfully! 📚");
        }

        closeDrawer();
        loadData();
    } catch (err) {
        console.error("Error saving data:", err);
        showToast(err.message || "An error occurred while saving.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Save Entry";
    }
}

// --- DELETE LOGIC ---
window.askDelete = function(id) {
    deleteId = id;
    confirmOverlay.classList.remove('hidden');
};

async function deleteEntry() {
    if (!deleteId) return;
    try {
        const { error } = await supabaseClient
            .from('comics')
            .delete()
            .eq('id', deleteId);

        if (error) throw error;

        showToast("Comic deleted successfully.");
        confirmOverlay.classList.add('hidden');
        loadData();
    } catch (err) {
        console.error("Error deleting:", err);
        showToast("Failed to delete entry.", "error");
    } finally {
        deleteId = null;
    }
}

// --- TOAST NOTIFICATION ---
function showToast(msg, type = "success") {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '99999';
    toast.style.color = '#fff';
    toast.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', init);
