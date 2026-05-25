/**
 * ComicNight Pro Dashboard — Full-Stack Control Engine (2026 Edition)
 */

const ADMIN_PASSWORD = "raven00$A";
const CONFIG = {
    SUPABASE_URL: "https://cnwiqvebnmpmhilwosot.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_WtRQkRCYtZGmxO6qkyfqAg_QRio8UuU"
};

let sbClient = null;
let allEntries = [];
let currentEntryId = null;
let deleteId = null;

// Standardized DOM Access Object
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

    // Proactive Settings
    settingMaintenance: document.getElementById('setting-maintenance'),
    settingAnnouncement: document.getElementById('setting-announcement'),
    settingVideo: document.getElementById('setting-video'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),

    // Core Data Fields (Strict Schema Mapping)
    formTitle: document.getElementById('form-title'),
    formDesc: document.getElementById('form-description'),
    formChapters: document.getElementById('form-chapters'),
    formVolumes: document.getElementById('form-volumes'),
    formRating: document.getElementById('form-rating'),
    formYear: document.getElementById('form-year'),
    formImageHidden: document.getElementById('form-image'),
    formLink: document.getElementById('form-link'),
    formTags: document.getElementById('form-tags'),
    formEmoji: document.getElementById('form-emoji'),
    formBg: document.getElementById('form-bg'),
    formActive: document.getElementById('form-active'),
    formFileInput: document.getElementById('form-file-input'),

    // Auth Display
    formSbUrl: document.getElementById('form-sb-url'),
    formSbKey: document.getElementById('form-sb-key'),

    // Layout Indicators
    imagePreview: document.getElementById('image-preview'),
    previewImg: document.getElementById('preview-img'),
    statTotal: document.getElementById('stat-total'),
    statToday: document.getElementById('stat-today'),
    statFiles: document.getElementById('stat-files')
};

/**
 * ── ARCHITECTURAL INITIALIZATION ──
 */
function init() {
    if (!initSupabase()) {
        showToast("Supabase Handshake Failed", "error");
    }

    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showAdminPanel();
    }

    attachEventListeners();
    syncUIState();
}

