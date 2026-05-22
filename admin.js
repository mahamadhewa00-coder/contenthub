/**
 * ContentHub Admin Panel Logic - Supabase Integrated
 */

// --- CONFIGURATION ---
const ADMIN_PASSWORD = "raven00$A";

// Supabase Init (will be re-initialized from session if available)
let supabase = null;

// --- STATE MANAGEMENT ---
let allEntries = [];
let currentEntryId = null;
let deleteId = null;

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

    loginBtn.onclick = handleLogin;
    passwordInput.onkeypress = (e) => e.key === 'Enter' && handleLogin();

    logoutBtn.onclick = handleLogout;
    addBtn.onclick = () => openDrawer();
    closeDrawerBtn.onclick = closeDrawer;
    cancelBtn.onclick = closeDrawer;
    drawerOverlay.onclick = closeDrawer;
    
    searchInput.oninput = handleSearch;
    stickySaveBtn.onclick = () => showToast("Changes are live on Supabase! 🚀");

    // File input preview
    document.getElementById('form-file-input').onchange = (e) => {
        const file = e.target.files[0];
        const preview = document.getElementById('image-preview');
        const img = document.getElementById('preview-img');
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    cancelDeleteBtn.onclick = () => confirmOverlay.classList.add('hidden');
    confirmDeleteBtn.onclick = deleteEntry;

    entryForm.onsubmit = handleFormSubmit;
    document.getElementById('save-settings-btn').onclick = updateSettings;

    // Load SB Config from Session
    document.getElementById('form-sb-url').value = sessionStorage.getItem('sbUrl') || '';
    document.getElementById('form-sb-key').value = sessionStorage.getItem('sbKey') || '';

    if (sessionStorage.getItem('sbUrl') && sessionStorage.getItem('sbKey')) {
        initSupabase();
    }
}

function initSupabase() {
    const url = document.getElementById('form-sb-url').value;
    const key = document.getElementById('form-sb-key').value;
    if (url && key) {
        supabase = window.supabase.createClient(url, key);
        sessionStorage.setItem('sbUrl', url);
        sessionStorage.setItem('sbKey', key);
    }
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

// --- DATA FETCHING ---
async function loadData() {
    if (!supabase) initSupabase();
    if (!supabase) return;

    // Load Entries
    const { data, error } = await supabase
        .from('comics')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast(error.message, "error");
    } else {
        allEntries = data;
        renderEntries(allEntries);
    }

    // Load Settings
    const { data: sData, error: sError } = await supabase
        .from('settings')
        .select('*')
        .single();

    if (sData) {
        document.getElementById('setting-maintenance').checked = sData.maintenance_mode;
        document.getElementById('setting-announcement').value = sData.announcement || '';
        document.getElementById('setting-video').value = sData.video_ad_url || '';
    }
}

async function updateSettings() {
    const isMaintenance = document.getElementById('setting-maintenance').checked;
    const announcement = document.getElementById('setting-announcement').value;
    const videoAd = document.getElementById('setting-video').value;

    const { error } = await supabase
        .from('settings')
        .upsert({ id: 1, maintenance_mode: isMaintenance, announcement: announcement, video_ad_url: videoAd });

    if (error) showToast(error.message, "error");
    else showToast("Settings updated!", "success");
}

