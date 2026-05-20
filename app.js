/**
 * ContentHub Public Site Logic
 * 
 * CONFIGURATION:
 * Change these values to point to your own GitHub repository
 */
const CONFIG = {
    GITHUB_USER: "YOUR_GITHUB_USERNAME",
    GITHUB_REPO: "YOUR_DATA_REPO_NAME",
    GITHUB_BRANCH: "main",
    // Base URL for GitHub Raw content
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

/**
 * Initialize the application
 */
async function init() {
    try {
        await fetchData();
        renderTags();
        renderCards(allEntries);
        
        // Setup Search Listener
        searchInput.addEventListener('input', handleSearch);
    } catch (error) {
        console.error("Initialization failed:", error);
        showState('error');
    }
}

/**
 * Fetch data from GitHub auto-discovering partitions
 */
async function fetchData() {
    showState('loading');
    let fileIndex = 1;
    let hasMore = true;
    allEntries = [];

    while (hasMore) {
        try {
            const response = await fetch(`${CONFIG.rawBaseUrl}/data${fileIndex}.json?t=${Date.now()}`);
            if (!response.ok) {
                hasMore = false;
                break;
            }
            const data = await response.json();
            if (data.entries && Array.isArray(data.entries)) {
                allEntries = [...allEntries, ...data.entries];
            }
            fileIndex++;
        } catch (e) {
            hasMore = false;
        }
    }

    if (allEntries.length === 0 && fileIndex === 1) {
        // Not necessarily an error, could be a fresh repo. 
        // We'll show the empty state instead of error state.
        showState('empty');
        return;
    }

    // Sort by date desc
    allEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    showState('grid');
}

/**
 * Render Tag Filter Chips
 */
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

/**
 * Filter entries by tag
 */
function filterByTag(tag) {
    activeTag = tag;
    renderTags();
    handleSearch(); // Re-apply search with new tag
}

/**
 * Handle search and tag filtering
 */
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

/**
 * Render cards to the grid
 */
function renderCards(entries) {
    cardGrid.innerHTML = '';
    
    if (entries.length === 0) {
        showState('empty');
        return;
    }

    showState('grid');
    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${entry.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${entry.title}" class="card-image" onerror="this.src='https://via.placeholder.com/400x200?text=Error+Loading+Image'">
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

/**
 * Helper to switch between UI states
 */
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

// Start the app
document.addEventListener('DOMContentLoaded', init);
