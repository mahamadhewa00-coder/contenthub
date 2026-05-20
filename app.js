/**
 * ContentHub Public Site Logic
 */
const CONFIG = {
    GITHUB_USER: "mahamadhewa00-coder",
    GITHUB_REPO: "contenthub-data",
    GITHUB_BRANCH: "main",
    // بەکارهێنانی لینکی raw ڕاستەوخۆ
    get rawBaseUrl() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USER}/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}`;
    }
};

let allEntries = [];
let activeTag = 'All';

// DOM Elements
const cardGrid = document.getElementById('card-grid');
const searchInput = document.getElementById('search-input');
const tagFilters = document.getElementById('tag-filters');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');

async function init() {
    try {
        await fetchData();
        renderTags();
        renderCards(allEntries);
        searchInput.addEventListener('input', handleSearch);
    } catch (error) {
        console.error("Initialization failed:", error);
        showState('error');
    }
}

async function fetchData() {
    showState('loading');
    allEntries = [];

    try {
        // بانگکردنی فایلەکەت ڕاستەوخۆ
        const response = await fetch(`${CONFIG.rawBaseUrl}/data1.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to fetch data");
        
        const data = await response.json();
        
        // ئەگەر فایلەکە ڕاستەوخۆ لیستە یان ئۆبجێکتێکە کە 'entries' ی تێدایە
        allEntries = Array.isArray(data) ? data : (data.entries || []);
        
        if (allEntries.length === 0) {
            showState('empty');
            return;
        }

        showState('grid');
    } catch (e) {
        console.error(e);
        showState('error');
    }
}

// ... (باقی کۆدەکانی تریش وەک خۆیان بهێڵەرەوە) ...
// تەنها renderTags و renderCards و ئەوانی تر وەک خۆیان بەکاربێنە

function renderTags() {
    const tags = new Set(['All']);
    allEntries.forEach(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
            entry.tags.forEach(tag => tags.add(tag));
        }
    });

    tagFilters.innerHTML = '';
    tags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = `tag-chip ${tag === activeTag ? 'active' : ''}`;
        chip.textContent = tag;
        chip.onclick = () => filterByTag(tag);
        tagFilters.appendChild(chip);
    });
}

function filterByTag(tag) {
    activeTag = tag;
    renderTags();
    handleSearch();
}

function handleSearch() {
    const query = searchInput.value.toLowerCase();
    const filtered = allEntries.filter(entry => {
        const matchesQuery = entry.title.toLowerCase().includes(query) || 
                             entry.description.toLowerCase().includes(query) ||
                             (entry.tags && entry.tags.some(t => t.toLowerCase().includes(query)));
        const matchesTag = activeTag === 'All' || (entry.tags && entry.tags.includes(activeTag));
        return matchesQuery && matchesTag;
    });
    renderCards(filtered);
}

function renderCards(entries) {
    cardGrid.innerHTML = '';
    if (entries.length === 0) { showState('empty'); return; }
    showState('grid');
    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${entry.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${entry.title}" class="card-image">
            <div class="card-body">
                <h3 class="card-title">${entry.title}</h3>
                <p class="card-description">${entry.description}</p>
                <div class="card-tags">
                    ${(entry.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                </div>
                <a href="${entry.link}" target="_blank" class="card-btn">View Resource</a>
            </div>
        `;
        cardGrid.appendChild(card);
    });
}

function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    cardGrid.classList.add('hidden');
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'error') errorState.classList.remove('hidden');
    else if (state === 'empty') emptyState.classList.remove('hidden');
    else if (state === 'grid') cardGrid.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