function initSupabase() {
    if (window.supabase) {
        sbClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}

function attachEventListeners() {
    elements.loginBtn?.addEventListener('click', handleLogin);
    elements.passwordInput?.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
    elements.logoutBtn?.addEventListener('click', handleLogout);
    elements.addBtn?.addEventListener('click', () => openDrawer());
    elements.closeDrawerBtn?.addEventListener('click', closeDrawer);
    elements.cancelBtn?.addEventListener('click', closeDrawer);
    elements.drawerOverlay?.addEventListener('click', closeDrawer);
    elements.searchInput?.addEventListener('input', handleSearch);
    elements.saveSettingsBtn?.addEventListener('click', updateSettings);
    elements.entryForm?.addEventListener('submit', handleFormSubmit);
    elements.confirmDeleteBtn?.addEventListener('click', deleteEntry);
    elements.cancelDeleteBtn?.addEventListener('click', () => elements.confirmOverlay?.classList.remove('active'));

    elements.formFileInput?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                if (elements.previewImg) elements.previewImg.src = ev.target.result;
                elements.imagePreview?.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

function syncUIState() {
    if (elements.formSbUrl) elements.formSbUrl.value = CONFIG.SUPABASE_URL;
    if (elements.formSbKey) elements.formSbKey.value = "••••••••••••••••";
}

/**
 * ── SECURITY LAYER ──
 */
function handleLogin() {
    if (elements.passwordInput?.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showAdminPanel();
    } else {
        elements.loginError?.classList.remove('hidden');
        setTimeout(() => elements.loginError?.classList.add('hidden'), 3000);
    }
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

function showAdminPanel() {
    elements.loginGate?.classList.add('hidden');
    elements.adminPanel?.classList.remove('hidden');
    loadData();
}

/**
 * ── DATA MANAGEMENT ENGINE ──
 */
async function loadData() {
    if (!sbClient) return;

    try {
        const [entriesRes, settingsRes] = await Promise.all([
            sbClient.from('comics').select('*').order('created_at', { ascending: false }),
            sbClient.from('settings').select('*').single()
        ]);

        if (entriesRes.error) throw entriesRes.error;
        allEntries = entriesRes.data;
        renderEntries(allEntries);
        updateAnalytics(allEntries);

        if (settingsRes.data) {
            const s = settingsRes.data;
            if (elements.settingMaintenance) elements.settingMaintenance.checked = s.maintenance_mode;
            if (elements.settingAnnouncement) elements.settingAnnouncement.value = s.announcement || '';
            if (elements.settingVideo) elements.settingVideo.value = s.video_ad_url || '';
        }
    } catch (e) {
        showToast(e.message, "error");
    }
}

function renderEntries(data) {
    if (!elements.entryList) return;
    elements.entryList.innerHTML = '';

    data.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'entry-card';
        div.innerHTML = `
            <img src="${entry.cover_url || 'https://via.placeholder.com/64'}" class="entry-img" onerror="this.src='https://via.placeholder.com/64'">
            <div class="entry-info">
                <h4>${entry.title}</h4>
                <p>${entry.chapters} Chapters · ${entry.volumes} Volumes · ${entry.year}</p>
            </div>
            <div class="entry-actions">
                <button class="edit-btn" data-id="${entry.id}"><i class="fas fa-pen-to-square"></i></button>
                <button class="delete-btn" data-id="${entry.id}"><i class="fas fa-trash-can"></i></button>
            </div>
        `;

        div.querySelector('.edit-btn').onclick = () => openDrawer(entry.id);
        div.querySelector('.delete-btn').onclick = () => showConfirmDelete(entry.id);

        elements.entryList.appendChild(div);
    });
}

function updateAnalytics(data) {
    if (elements.statTotal) elements.statTotal.textContent = data.length;
    const today = new Date().toISOString().split('T')[0];
    const count = data.filter(e => e.created_at?.startsWith(today)).length;
    if (elements.statToday) elements.statToday.textContent = count;
}

/**
 * ── ATOMIC FORM HANDLING ──
 */
function openDrawer(id = null) {
    currentEntryId = id;
    if (elements.drawerTitle) elements.drawerTitle.textContent = id ? 'Revise Archive Entry' : 'Integrate New Story';
    
    if (id) {
        const entry = allEntries.find(e => e.id === id);
        if (entry) {
            elements.formTitle.value = entry.title || '';
            elements.formDesc.value = entry.description || '';
            elements.formChapters.value = entry.chapters || 0;
            elements.formVolumes.value = entry.volumes || 0;
            elements.formRating.value = entry.rating || 0;
            elements.formYear.value = entry.year || 2024;
            elements.formImageHidden.value = entry.cover_url || '';
            elements.formLink.value = entry.link || '';
            elements.formTags.value = Array.isArray(entry.tags) ? entry.tags.join(', ') : (entry.tags || '');
            elements.formEmoji.value = entry.emoji || '📖';
            elements.formBg.value = entry.bg || '';
            elements.formActive.checked = entry.is_active !== false;
            
            if (entry.cover_url && elements.previewImg) {
                elements.previewImg.src = entry.cover_url;
                elements.imagePreview?.classList.remove('hidden');
            }
        }
    } else {
        elements.entryForm?.reset();
        elements.imagePreview?.classList.add('hidden');
        elements.formImageHidden.value = '';
    }

    elements.drawer?.classList.add('active');
    elements.drawerOverlay?.classList.add('active');
}

function closeDrawer() {
    elements.drawer?.classList.remove('active');
    elements.drawerOverlay?.classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!sbClient) return;

    const file = elements.formFileInput.files[0];
    let coverUrl = elements.formImageHidden.value;

    try {
        if (file) {
            showToast("Encrypting & Uploading Media...", "info");
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${file.name.split('.').pop()}`;
            const { data: upData, error: upErr } = await sbClient.storage.from('comic-covers').upload(fileName, file);
            if (upErr) throw upErr;
            const { data: { publicUrl } } = sbClient.storage.from('comic-covers').getPublicUrl(fileName);
            coverUrl = publicUrl;
        }

        const payload = {
            title: elements.formTitle.value,
            description: elements.formDesc.value,
            chapters: parseInt(elements.formChapters.value) || 0,
            volumes: parseInt(elements.formVolumes.value) || 0,
            rating: parseFloat(elements.formRating.value) || 0,
            year: parseInt(elements.formYear.value) || 2024,
            cover_url: coverUrl,
            link: elements.formLink.value,
            tags: elements.formTags.value.split(',').map(t => t.trim()).filter(t => t),
            emoji: elements.formEmoji.value || '📖',
            bg: elements.formBg.value || '#12122c',
            is_active: elements.formActive.checked
        };

        const result = currentEntryId
            ? await sbClient.from('comics').update(payload).eq('id', currentEntryId)
            : await sbClient.from('comics').insert([payload]);

        if (result.error) throw result.error;

        showToast("Synchronized with Supabase", "success");
        closeDrawer();
        loadData();
    } catch (err) {
        showToast(err.message, "error");
    }
}

/**
 * ── GLOBAL PROTOCOLS ──
 */
async function updateSettings() {
    if (!sbClient) return;
    const payload = {
        id: 1,
        maintenance_mode: elements.settingMaintenance.checked,
        announcement: elements.settingAnnouncement.value,
        video_ad_url: elements.settingVideo.value
    };

    const { error } = await sbClient.from('settings').upsert(payload);
    if (error) showToast(error.message, "error");
    else showToast("Site Protocol Updated", "success");
}

function handleSearch() {
    const q = elements.searchInput.value.toLowerCase();
    const filtered = allEntries.filter(e => e.title?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q)));
    renderEntries(filtered);
}

function showConfirmDelete(id) {
    deleteId = id;
    elements.confirmOverlay?.classList.add('active');
}

async function deleteEntry() {
    if (!sbClient || !deleteId) return;
    const { error } = await sbClient.from('comics').delete().eq('id', deleteId);
    if (error) showToast(error.message, "error");
    else {
        showToast("Entry Purged", "success");
        elements.confirmOverlay?.classList.remove('active');
        loadData();
    }
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check' : 'fa-triangle-exclamation'}"></i><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; setTimeout(() => t.remove(), 400); }, 3500);
}

document.addEventListener('DOMContentLoaded', init);
