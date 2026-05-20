/**
 * ContentHub Public Site Logic (Updated & Secured)
 */
const CONFIG = {
    GITHUB_USER: "mahamadhewa00-coder",
    GITHUB_REPO: "contenthub-data",
    GITHUB_BRANCH: "main",
    // ناوی فایلە نهێنییەکە
    DATA_FILE: "assets.dat", 
    get rawBaseUrl() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USER}/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}`;
    }
};

let allEntries = [];
let activeTag = 'All';

const cardGrid = document.getElementById('card-grid');
const searchInput = document.getElementById('search-input');
const tagFilters = document.getElementById('tag-filters');

async function init() {
    try {
        const response = await fetch(`${CONFIG.rawBaseUrl}/${CONFIG.DATA_FILE}?t=${Date.now()}`);
        const data = await response.json();
        allEntries = Array.isArray(data) ? data : (data.entries || []);
        allEntries.sort((a, b) => new Date(b.id) - new Date(a.id));
        renderTags();
        renderCards(allEntries);
    } catch (e) { console.error("Error loading data"); }
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
                <button onclick="window.open('${entry.link}', '_blank', 'noopener,noreferrer')" class="card-btn">View Resource</button>
            </div>
        `;
        cardGrid.appendChild(card);
    });
}

function renderTags() {
    const tags = new Set(['All']);
    allEntries.forEach(entry => entry.tags?.forEach(t => tags.add(t)));
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
    const filtered = allEntries.filter(e => e.title.toLowerCase().includes(query) || e.description.toLowerCase().includes(query));
    renderCards(filtered);
}

document.addEventListener('DOMContentLoaded', init);
