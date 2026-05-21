/**
 * ContentHub Public Site Logic
 */
const CONFIG = {
    GITHUB_USER: "mahamadhewa00-coder",
    GITHUB_REPO: "contenthub-data",
    GITHUB_BRANCH: "main",
    API_URL: "", // Optional: e.g. "https://your-api.render.com"
    SUPABASE_URL: localStorage.getItem('supabase_url') || "",
    SUPABASE_KEY: localStorage.getItem('supabase_key') || "",
    USE_SUPABASE: !!localStorage.getItem('supabase_url'),
    // الرابط المباشر للملف (Fallback)
    get dataUrl() {
        return `data1.json`;
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
    try {
        if (CONFIG.USE_SUPABASE) {
            await fetchFromSupabase();
            return;
        }

        // Default: Fetch from local data1.json
        const response = await fetch(`${CONFIG.dataUrl}?t=${Date.now()}`);

        if (!response.ok) {
            // If raw fetch fails, try API_URL if it exists
            if (CONFIG.API_URL) {
                const apiResponse = await fetch(`${CONFIG.API_URL}/api/entries`);
                if (apiResponse.ok) {
                    const data = await apiResponse.json();
                    allEntries = data.entries || [];
                } else {
                    throw new Error("API call failed");
                }
            } else {
                throw new Error("Network error - Could not fetch data.");
            }
        } else {
            const data = await response.json();
            allEntries = Array.isArray(data) ? data : (data.entries || []);
        }

        finalizeFetch();
    } catch (e) {
        console.error(e);
        showState('error');
    }
}

async function fetchFromSupabase() {
    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/entries?select=*&order=created_at.desc`, {
            headers: {
                "apikey": CONFIG.SUPABASE_KEY,
                "Authorization": `Bearer ${CONFIG.SUPABASE_KEY}`
            }
        });
        if (response.ok) {
            allEntries = await response.json();
            finalizeFetch();
        } else {
            throw new Error("Supabase fetch failed");
        }
    } catch (e) {
        console.error("Supabase Error:", e);
        // Fallback to local if Supabase fails
        CONFIG.USE_SUPABASE = false;
        fetchData();
    }
}

function finalizeFetch() {
    if (allEntries.length === 0) {
        showState('empty');
    } else {
        showState('grid');
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
        const matchesQuery = (entry.title || "").toLowerCase().includes(query) ||
                             (entry.description || "").toLowerCase().includes(query) ||
                             (entry.tags && entry.tags.some(t => t.toLowerCase().includes(query)));
        
        const matchesTag = activeTag === 'All' || (entry.tags && entry.tags.includes(activeTag));
        return matchesQuery && matchesTag;
    });
    renderCards(filtered);
}

function renderCards(entries) {
    cardGrid.innerHTML = '';
    if (entries.length === 0) { showState('empty'); return; }
    
    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${entry.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${entry.title}" class="card-image" onerror="this.src='https://via.placeholder.com/400x200?text=Error+Loading+Image'">
            <div class="card-body">
                <h3 class="card-title">${entry.title}</h3>
                <p class="card-description">${entry.description}</p>
                ${entry.comments ? `<p class="card-comments"><strong>Note:</strong> ${entry.comments}</p>` : ''}
                <div class="card-tags">
                    ${(entry.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                </div>
                <a href="${entry.link || '#'}" target="_blank" class="card-btn">View Resource</a>
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
