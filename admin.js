/**
 * ContentHub Admin Panel Logic - Supabase Integrated (Production Ready)
 */

// --- CONFIGURATION ---
const ADMIN_PASSWORD = "raven00$A";
let sbClient = null;

// --- STATE MANAGEMENT ---
let allEntries = [];
let currentEntryId = null;
let deleteId = null;

// --- DOM ELEMENTS ---
const elements = {
    loginGate: document.getElementById('login-gate'),
    adminPanel: document.getElementById('admin-panel'),
    passwordInput: document.getElementById('admin-password'),
    loginBtn: document.getElementById('login-btn'),
    loginError: document.getElementById('login-error'),

    entryList: document.getElementById('admin-entry-list'),
    searchInput: document.getElementById('admin-search'),
    addBtn: document.getElementById('add-entry-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    stickySaveBtn: document.getElementById('sticky-save-btn'),

    drawer: document.getElementById('entry-drawer'),
    drawerOverlay: document.getElementById('form-overlay'),
    drawerTitle: document.getElementById('drawer-title'),
    entryForm: document.getElementById('entry-form'),
    closeDrawerBtn: document.getElementById('close-drawer'),
    cancelBtn: document.getElementById('cancel-btn'),

    confirmOverlay: document.getElementById('confirm-overlay'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),

    // Settings
    settingMaintenance: document.getElementById('setting-maintenance'),
    settingAnnouncement: document.getElementById('setting-announcement'),
    settingVideo: document.getElementById('setting-video'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),

    // Form Fields
    formTitle: document.getElementById('form-title'),
    formDesc: document.getElementById('form-description'),
    formFileInput: document.getElementById('form-file-input'),
    formImageHidden: document.getElementById('form-image'),
    formLink: document.getElementById('form-link'),
    formTags: document.getElementById('form-tags'),
    formRating: document.getElementById('form-rating'),
    formYear: document.getElementById('form-year'),
    formEmoji: document.getElementById('form-emoji'),
    formBg: document.getElementById('form-bg'),
    formEpisodes: document.getElementById('form-episodes'),
    formSeasons: document.getElementById('form-seasons'),
    formActive: document.getElementById('form-active'),

    // Config
    formSbUrl: document.getElementById('form-sb-url'),
    formSbKey: document.getElementById('form-sb-key'),

    // Preview
    imagePreview: document.getElementById('image-preview'),
    previewImg: document.getElementById('preview-img'),

    // Stats
    statTotal: document.getElementById('stat-total'),
    statToday: document.getElementById('stat-today'),
    statFiles: document.getElementById('stat-files'),
    storageFilename: document.getElementById('storage-filename'),
    storageProgress: document.getElementById('storage-progress'),
    storageUsage: document.getElementById('storage-usage'),
    storagePercentage: document.getElementById('storage-percentage')
};

// --- INITIALIZATION ---
function init() {
    // Session Check
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showAdminPanel();
    }

    // Event Listeners
    if (elements.loginBtn) elements.loginBtn.addEventListener('click', handleLogin);
    if (elements.passwordInput) {
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);
    if (elements.addBtn) elements.addBtn.addEventListener('click', () => openDrawer());
    if (elements.closeDrawerBtn) elements.closeDrawerBtn.addEventListener('click', closeDrawer);
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', closeDrawer);
    if (elements.drawerOverlay) elements.drawerOverlay.addEventListener('click', closeDrawer);
    
    if (elements.searchInput) elements.searchInput.addEventListener('input', handleSearch);
    if (elements.stickySaveBtn) elements.stickySaveBtn.addEventListener('click', () => showToast("Changes are live on Supabase! 🚀"));

    // File input preview
    if (elements.formFileInput) {
        elements.formFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (elements.previewImg) elements.previewImg.src = e.target.result;
                    if (elements.imagePreview) elements.imagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (elements.cancelDeleteBtn) {
        elements.cancelDeleteBtn.addEventListener('click', () => {
            if (elements.confirmOverlay) elements.confirmOverlay.classList.add('hidden');
        });
    }

    if (elements.confirmDeleteBtn) elements.confirmDeleteBtn.addEventListener('click', deleteEntry);

    if (elements.entryForm) elements.entryForm.addEventListener('submit', handleFormSubmit);
    if (elements.saveSettingsBtn) elements.saveSettingsBtn.addEventListener('click', updateSettings);

    // Load SB Config from Session
    if (elements.formSbUrl) elements.formSbUrl.value = sessionStorage.getItem('sbUrl') || '';
    if (elements.formSbKey) elements.formSbKey.value = sessionStorage.getItem('sbKey') || '';

    if (sessionStorage.getItem('sbUrl') && sessionStorage.getItem('sbKey')) {
        initSupabase();
    }
}

function initSupabase() {
    const url = elements.formSbUrl ? elements.formSbUrl.value : '';
    const key = elements.formSbKey ? elements.formSbKey.value : '';
    if (url && key && window.supabase) {
        sbClient = window.supabase.createClient(url, key);
        sessionStorage.setItem('sbUrl', url);
        sessionStorage.setItem('sbKey', key);
        return true;
    }
    return false;
}

// --- AUTHENTICATION ---
function handleLogin() {
    if (elements.passwordInput && elements.passwordInput.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showAdminPanel();
    } else {
        if (elements.loginError) elements.loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

function showAdminPanel() {
    if (elements.loginGate) elements.loginGate.classList.add('hidden');
    if (elements.adminPanel) elements.adminPanel.classList.remove('hidden');
    loadData();
}

// --- DATA FETCHING ---
async function loadData() {
    if (!sbClient) initSupabase();
    if (!sbClient) return;

    try {
        // Load Entries
        const { data, error } = await sbClient
            .from('comics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            showToast(error.message, "error");
        } else {
            allEntries = data;
            renderEntries(allEntries);
            updateStats(data);
        }

        // Load Settings
        const { data: sData } = await sbClient
            .from('settings')
            .select('*')
            .single();

        if (sData) {
            if (elements.settingMaintenance) elements.settingMaintenance.checked = sData.maintenance_mode;
            if (elements.settingAnnouncement) elements.settingAnnouncement.value = sData.announcement || '';
            if (elements.settingVideo) elements.settingVideo.value = sData.video_ad_url || '';
        }
    } catch (e) {
        console.error("Supabase load error:", e);
    }
}

function updateStats(data) {
    if (elements.statTotal) elements.statTotal.textContent = data.length;
    const today = new Date().toISOString().split('T')[0];
    const addedToday = data.filter(e => e.created_at && e.created_at.startsWith(today)).length;
    if (elements.statToday) elements.statToday.textContent = addedToday;
    if (elements.statFiles) elements.statFiles.textContent = "DB";
}

async function updateSettings() {
    if (!sbClient) initSupabase();
    if (!sbClient) return showToast("Supabase not initialized", "error");

    const isMaintenance = elements.settingMaintenance.checked;
    const announcement = elements.settingAnnouncement.value;
    const videoAd = elements.settingVideo.value;

    const { error } = await sbClient
        .from('settings')
        .upsert({ id: 1, maintenance_mode: isMaintenance, announcement: announcement, video_ad_url: videoAd });

    if (error) showToast(error.message, "error");
    else showToast("Settings updated!", "success");
}

// --- UI RENDERING ---
function renderEntries(entries) {
    if (!elements.entryList) return;
    elements.entryList.innerHTML = '';
    entries.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'entry-card';
        const imgUrl = entry.cover_url || entry.image || 'https://via.placeholder.com/60';
        div.innerHTML = `
            <img src="${imgUrl}" class="entry-img" onerror="this.src='https://via.placeholder.com/60'">
            <div class="entry-info">
                <h4>${entry.title}</h4>
                <p>${entry.description || ''}</p>
            </div>
            <div class="entry-actions">
                <button class="edit-btn" title="Edit" data-id="${entry.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" title="Delete" data-id="${entry.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // Add events to buttons
        div.querySelector('.edit-btn').onclick = () => openDrawer(entry.id);
        div.querySelector('.delete-btn').onclick = () => showConfirmDelete(entry.id);

        elements.entryList.appendChild(div);
    });
}

// --- FORM HANDLING ---
function openDrawer(id = null) {
    currentEntryId = id;
    if (elements.drawerTitle) elements.drawerTitle.textContent = id ? 'Edit Comic' : 'Add New Comic';
    
    if (id) {
        const entry = allEntries.find(e => e.id === id);
        if (entry) {
            if (elements.formTitle) elements.formTitle.value = entry.title || '';
            if (elements.formDesc) elements.formDesc.value = entry.description || '';
            if (elements.formImageHidden) elements.formImageHidden.value = entry.cover_url || entry.image || '';
            if (elements.formLink) elements.formLink.value = entry.link || '';
            if (elements.formTags) elements.formTags.value = Array.isArray(entry.tags) ? entry.tags.join(', ') : (entry.tags || '');
            if (elements.formRating) elements.formRating.value = entry.rating || '';
            if (elements.formYear) elements.formYear.value = entry.year || '';
            if (elements.formEmoji) elements.formEmoji.value = entry.emoji || '';
            if (elements.formBg) elements.formBg.value = entry.bg || '';
            if (elements.formEpisodes) elements.formEpisodes.value = entry.episodes || '';
            if (elements.formSeasons) elements.formSeasons.value = entry.seasons || '';
            if (elements.formActive) elements.formActive.checked = entry.is_active !== false;
            
            if (elements.imagePreview && elements.previewImg) {
                const url = entry.cover_url || entry.image;
                if (url) {
                    elements.previewImg.src = url;
                    elements.imagePreview.classList.remove('hidden');
                } else {
                    elements.imagePreview.classList.add('hidden');
                }
            }
        }
    } else {
        if (elements.entryForm) elements.entryForm.reset();
        if (elements.imagePreview) elements.imagePreview.classList.add('hidden');
        if (elements.formFileInput) elements.formFileInput.value = "";
        if (elements.formImageHidden) elements.formImageHidden.value = "";
    }

    if (elements.drawer) elements.drawer.classList.add('active');
    if (elements.drawerOverlay) elements.drawerOverlay.classList.add('active');
}

function closeDrawer() {
    if (elements.drawer) elements.drawer.classList.remove('active');
    if (elements.drawerOverlay) elements.drawerOverlay.classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!sbClient) initSupabase();
    if (!sbClient) return showToast("Please configure Supabase settings.", "error");

    const file = elements.formFileInput.files[0];
    let coverUrl = elements.formImageHidden.value;

    if (file) {
        showToast("Uploading image...", "info");
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await sbClient.storage
            .from('comic-covers')
            .upload(filePath, file);

        if (uploadError) {
            showToast("Upload failed: " + uploadError.message, "error");
            return;
        }

        const { data: { publicUrl } } = sbClient.storage
            .from('comic-covers')
            .getPublicUrl(filePath);

        coverUrl = publicUrl;
    }

    const entryData = {
        title: elements.formTitle.value,
        description: elements.formDesc.value,
        cover_url: coverUrl,
        link: elements.formLink.value,
        tags: elements.formTags.value.split(',').map(t => t.trim()).filter(t => t),
        rating: parseFloat(elements.formRating.value) || 0,
        year: parseInt(elements.formYear.value) || null,
        emoji: elements.formEmoji.value,
        bg: elements.formBg.value,
        episodes: parseInt(elements.formEpisodes.value) || 0,
        seasons: parseInt(elements.formSeasons.value) || 0,
        is_active: elements.formActive.checked
    };

    try {
        let error;
        if (currentEntryId) {
            const { error: updateError } = await sbClient
                .from('comics')
                .update(entryData)
                .eq('id', currentEntryId);
            error = updateError;
        } else {
            const { error: insertError } = await sbClient
                .from('comics')
                .insert([entryData]);
            error = insertError;
        }

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast(currentEntryId ? "Comic updated!" : "Comic added!", "success");
            closeDrawer();
            loadData();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

// --- ACTIONS ---
function handleSearch() {
    const query = elements.searchInput.value.toLowerCase();
    const filtered = allEntries.filter(e => 
        (e.title && e.title.toLowerCase().includes(query)) ||
        (e.description && e.description.toLowerCase().includes(query))
    );
    renderEntries(filtered);
}

// --- CONFIRM DELETE ---
function showConfirmDelete(id) {
    deleteId = id;
    if (elements.confirmOverlay) elements.confirmOverlay.classList.remove('hidden');
}

async function deleteEntry() {
    if (!sbClient || !deleteId) return;

    const { error } = await sbClient
        .from('comics')
        .delete()
        .eq('id', deleteId);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Comic deleted", "success");
        if (elements.confirmOverlay) elements.confirmOverlay.classList.add('hidden');
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
        <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle')}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