// --- UI RENDERING ---
function renderEntries(entries) {
    entryList.innerHTML = '';
    entries.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'entry-card';
        const imgUrl = entry.cover_url || entry.image || 'https://via.placeholder.com/60';
        div.innerHTML = `
            <img src="${imgUrl}" class="entry-img" onerror="this.src='https://via.placeholder.com/60'">
            <div class="entry-info">
                <h4>${entry.title}</h4>
                <p>${entry.description}</p>
            </div>
            <div class="entry-actions">
                <button class="edit-btn" onclick="openDrawer('${entry.id}')"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="showConfirmDelete('${entry.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        entryList.appendChild(div);
    });
}

// --- FORM HANDLING ---
function openDrawer(id = null) {
    currentEntryId = id;
    drawerTitle.textContent = id ? 'Edit Entry' : 'Add New Entry';
    
    if (id) {
        const entry = allEntries.find(e => e.id === id);
        if (entry) {
            document.getElementById('form-title').value = entry.title;
            document.getElementById('form-description').value = entry.description;
            document.getElementById('form-image').value = entry.cover_url || entry.image || '';
            document.getElementById('form-link').value = entry.link || '';
            document.getElementById('form-tags').value = (entry.tags || []).join(', ');
            document.getElementById('form-rating').value = entry.rating || '';
            document.getElementById('form-year').value = entry.year || '';
            document.getElementById('form-emoji').value = entry.emoji || '';
            document.getElementById('form-bg').value = entry.bg || '';
            document.getElementById('form-episodes').value = entry.episodes || '';
            document.getElementById('form-seasons').value = entry.seasons || '';
            
            const imgPreview = document.getElementById('image-preview');
            const img = document.getElementById('preview-img');
            if (entry.cover_url || entry.image) {
                img.src = entry.cover_url || entry.image;
                imgPreview.classList.remove('hidden');
            } else {
                imgPreview.classList.add('hidden');
            }
        }
    } else {
        entryForm.reset();
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('form-file-input').value = "";
    }

    drawer.classList.remove('hidden');
    drawerOverlay.classList.remove('hidden');
}

function closeDrawer() {
    drawer.classList.add('hidden');
    drawerOverlay.classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!supabase) initSupabase();
    if (!supabase) {
        showToast("Please configure Supabase settings.", "error");
        return;
    }

    const fileInput = document.getElementById('form-file-input');
    const file = fileInput.files[0];
    let coverUrl = document.getElementById('form-image').value;

    if (file) {
        showToast("Uploading image...", "info");
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('comic-covers')
            .upload(filePath, file);

        if (uploadError) {
            showToast("Upload failed: " + uploadError.message, "error");
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('comic-covers')
            .getPublicUrl(filePath);

        coverUrl = publicUrl;
    }

    const entryData = {
        title: document.getElementById('form-title').value,
        description: document.getElementById('form-description').value,
        cover_url: coverUrl,
        link: document.getElementById('form-link').value,
        tags: document.getElementById('form-tags').value.split(',').map(t => t.trim()).filter(t => t),
        rating: parseFloat(document.getElementById('form-rating').value) || 0,
        year: parseInt(document.getElementById('form-year').value) || null,
        emoji: document.getElementById('form-emoji').value,
        bg: document.getElementById('form-bg').value,
        episodes: parseInt(document.getElementById('form-episodes').value) || 0,
        seasons: parseInt(document.getElementById('form-seasons').value) || 0,
        is_active: document.getElementById('form-active').checked
    };

    let error;
    if (currentEntryId) {
        const { error: updateError } = await supabase
            .from('comics')
            .update(entryData)
            .eq('id', currentEntryId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('comics')
            .insert([entryData]);
        error = insertError;
    }

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast(currentEntryId ? "Entry updated successfully" : "Entry added successfully", "success");
        closeDrawer();
        loadData();
    }
}

// --- ACTIONS ---
function handleSearch() {
    const query = searchInput.value.toLowerCase();
    const filtered = allEntries.filter(e => 
        e.title.toLowerCase().includes(query) || 
        e.description.toLowerCase().includes(query)
    );
    renderEntries(filtered);
}

// --- CONFIRM DELETE ---
function showConfirmDelete(id) {
    deleteId = id;
    confirmOverlay.classList.remove('hidden');
}

async function deleteEntry() {
    const { error } = await supabase
        .from('comics')
        .delete()
        .eq('id', deleteId);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Entry deleted", "success");
        confirmOverlay.classList.add('hidden');
        loadData();
    }
}

// --- UTILS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

init();
