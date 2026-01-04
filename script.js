// 1. DATA INITIALIZATION
let vaultData = [
    { title: "Death Is The Only Ending For The Villainess", chapters: "183", type: "Manhwa", status: "On Going", genre: ["Fantasy", "Romance"], storyRating: 10, artRating: "10", img: "https://static.wikia.nocookie.net/villains-are-destined-to-die/images/a/a2/Vol_1_Cover.jpg", review: "I'm crying at the corner of my room rn the storyline is so chef kiss" },
    { title: "I Lost The Leash Of The Yandere Male Lead", chapters: "-", type: "Manhwa", status: "Dropped", genre: ["Romance"], storyRating: 0, artRating: "Meh", img: "", review: "Bro the male lead has double chin. Meh art. Meh fl" }
];

let currentFilter = 'All';
let editIndex = null;
let selectedGenres = []; // Pastikan ini di atas

// 2. LOCAL STORAGE LOAD
if (localStorage.getItem('manhwaEliteVault')) {
    vaultData = JSON.parse(localStorage.getItem('manhwaEliteVault'));
}

// 3. DISPLAY & FILTER LOGIC
function displayItems() {
    const grid = document.getElementById('list-grid');
    const term = document.getElementById('searchInput').value.toLowerCase();
    const sortVal = document.getElementById('sortOrder').value;
    grid.innerHTML = "";
    
    // Filtering
    let filtered = vaultData.filter(item => {
        const matchesSection = (currentFilter === 'All') ? true : 
                               (currentFilter === 'ToRead') ? item.status === 'Plan to Read' : 
                               item.status !== 'Plan to Read';
                               
        const genresForSearch = Array.isArray(item.genre) ? item.genre.join(' ') : (item.genre || "");
        const matchesSearch = item.title.toLowerCase().includes(term) || 
                             item.review.toLowerCase().includes(term) || 
                             genresForSearch.toLowerCase().includes(term);

        return matchesSearch && matchesSection;
    });

    // Sorting
    // Sorting Logic
if (sortVal === "highRating") {
    filtered.sort((a, b) => parseFloat(b.storyRating || 0) - parseFloat(a.storyRating || 0));
} else if (sortVal === "lowRating") {
    filtered.sort((a, b) => parseFloat(a.storyRating || 0) - parseFloat(b.storyRating || 0));
} else if (sortVal === "latest") {
    filtered.reverse(); 
} 
// TAMBAH LOGIK BARU NI
else if (sortVal === "az") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
} else if (sortVal === "za") {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
}
    document.getElementById('total-count').innerText = filtered.length;

    // Rendering
    filtered.forEach((item) => {
        const actualIndex = vaultData.indexOf(item);
        const genres = Array.isArray(item.genre) ? item.genre : (item.genre ? item.genre.split(',').map(g => g.trim()) : []);
        
        let genreHTML = '<div class="genre-container">';
        genres.forEach(g => {
            const gClass = `genre-${g.toLowerCase().replace(/\s+/g, '-')}`;
            genreHTML += `<span class="genre-tag ${gClass}">${g}</span>`;
        });
        genreHTML += '</div>';

        const imageSrc = (item.img && item.img.trim() !== "") ? item.img : `https://placehold.co/400x600/161b22/58a6ff?text=${encodeURIComponent(item.title)}`;

        grid.innerHTML += `
            <div class="card">
                <img src="${imageSrc}" class="card-img" onerror="this.src='https://placehold.co/400x600/161b22/da3633?text=Image+Error';">
                <div class="card-body">
                    ${genreHTML}
                    <h3>${item.title}</h3>
                    <div class="ratings-grid">
                        <div class="rating-box">Story: ⭐ ${item.storyRating}</div>
                        <div class="rating-box">Art: ⭐ ${item.artRating}</div>
                    </div>
                    <p class="personal-review">"${item.review}"</p>
                    <p style="font-size:0.7rem; color:#8b949e; margin-top:10px">
                        ${item.type} • Ch. ${item.chapters} • <strong>${item.status}</strong>
                    </p>
                </div>
                <button class="edit-trigger" onclick="openModal(${actualIndex})">Modify Entry</button>
            </div>
        `;
    });
}

