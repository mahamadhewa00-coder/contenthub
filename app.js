/**
 * ContentHub Public Site Logic
 */
const CONFIG = {
    GITHUB_USER: "mahamadhewa00-coder",
    GITHUB_REPO: "contenthub-data",
    GITHUB_BRANCH: "main",
    get rawBaseUrl() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USER}/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}`;
    }
};

let allEntries = [];
let activeTag = 'All';

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
        showState('error');
    }
}

async function fetchData() {
    showState('loading');
    allEntries = [];
    
    try {
        // بەکارهێنانی لینکی ڕاستەوخۆ بۆ data1.json لەگەڵ کات بۆ ڕێگریکردن لە Cache
        const response = await fetch(`${CONFIG.rawBaseUrl}/data1.json?t=${Date.now()}`);
        
        if (!response.ok) throw new Error("Could not fetch data");
        
        const data = await response.json();
        
        // چارەسەری کێشەی ئەوەی داتاکە لیستە یان لەناو "entries"ـدایە
        allEntries = Array.isArray(data) ? data : (data.entries || []);
        
        // ڕیزبەندی بەپێی کات
        allEntries.sort((a, b) => new Date(b.id) - new Date(a.id));
        
        if (allEntries.length === 0) showState('empty');
        else showState('grid');
        
    } catch (e) {
        showState('error');
    }
}

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
        chip.onclick = () => { activeTag = tag; renderTags(); handleSearch(); };
        tagFilters.appendChild(chip);
    });
}

function handleSearch() {
    const query = searchInput.value.toLowerCase();
    const filtered = allEntries.filter(entry => {
        const matchesQuery = entry.title.toLowerCase().includes(query) || 
                             entry.description.toLowerCase().includes(query);
        const matchesTag = activeTag === 'All' || (entry.tags && entry.tags.includes(activeTag));
        return matchesQuery && matchesTag;
    });
    renderCards(filtered);
}

function renderCards(entries) {
    cardGrid.innerHTML = '';
    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${entry.image || 'https://via.placeholder.com/400x200'}" alt="${entry.title}" class="card-image">
            <div class="card-body">
                <h3>${entry.title}</h3>
                <p>${entry.description}</p>
                <a href="${entry.link}" target="_blank" class="card-btn">View Resource</a>
            </div>
        `;
        cardGrid.appendChild(card);
    });
}

function showState(state) {
    [loadingState, errorState, emptyState, cardGrid].forEach(el => el.classList.add('hidden'));
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'error') errorState.classList.remove('hidden');
    else if (state === 'empty') emptyState.classList.remove('hidden');
    else if (state === 'grid') cardGrid.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
