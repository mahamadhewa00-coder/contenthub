/**
 * ContentHub Admin Panel Logic
 */

// --- CONFIGURATION ---
const ADMIN_PASSWORD = "raven00$A";

// --- STATE MANAGEMENT ---
let allEntries = [];
let storageData = null;
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

const settingsDrawer = document.getElementById('settings-drawer');
const settingsToggleBtn = document.getElementById('settings-toggle-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// --- INITIALIZATION ---
function init() {
    // Check if already logged in
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
    drawerOverlay.onclick = () => { closeDrawer(); closeSettings(); };
    
    settingsToggleBtn.onclick = openSettings;
    closeSettingsBtn.onclick = closeSettings;
    saveSettingsBtn.onclick = saveSettings;
    testConnectionBtn.onclick = testConnection;

    searchInput.oninput = handleSearch;
    stickySaveBtn.onclick = () => showToast("Site is automatically updated on every save! 🚀");

    // Form Image Preview
    document.getElementById('form-image').oninput = (e) => {
        const preview = document.getElementById('image-preview');
        const img = document.getElementById('preview-img');
        if (e.target.value) {
            img.src = e.target.value;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
    };

    // Delete Events
    cancelDeleteBtn.onclick = () => confirmOverlay.classList.add('hidden');
    confirmDeleteBtn.onclick = deleteEntry;

    // Form Submit
    entryForm.onsubmit = handleFormSubmit;

    // Load API Config from LocalStorage
    document.getElementById('form-api-url').value = localStorage.getItem('apiUrl') || '';
    document.getElementById('form-api-key').value = localStorage.getItem('apiKey') || '';
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

// --- SETTINGS MANAGEMENT ---
function openSettings() {
    settingsDrawer.classList.remove('hidden');
    drawerOverlay.classList.remove('hidden');
}

function closeSettings() {
    settingsDrawer.classList.add('hidden');
    drawerOverlay.classList.add('hidden');
}

function saveSettings() {
    const apiUrl = document.getElementById('form-api-url').value;
    const apiKey = document.getElementById('form-api-key').value;

    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiKey', apiKey);

    showToast("Settings saved successfully");
    closeSettings();
    loadData();
}

async function testConnection() {
    const originalText = testConnectionBtn.innerHTML;
    testConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    testConnectionBtn.disabled = true;

    const data = await apiRequest('/api/health');

    testConnectionBtn.innerHTML = originalText;
    testConnectionBtn.disabled = false;

    if (data && data.status === 'healthy') {
        showToast("Connection Successful! API is healthy.", "success");
    } else {
        showToast("Connection Failed. Check your URL and Key.", "error");
    }
}

// --- DATA FETCHING ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const apiUrl = localStorage.getItem('apiUrl');
    const apiKey = localStorage.getItem('apiKey');

    if (!apiUrl || !apiKey) {
        showToast("Please set API URL and Secret Key in Settings.", "error");
        openSettings();
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
    };

    try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Request failed');
        
        if (data.storage) updateStorageUI(data.storage);
        return data;
    } catch (error) {
        showToast(error.message, "error");
        return null;
    }
}

async function loadData() {
    const data = await apiRequest('/api/entries');
    if (data) {
        allEntries = data.entries;
        renderEntries(allEntries);
    }
}

// --- UI RENDERING ---
function renderEntries(entries) {
    entryList.innerHTML = '';
    entries.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'entry-card';
        div.innerHTML = `
            <img src="${entry.image || 'https://via.placeholder.com/60'}" class="entry-img" onerror="this.src='https://via.placeholder.com/60'">
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

function updateStorageUI(stats) {
    document.getElementById('stat-total').textContent = stats.total_entries;
    document.getElementById('stat-today').textContent = stats.added_today;
    document.getElementById('stat-files').textContent = stats.total_files;

    if (stats.files && stats.files.length > 0) {
        const activeFile = stats.files[stats.files.length - 1];
        document.getElementById('storage-filename').textContent = activeFile.file;
        document.getElementById('storage-progress').style.width = `${activeFile.percentage}%`;
        document.getElementById('storage-usage').textContent = `${(activeFile.size / 1024).toFixed(2)} KB / ${(stats.max_file_bytes / 1024).toFixed(0)} KB`;
        document.getElementById('storage-percentage').textContent = `${activeFile.percentage}% used`;
    }
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
            document.getElementById('form-comments').value = entry.comments || '';
            document.getElementById('form-image').value = entry.image;
            document.getElementById('form-link').value = entry.link;
            document.getElementById('form-tags').value = (entry.tags || []).join(', ');
            
            // Trigger preview
            document.getElementById('form-image').oninput({ target: { value: entry.image } });
        }
    } else {
        entryForm.reset();
        document.getElementById('image-preview').classList.add('hidden');
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
    
    const saveBtn = document.getElementById('save-entry-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    const entryData = {
        title: document.getElementById('form-title').value,
        description: document.getElementById('form-description').value,
        comments: document.getElementById('form-comments').value,
        image: document.getElementById('form-image').value,
        link: document.getElementById('form-link').value,
        tags: document.getElementById('form-tags').value
    };

    let result;
    if (currentEntryId) {
        result = await apiRequest(`/api/entries/${currentEntryId}`, 'PUT', entryData);
    } else {
        result = await apiRequest('/api/entries', 'POST', entryData);
    }

    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;

    if (result) {
        showToast(currentEntryId ? "Entry updated successfully" : "Entry added successfully", "success");
        closeDrawer();
        loadData();
        stickySaveBtn.classList.remove('hidden');
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
    const result = await apiRequest(`/api/entries/${deleteId}`, 'DELETE');
    if (result) {
        showToast("Entry deleted", "success");
        confirmOverlay.classList.add('hidden');
        loadData();
    }
}

// --- UTILS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Start Admin
init();