// 4. MODAL & GENRE TAGS LOGIC
function openModal(index = null) {
    editIndex = index;
    const btnDel = document.getElementById('deleteBtn');
    
    if (index !== null) {
        const item = vaultData[index];
        document.getElementById('mTitle').value = item.title;
        document.getElementById('mChapters').value = item.chapters;
        document.getElementById('mType').value = item.type;
        document.getElementById('mStatus').value = item.status;
        document.getElementById('mImg').value = item.img;
        document.getElementById('mStoryRating').value = item.storyRating;
        document.getElementById('mArtRating').value = item.artRating;
        document.getElementById('mReview').value = item.review;
        
        selectedGenres = Array.isArray(item.genre) ? [...item.genre] : 
                 (item.genre ? item.genre.split(',').map(g => g.trim()) : []);
        btnDel.style.display = "block";
    } else {
        ['mTitle', 'mChapters', 'mImg', 'mStoryRating', 'mArtRating', 'mReview'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
        selectedGenres = [];
        btnDel.style.display = "none";
    }
    renderModalTags();
    document.getElementById('entryModal').style.display = "flex";
}

function addGenreTag() {
    const select = document.getElementById('mGenreSelect');
    const genre = select.value;
    if (genre && !selectedGenres.includes(genre)) {
        selectedGenres.push(genre);
        renderModalTags();
    }
    select.value = ""; 
}

function removeGenreTag(genre) {
    selectedGenres = selectedGenres.filter(g => g !== genre);
    renderModalTags();
}

function renderModalTags() {
    const container = document.getElementById('selectedGenreTags');
    if(!container) return;
    container.innerHTML = "";
    selectedGenres.forEach(g => {
        container.innerHTML += `<span class="modal-tag" onclick="removeGenreTag('${g}')">${g}</span>`;
    });
}

function saveEntry() {
    const entry = {
        title: document.getElementById('mTitle').value,
        chapters: document.getElementById('mChapters').value,
        type: document.getElementById('mType').value,
        status: document.getElementById('mStatus').value,
        genre: [...selectedGenres], 
        img: document.getElementById('mImg').value,
        storyRating: document.getElementById('mStoryRating').value,
        artRating: document.getElementById('mArtRating').value,
        review: document.getElementById('mReview').value
    };
    
    if (editIndex !== null) vaultData[editIndex] = entry;
    else vaultData.push(entry);
    
    saveAndRefresh();
}

function deleteEntry() {
    if(confirm("Are you sure you want to delete this masterwork?")) {
        vaultData.splice(editIndex, 1);
        saveAndRefresh();
    }
}

function saveAndRefresh() {
    // 1. Simpan ke Local Storage (Auto-save Browser)
    localStorage.setItem('manhwaEliteVault', JSON.stringify(vaultData));
    
    // 2. AUTO-DOWNLOAD FAIL (Simpan terus ke laptop)
    autoBackupToFile();

    // 3. Paparkan semula item & tutup modal
    displayItems();
    closeModal();
    
    // Notifikasi kecil kat console
    console.log("Data saved to browser & downloaded as backup!");
}

function autoBackupToFile() {
    const dataStr = JSON.stringify(vaultData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    // Nama fail ada tarikh supaya kau tahu mana yang paling baru
    const date = new Date().toISOString().slice(0,10);
    link.download = `peps-list-backup-${date}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function closeModal() { 
    document.getElementById('entryModal').style.display = "none"; 
}

function changeSection(s) { 
    currentFilter = s; 
    document.getElementById('sectionTitle').innerText = (s === 'All') ? 'All Collection' : (s === 'ToRead' ? 'Plan to Read' : 'Reading List');
    
    const actionBar = document.getElementById('actionBar');
    if (s === 'ToRead') actionBar.classList.add('hidden');
    else actionBar.classList.remove('hidden');

    displayItems(); 
}

function filterData() { displayItems(); }

// BACKUP & RESTORE
function exportData() {
    const blob = new Blob([JSON.stringify(vaultData)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manhwa_vault_backup_${new Date().toLocaleDateString()}.json`;
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        vaultData = JSON.parse(event.target.result);
        saveAndRefresh();
    };
    reader.readAsText(e.target.files[0]);
}

// INITIAL CALL
displayItems();
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}
function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}