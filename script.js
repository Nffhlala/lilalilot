const GIST_ID = '587a6dc8726f891e3bce89b0f8a0d2d4';
const GIST_TOKEN = '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';

// Variable global untuk simpan genre yang dipilih
let selectedGenres = [];
// Letak kat atas sekali dalam fail JS
let currentView = 'all'; // Nilai awal: 'all' atau 'folder'

window.onload = () => {
    const savedTheme = localStorage.getItem('preferred-theme');
    if(savedTheme) setTheme(savedTheme);
    
    initStars('story-stars');
    initStars('art-stars');
    renderList(); 
    updateStats();
};
function getFinalFolders() {
    const defaultFolder = ['Uncategorized'];
    const saved = localStorage.getItem('folders');
    const folderBaru = saved ? JSON.parse(saved) : [];
    const gabung = [...new Set([...defaultFolder, ...folderBaru])]; 
    return gabung;
}
// 2. Fungsi Rating Bintang
function initStars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return; // Guard clause

    const stars = container.querySelectorAll('i');
    
    // Ambil rating sedia ada (kalau tengah edit entry)
    let currentRating = parseFloat(container.getAttribute('data-rating')) || 0;
    updateStarUI(container, currentRating);

    stars.forEach((star, index) => {
        star.addEventListener('click', (e) => {
            const rect = star.getBoundingClientRect();
            // Kira posisi mouse dalam bintang (kiri = 0.5, kanan = 1.0)
            const isHalf = (e.clientX - rect.left) < (rect.width / 2);
            let newRating = index + (isHalf ? 0.5 : 1);

            // LOGIK RESET: Kalau klik nilai yang sama, jadi 0
            if (currentRating === newRating) {
                currentRating = 0;
            } else {
                currentRating = newRating;
            }

            container.setAttribute('data-rating', currentRating);
            updateStarUI(container, currentRating);
        });

        star.addEventListener('mousemove', (e) => {
            const rect = star.getBoundingClientRect();
            const isHalf = (e.clientX - rect.left) < (rect.width / 2);
            updateStarUI(container, index + (isHalf ? 0.5 : 1));
        });
    });

    container.addEventListener('mouseleave', () => {
        updateStarUI(container, currentRating);
    });
}

function updateStarUI(container, rating) {
    const stars = container.querySelectorAll('i');
    stars.forEach((star, index) => {
        // Reset class asal
        star.className = 'far fa-star'; 
        
        if (rating >= index + 1) {
            star.className = 'fas fa-star active'; // Penuh
        } else if (rating >= index + 0.5) {
            star.className = 'fas fa-star-half-alt active'; // Separuh
        }
    });
}
let editIndex = null; // Untuk tahu kita tengah edit yang mana

function editEntry(index) {
    try {
        let list = JSON.parse(localStorage.getItem('readingList')) || [];
        let item = list[index];
        if (!item) return;

        editIndex = index;
        updateFolderDropdowns(); // Pastikan list folder terbaru muncul

        // Isi data basic
        document.getElementById('mTitle').value = item.title || '';
        document.getElementById('mChapters').value = item.chapters || '';
        document.getElementById('mType').value = item.type || 'Manhwa';
        document.getElementById('mStatus').value = item.status || 'On Going';
        document.getElementById('mLink').value = item.poster || item.link || ''; // Selaraskan poster/link
        document.getElementById('mReview').value = item.review || '';

        // --- LOGIK MULTI-SELECT FOLDER ---
        const folderSelect = document.getElementById('entryFolder');
        if (folderSelect) {
            Array.from(folderSelect.options).forEach(opt => {
                // Check kalau folderNames (Array) ada nama folder ni, atau folderName (Lama) sama
                const isSelected = (item.folderNames && item.folderNames.includes(opt.value)) || (item.folderName === opt.value);
                opt.selected = isSelected;
            });
        }

        // Set Rating guna fungsi abang (updateStarUI)
        const sContainer = document.getElementById('story-stars');
        const aContainer = document.getElementById('art-stars');
        sContainer.setAttribute('data-rating', item.storyRating || 0);
        aContainer.setAttribute('data-rating', item.artRating || 0);
        updateStarUI(sContainer, item.storyRating || 0);
        updateStarUI(aContainer, item.artRating || 0);

        // Set Genres
        const container = document.getElementById('selectedGenreTags');
        container.innerHTML = "";
        selectedGenres = [...(item.genres || [])];
        selectedGenres.forEach(g => {
            const color = genreColors[g] || genreColors['default'];
            const tag = document.createElement('span');
            tag.style.cssText = `background:${color}; color:white; padding:4px 10px; border-radius:8px; font-size:12px; display:flex; align-items:center; gap:5px; margin:2px; font-weight:bold;`;
            tag.innerHTML = `${g} <i class="fas fa-times" style="cursor:pointer" onclick="removeGenre('${g}', this)"></i>`;
            container.appendChild(tag);
        });

        // Update Button UI
        document.getElementById('btnSave').innerText = "Update Entry";
        document.getElementById('btnDelete').style.display = "block";

        openModal(); 
    } catch (err) {
        console.error("Error kat editEntry:", err);
    }
}
// 3. Simpan Data (Save Entry)
async function saveEntry() {
    try {
        const storyContainer = document.getElementById('story-stars');
        const artContainer = document.getElementById('art-stars');
        const folderDropdown = document.getElementById('entryFolder');

        // 1. Ambil folder (Multi-select)
        const selectedFolders = Array.from(folderDropdown.selectedOptions).map(option => option.value);

        const entry = {
            title: document.getElementById('mTitle').value.trim(),
            chapters: document.getElementById('mChapters').value || 0,
            folderNames: selectedFolders.length > 0 ? selectedFolders : ['Uncategorized'],
            type: document.getElementById('mType').value,
            status: document.getElementById('mStatus').value,
            storyRating: parseFloat(storyContainer.getAttribute('data-rating')) || 0,
            artRating: parseFloat(artContainer.getAttribute('data-rating')) || 0,
            genres: typeof selectedGenres !== 'undefined' ? [...selectedGenres] : [],
            review: document.getElementById('mReview').value,
            
            // --- POINT 1: PASTIKAN INI AMBIL DARI mLink ---
            poster: document.getElementById('mLink').value || '', 
            
            // --- POINT 2: TUKAR TARIKH KEPADA ISO ---
            // Ini supaya sorting dan pencarian index tak ralat
            date: new Date().toISOString() 
        };

        if (!entry.title) {
            alert("Tajuk wajib isi bang!");
            return;
        }

        // 2. Simpan ke LocalStorage
        let list = JSON.parse(localStorage.getItem('readingList')) || [];

        if (editIndex !== null) {
    const oldEntry = list[editIndex];
    entry.date = oldEntry.date || new Date().toISOString(); 
    list[editIndex] = entry;
} else {
    list.unshift(entry);
}

        localStorage.setItem('readingList', JSON.stringify(list));

        // 3. Kemas kini UI
        resetModal();
        closeModal();

        if (typeof renderList === "function") renderList();
        if (typeof updateStats === "function") updateStats();

        // 4. Auto-Backup
        console.log("Memulakan Auto-Backup...");
        if (typeof backupDataAuto === "function") {
            await backupDataAuto(); 
        }
        console.log("Proses selesai!");

    } catch (e) {
        console.error("Ada error masa save:", e);
    }
}
function deleteCurrentEntry() {
    if (editIndex !== null && confirm("Betul ke nak padam entry ni?")) {
        deleteEntry(editIndex); // Guna function delete sedia ada kau
        closeModal();
    }
    const manhwaData = {
    title: document.getElementById('mTitle').value,
    // ... data lain
    folderName: document.getElementById('entryFolder').value // PASTIKAN GUNA 'folderName'
};
}
// Fungsi backup senyap (tak keluar alert supaya tak kacau user)
async function backupDataAuto() {
    const list = localStorage.getItem('readingList') || "[]";
    try {
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${GIST_TOKEN}` },
            body: JSON.stringify({
                files: { "pepsicola_data.json": { content: list } }
            })
        });
        console.log("Auto-Backup Berjaya!");
    } catch (e) {
        console.error("Auto-Backup Gagal:", e);
    }
}

// 4. Reset & Modal Control
// Function untuk buka modal
function openModal(isEdit = false, index = null) {
    // 1. Update dropdown supaya folder terbaru sentiasa ada
    updateFolderDropdowns(); 

    const modal = document.getElementById('entryModal');
    const folderSelect = document.getElementById('entryFolder');
    
    if (!modal) return;
    modal.style.display = 'flex';

    if (isEdit && index !== null) {
        // Ambil data terbaru dari localStorage
        const list = JSON.parse(localStorage.getItem('readingList')) || [];
        const item = list[index];
        
        if (item && folderSelect) {
            // Reset semua pilihan dulu
            Array.from(folderSelect.options).forEach(opt => opt.selected = false);
            
            // Logik Multi-Select (Hybrid: sokong data lama & baru)
            if (Array.isArray(item.folderNames)) {
                // Format Baru (Array)
                item.folderNames.forEach(fName => {
                    const option = Array.from(folderSelect.options).find(opt => opt.value === fName);
                    if (option) option.selected = true;
                });
            } else if (item.folderName) {
                // Format Lama (String tunggal)
                const option = Array.from(folderSelect.options).find(opt => opt.value === item.folderName);
                if (option) option.selected = true;
            }
        }
    } else {
        // Jika mode TAMBAH BARU: Kosongkan semua pilihan
        if (folderSelect) {
            Array.from(folderSelect.options).forEach(opt => opt.selected = false);
            // Optional: Set 'Uncategorized' sebagai default kalau nak
        }
    }
}
// Function untuk tutup modal
function closeModal() { 
    document.getElementById('entryModal').style.display = 'none'; 
    editIndex = null;
    document.getElementById('mTitle').value = '';
}

function resetModal() {
    editIndex = null;
    const formIds = ['mTitle', 'mChapters', 'mLink', 'mReview'];
    formIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // --- BAHAGIAN YANG DIBETULKAN (XIAO EDIT KAT SINI) ---
    // Kita tak guna setRating dah, kita guna logic baru
    const storyContainer = document.getElementById('story-stars');
    const artContainer = document.getElementById('art-stars');

    if (storyContainer && artContainer) {
        storyContainer.setAttribute('data-rating', 0);
        artContainer.setAttribute('data-rating', 0);
        
        // Panggil fungsi lukis bintang yang baru kita buat tadi
        updateStarUI(storyContainer, 0);
        updateStarUI(artContainer, 0);
    }
    // ---------------------------------------------------

    selectedGenres = [];
    const container = document.getElementById('selectedGenreTags');
    if (container) container.innerHTML = '';

    const saveBtn = document.querySelector('.btn-save') || document.querySelector('button[onclick="saveEntry()"]');
    if (saveBtn) saveBtn.innerText = "Save Entry";

    const delBtn = document.getElementById('btnDelete');
    if (delBtn) delBtn.style.display = "none";
}
function openEditModal(index) {
    editIndex = index;
    const list = JSON.parse(localStorage.getItem('readingList')) || [];
    const entry = list[index];

    // Isi data teks biasa
    document.getElementById('mTitle').value = entry.title || '';
    // ... isi input lain ...

    // --- LOGIK BINTANG UNTUK EDIT ---
    const sContainer = document.getElementById('story-stars');
    const aContainer = document.getElementById('art-stars');

    // Ambil nilai dari database, default 0 kalau takde
    const sRating = parseFloat(entry.storyRating) || 0;
    const aRating = parseFloat(entry.artRating) || 0;

    // Set data-rating supaya logic click/hover tahu nilai asal
    sContainer.setAttribute('data-rating', sRating);
    aContainer.setAttribute('data-rating', aRating);

    // Lukis bintang ikut nilai (contoh: 8.5)
    updateStarUI(sContainer, sRating);
    updateStarUI(aContainer, aRating);
    
    // Jangan lupa panggil semula initStars supaya event listener mouse/click aktif balik
    initStars('story-stars');
    initStars('art-stars');

    openModal(); // Buka modal
}
// Fungsi Buka Review Modal
function openReviewModal(index) {
    const list = JSON.parse(localStorage.getItem('readingList')) || [];
    const entry = list[index];

    if (entry) {
        document.getElementById('reviewModalTitle').innerText = entry.title;
        // Kalau takde review, letak text default
        document.getElementById('reviewModalText').innerText = entry.review ? entry.review : "No review written yet.";
        
        document.getElementById('reviewModal').style.display = 'flex';
    }
}

// Fungsi Tutup Review Modal
function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

// Tutup modal kalau klik kat luar kotak (Overlay)
window.onclick = function(event) {
    const rModal = document.getElementById('reviewModal');
    const eModal = document.getElementById('entryModal');
    if (event.target == rModal) {
        rModal.style.display = "none";
    }
    if (event.target == eModal) {
        eModal.style.display = "none";
    }
}
const genreColors = {
    // 1. Romance (Pink)
    'Romance': '#ff79c6', 'Romance Fantasy': '#ff79c6', 'Historical Romance': '#ff79c6', 
    'Modern Romance': '#ff79c6', 'Office Romance': '#ff79c6', 'School Romance': '#ff79c6',
    'Contract Marriage': '#ff79c6', 'Fake Dating': '#ff79c6', 'Slow Burn': '#ff79c6',
    'Angst Romance': '#ff79c6', 'Healing Romance': '#ff79c6', 'Second Chance Romance': '#ff79c6',

    // 2. Fantasy (Purple)
    'Fantasy': '#bd93f9', 'Dark Fantasy': '#bd93f9', 'Urban Fantasy': '#bd93f9', 
    'Magic Academy': '#bd93f9', 'Sword & Sorcery': '#bd93f9', 'Mythology': '#bd93f9',
    'Gods & Demons': '#bd93f9', 'Spirit World': '#bd93f9',

    // 3. Isekai & Reincarnation (Indigo)
    'Isekai': '#6272a4', 'Reincarnation': '#6272a4', 'Regression': '#6272a4', 
    'Transmigration': '#6272a4', 'Villainess': '#6272a4', 'Otome Isekai': '#6272a4',
    'Game System World': '#6272a4', 'Parallel World': '#6272a4',

    // 4. Action & Murim (Red)
    'Action': '#ff5555', 'Martial Arts': '#ff5555', 'Millitary': '#ff5555', 
    'Cultivation': '#ff5555', 'Superpower': '#ff5555', 'Superhero': '#ff5555',
    'Dungeon / Gate': '#ff5555', 'Hunter': '#ff5555', 'Leveling System': '#ff5555',
    'Overpowered MC': '#ff5555', 'Military': '#ff5555',

    // 5. Psychological & Horror (Dark Grey/Black)
    'Psychological': '#282a36', 'Thriller': '#282a36', 'Horror': '#282a36', 
    'Survival': '#282a36', 'Gore': '#282a36', 'Mind Games': '#282a36',
    'Yandere': '#282a36', 'Obsession': '#282a36', 'Revenge': '#282a36', 'Tragedy': '#282a36',

    // 6. Slice of Life & Healing (Soft Green)
    'Slice of Life': '#50fa7b', 'School Life': '#50fa7b', 'Coming of Age': '#50fa7b',
    'Friendship': '#50fa7b', 'Daily Life': '#50fa7b', 'Healing': '#50fa7b',
    'Family': '#50fa7b', 'Workplace Life': '#50fa7b',

    // 7. Mystery & Crime (Orange)
    'Mystery': '#ffb86c', 'Detective': '#ffb86c', 'Crime': '#ffb86c',
    'Mafia': '#ffb86c', 'Underworld': '#ffb86c', 'Legal Drama': '#ffb86c', 'Political Drama': '#ffb86c',

    // 8. Drama & Melodrama (Brown/Tan)
    'Drama': '#a65e2e', 'Melodrama': '#a65e2e', 'Cheating': '#a65e2e',
    'Love Triangle': '#a65e2e', 'Toxic Relationship': '#a65e2e', 
    'Emotional Trauma': '#a65e2e', 'Breakup / Divorce': '#a65e2e',

    // 9. Comedy (Yellow)
    'Comedy': '#f1fa8c', 'Rom-Com': '#f1fa8c', 'Parody': '#f1fa8c',
    'Crack Humor': '#f1fa8c', 'Absurd Comedy': '#f1fa8c', '4-Koma Style': '#f1fa8c',

    // 10. BL / GL / LGBTQ (Hot Pink)
    'BL': '#ff92df', 'GL': '#ff92df', 'LGBTQ+': '#ff92df', 
    'Gender Bender': '#ff92df', 'Crossdressing': '#ff92df',

    // 11. Supernatural (Cyan)
    'Supernatural': '#8be9fd', 'Ghost': '#8be9fd', 'Vampire': '#8be9fd', 'Werewolf': '#8be9fd',

    // 12. Sci-Fi & Future (Deep Blue)
    'Sci-Fi': '#44475a', 'Cyberpunk': '#44475a', 'AI / Future Tech': '#44475a',
    'Post-Apocalyptic': '#44475a', 'Time Travel': '#44475a',

    // 13. SMUT (Crimson Red)
    'Smut': '#990000',

    'default': '#6272a4'
};
function getGenreClass(genre) {
    // Ini akan tukar "Romance Fantasy" jadi "genre-romance-fantasy"
    return 'genre-' + genre.toLowerCase()
        .replace(/ & /g, '-')
        .replace(/ \/ /g, '-')
        .replace(/\s+/g, '-');
}
// 5. Render Cards ke Skrin
function renderList(dataToDisplay = null) {
    let allItems = JSON.parse(localStorage.getItem('readingList')) || [];
    let list = dataToDisplay ? [...dataToDisplay] : [...allItems];
    
    // 1. Sorting Logic
    const sortSelect = document.getElementById('sortSelect');
    const sortVal = sortSelect ? sortSelect.value : 'latest';
    if (sortVal === 'az') {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
} else if (sortVal === 'za') {
    list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
} else if (sortVal === 'latest') {
    // Susun ikut tarikh paling baru
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
} else if (sortVal === 'masterpiece') {
    // MASTERPIECE: Rating Tinggi (10) duduk atas sekali
    list.sort((a, b) => {
        const totalB = Number(b.storyRating || 0) + Number(b.artRating || 0);
        const totalA = Number(a.storyRating || 0) + Number(a.artRating || 0);
        return totalB - totalA;
    });
} else if (sortVal === 'meh') {
    // MEH: Rating Rendah (0) duduk atas sekali
    list.sort((a, b) => {
        const totalB = Number(b.storyRating || 0) + Number(b.artRating || 0);
        const totalA = Number(a.storyRating || 0) + Number(a.artRating || 0);
        return totalA - totalB; // Terbalikkan (A to B) untuk naikkan yang rendah
    });
}
    const container = document.getElementById('entry-list');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 50px; color: var(--text);">Tiada rekod dijumpai.</p>`;
        return;
    }

    container.innerHTML = list.map((item) => {
        // Cari index asal dengan lebih "longgar" (guna tajuk pun cukup kalau tarikh lari)
        const originalIndex = allItems.findIndex(orig => 
            orig.title === item.title && (orig.date === item.date || orig.poster === item.poster)
        );

        const imageSrc = item.poster || item.link || 'https://via.placeholder.com/150x200?text=No+Cover';
        const reviewText = item.review || "No review yet.";

        // Kita guna originalIndex masa hantar ke function edit/delete sahaja
        const finalIndex = originalIndex !== -1 ? originalIndex : allItems.indexOf(item);

        return `
        <div class="card">
            <img src="${imageSrc}" 
     loading="lazy"
     style="width: 100%; height: 360px; object-fit: cover; display: block;"
     onerror="this.onerror=null; this.src='https://via.placeholder.com/360x500?text=Format+Error';">
            <div style="padding: 15px;">
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                    ${(item.genres || []).map(g => {
                        const cleanG = g.toLowerCase().replace(/\s+/g, '-');
                        return `<span class="genre-tag genre-${cleanG}">${g}</span>`;
                    }).join('')}
                </div>

                <h4 class="card-title-text">${item.title}</h4>

                <div class="rating-container">
                    <div class="rating-box">
                        Story: <span class="star-icon">⭐</span> ${item.storyRating || 0}
                    </div>
                    <div class="rating-box">
                        Art: <span class="star-icon">⭐</span> ${item.artRating || 0}
                    </div>
                </div>

                <div style="margin-bottom: 15px; background: rgba(0,0,0,0.02); padding: 8px; border-radius: 6px;">
                    <p id="review-text-${originalIndex}" 
                       class="review-text" 
                       style="
                            margin-bottom: 4px;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                            font-size: 14px;
                            font-style: italic;
                            opacity: 0.8;
                            line-height: 1.4;
                       ">
                        "${reviewText}"
                    </p>
                    
                    ${reviewText !== "No review yet." && reviewText.length > 50 ? `
                        <span id="btn-read-${originalIndex}"
                              onclick="toggleReviewText(${originalIndex})" 
                              style="font-size: 11px; font-weight: bold; color: var(--pink-accent); cursor: pointer; text-decoration: underline; display: block; margin-top: 5px;">
                            Read More
                        </span>
                    ` : ''}
                </div>

                <div style="font-size: 10px; color: #999; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${item.type || 'Manhwa'} • Ch. ${item.chapters || '0'} • 
                    <span style="color: ${typeof getStatusColor === 'function' ? getStatusColor(item.status) : '#666'}">${item.status || 'Plan to Read'}</span>
                </div>
                
                <div style="display: flex; gap: 5px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 12px;">
                    <button onclick="editEntry(${originalIndex})" style="background: var(--sidebar-bg); color: var(--text); border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; cursor: pointer; font-size: 11px; padding: 8px; flex: 1; font-weight: bold;">
                        MODIFY ENTRY
                    </button>
                    <button onclick="deleteEntry(${originalIndex})" style="background: #fff5f5; color: #ff4d4d; border: 1px solid #ffe3e3; border-radius: 6px; cursor: pointer; font-size: 11px; padding: 8px; width: 40px; font-weight: bold;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}
function getStatusColor(status) {
    const colors = {
        'Dropped': '#ff4d4d',
        'Completed': '#2ecc71',
        'On Going': '#3498db',
        'Hiatus': '#f39c12',
        'Plan to Read': '#95a5a6'
    };
    return colors[status] || '#888';
}
function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = function() {
                // KITA COMPRESS KAT SINI
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Kecilkan lebar ke 400px (dah cukup tajam untuk kad)
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Tukar jadi kualiti rendah sikit (0.7) supaya jimat ruang
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                // Simpan kod gambar ni masuk dalam kotak link
                document.getElementById('mLink').value = compressedDataUrl;
                
                alert("Gambar berjaya di-upload & di-compress!");
            };
        };
        reader.readAsDataURL(file);
    }
}
let cropper = null;

function prepareCrop(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('crop-area').style.display = 'block';
            
            // Kalau dah ada cropper lama, buang dulu
            if (cropper) {
                cropper.destroy();
            }

            // Setup Croppie
            cropper = new Croppie(document.getElementById('cropper-container'), {
                viewport: { width: 200, height: 300, type: 'square' }, // Saiz kad manhwa
                boundary: { width: 300, height: 400 },
                showZoomer: true,
                enableOrientation: true
            });

            cropper.bind({
                url: e.target.result
            });
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function applyCrop() {
    cropper.result({
        type: 'base64',
        size: { width: 500, height: 750 }, // Resolusi akhir
        format: 'jpeg',
        quality: 0.8
    }).then(function(base64) {
        // Masukkan hasil crop ke mLink
        document.getElementById('mLink').value = base64;
        // Sembunyikan kawasan crop
        document.getElementById('crop-area').style.display = 'none';
        alert("Gambar berjaya di-crop!");
    });
}
// 6. Stats & Filter
function updateStats() {
    let list = JSON.parse(localStorage.getItem('readingList')) || [];
    document.getElementById('totalReading').innerText = list.length;
    let planCount = list.filter(item => item.status === "Plan to Read").length;
    document.getElementById('planToReadCount').innerText = planCount;
}

function filterList() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let list = JSON.parse(localStorage.getItem('readingList')) || [];
    let filtered = list.filter(item => 
        item.title.toLowerCase().includes(input) || 
        (item.genres && item.genres.some(g => g.toLowerCase().includes(input)))
    );
    renderList(filtered);
}
function surpriseMe() {
    // 1. Ambil semua data dari storage
    const allItems = JSON.parse(localStorage.getItem('readingList')) || [];

    // 2. Tapis hanya yang statusnya 'Plan to Read'
    const planToReadList = allItems.filter(item => item.status === 'Plan to Read');

    // 3. Check kalau takde langsung manhwa dalam Plan to Read
    if (planToReadList.length === 0) {
        alert("Bang, takde manhwa dalam senarai 'Plan to Read' lah. Tambah dulu!");
        return;
    }

    // 4. Pilih secara rawak (Random) dari list yang dah ditapis tadi
    const randomIndex = Math.floor(Math.random() * planToReadList.length);
    const randomManhwa = planToReadList[randomIndex];

    // 5. Tunjukkan hasil surprise tu (sorok folder & tunjuk card tu je)
    const wrapper = document.getElementById('folder-container-wrapper');
    if (wrapper) wrapper.style.display = 'none';

    const entryList = document.getElementById('entry-list');
    if (entryList) entryList.style.display = 'grid';

    const titleEl = document.getElementById('mainTitle');
    if (titleEl) {
        titleEl.innerHTML = `
            <span onclick="location.reload()" style="cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </span>
            Surprise: ${randomManhwa.title}
        `;
    }

    // 6. Lukis card manhwa yang terpilih tu sorang-sorang
    renderList([randomManhwa]);
}
// 7. Genre Tags Logic
function addGenreTag() {
    // Gunakan ID 'editGenres' sebab itu yang ada dalam HTML kau
    const select = document.getElementById('editGenres'); 
    const genre = select.value;
    const container = document.getElementById('selectedGenreTags');

    if (genre && !selectedGenres.includes(genre)) {
        selectedGenres.push(genre);
        
        // Ambil warna dari list (Pastikan 'Smut' ada dalam genreColors kau)
        const color = genreColors[genre] || genreColors['default'] || '#4ade80';

        const tag = document.createElement('span');
        tag.className = 'genre-tag-item'; 
        
        // Gaya tag biar nampak pro macam Screenshot 56
        tag.style.cssText = `
            background: ${color}; 
            color: white; 
            padding: 6px 12px; 
            border-radius: 8px; 
            font-size: 12px; 
            display: inline-flex; 
            align-items: center; 
            gap: 8px; 
            margin: 3px; 
            font-weight: bold;
        `;
        
        tag.innerHTML = `
            ${genre} 
            <i class="fas fa-times" style="cursor:pointer" onclick="removeGenre('${genre}', this)"></i>
        `;
        
        container.appendChild(tag);
    }
    // Reset dropdown ke "-- Choose Genre --"
    select.value = "";
}

function removeGenre(genre, element) {
    selectedGenres = selectedGenres.filter(g => g !== genre);
    element.parentElement.remove();
}

function deleteEntry(index) {
    if(confirm("Betul ke nak buang ni?")) {
        let list = JSON.parse(localStorage.getItem('readingList'));
        list.splice(index, 1);
        localStorage.setItem('readingList', JSON.stringify(list));
        renderList();
        updateStats();
    }
}
function showToRead() {
    const allItems = JSON.parse(localStorage.getItem('readingList')) || [];
    
    // 1. Tapis: Pastikan 'Plan to Read' ejaannya sama macam dalam dropdown modal
    const toReadList = allItems.filter(item => item.status === 'Plan to Read');
    
    // 2. Sorok grid folder
    const wrapper = document.getElementById('folder-container-wrapper');
    if (wrapper) wrapper.style.display = 'none';
    
    // 3. Update tajuk biar sama dengan logic sorting tadi
    const titleEl = document.getElementById('mainTitle');
    if (titleEl) titleEl.innerText = "Plan to Read";

    // 4. KOSONGKAN LIST LAMA (Penting!)
    const container = document.getElementById('entry-list');
    if (container) container.innerHTML = '';

    // 5. Lukis hanya yang dah ditapis
    renderList(toReadList);
}
function showReadingList() {
    document.querySelector('.main-content h1').innerText = "Reading List";
    renderFolders(); // Dia akan nampak view = Reading List, so dia lukis folder
    renderList();
}

function showAllCollection() {
    document.querySelector('.main-content h1').innerText = "All Collection";
    renderFolders(); // Dia akan nampak view = All Collection, so dia sorok folder
    renderList();
}

function setTheme(themeName) {
    // Pastikan kita dapat nama bersih (cth: 'pink') dan nama penuh (cth: 'theme-pink')
    const cleanThemeName = themeName.replace('theme-', '');
    const fullThemeName = 'theme-' + cleanThemeName;

    // Set kedua-duanya supaya CSS selector [data-theme] dan .theme-xxxx kedua-duanya jalan
    document.body.setAttribute('data-theme', cleanThemeName);
    document.body.className = fullThemeName;
    
    // Simpan ke localStorage
    localStorage.setItem('preferred-theme', fullThemeName);
    
    // Logik untuk mengekalkan view semasa
    const titleEl = document.getElementById('mainTitle');
    const currentTitle = titleEl ? titleEl.innerText : "";
    
    if (currentTitle.includes("Folder:")) {
        const folderName = currentTitle.replace("Folder: ", "").trim();
        if (typeof filterByFolder === 'function') filterByFolder(folderName);
    } 
    else if (currentTitle === "All Collection") {
        if (typeof renderList === 'function') renderList();
    } 
    else {
        if (typeof renderFolders === 'function') renderFolders();
    }
}
function filterByStatus(status) {
    const allItems = JSON.parse(localStorage.getItem('readingList')) || [];
    const folderWrapper = document.getElementById('folder-container-wrapper');
    const controlsWrapper = document.getElementById('all-collection-wrapper');
    const titleEl = document.getElementById('mainTitle');
    const container = document.getElementById('entry-list');

    // 1. Update Tajuk Utama
    if (titleEl) {
        titleEl.innerText = (status === 'all') ? 'All Collection' : status;
    }

    // 2. Logik Switching (Tukar View)
    if (status === 'Reading List') {
        // Paparan Folder (Grid Petak-Petak)
        if (folderWrapper) folderWrapper.style.display = 'block';
        if (controlsWrapper) controlsWrapper.style.display = 'none';
        
        renderFolders(); // Lukis balik folder
        if (container) container.innerHTML = ''; // Kosongkan list manhwa kat bawah
    } 
    else {
        // Paparan Senarai Manhwa (Card View)
        if (folderWrapper) folderWrapper.style.display = 'none';
        if (controlsWrapper) {
            controlsWrapper.style.display = 'block';
            // Tunjukkan balik search/filter yang mungkin disorok masa masuk folder
            const children = controlsWrapper.querySelectorAll('.search-container, .filter-row, .stats-row');
            children.forEach(el => el.style.display = ''); 
        }

        // Tapis data ikut status
        let filteredData = (status === 'all') 
            ? allItems 
            : allItems.filter(item => item.status === status);

        renderList(filteredData);
    }

    // 3. Highlight menu yang diklik (Sidebar)
    updateActiveNavLink(status);
}
// 1. BACKUP DATA (Upload ke Gist)
async function backupData() {
    const list = localStorage.getItem('PepsiCola') || "[]";
    const btn = event.target;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Backing up...';

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${GIST_TOKEN}` },
            body: JSON.stringify({
                files: {
                    "pepsicola_data.json": { content: list }
                }
            })
        });

        if (response.ok) {
            alert("Backup Berjaya! Data kau dah selamat kat awan.");
        } else {
            throw new Error('Gagal backup');
        }
    } catch (error) {
        console.error(error);
        alert("Backup Gagal! Check Gist ID/Token kau.");
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Backup Data';
    }
}

// 2. RESTORE DATA (Download dari Gist)
async function restoreData() {
    if (!confirm("Data sekarang akan diganti dengan data dari Cloud. Teruskan?")) return;
    
    const btn = event.target;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GIST_TOKEN}` }
        });
        const data = await response.json();
        const content = data.files["pepsicola_data.json"].content;

        localStorage.setItem('PepsiCola', content);
        renderList();
        updateStats();
        alert("Restore Berjaya!");
    } catch (error) {
        console.error(error);
        alert("Restore Gagal! Fail tidak dijumpai.");
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Restore Data';
    }
}

// 3. SYNC CLOUD (Gabungkan data local & cloud)
async function syncCloud() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GIST_TOKEN}` }
        });

        if (!response.ok) throw new Error("Gagal hubungi GitHub. Check Token/ID.");

        const gistData = await response.json();
        
        // Ambil data Cloud (pastikan fail ada, kalau tak letak [])
        let cloudList = [];
        if (gistData.files["pepsicola_data.json"] && gistData.files["pepsicola_data.json"].content) {
            cloudList = JSON.parse(gistData.files["pepsicola_data.json"].content);
        }
        
        // Ambil data Local
        const localList = JSON.parse(localStorage.getItem('PepsiCola') || "[]");

        // GABUNG DATA DENGAN SELAMAT
        const combined = [...localList, ...cloudList];
        
        // Filter unique berdasarkan Title & Type
        const uniqueList = combined.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.title === item.title && t.type === item.type
            ))
        ).map(item => ({
            ...item,
            // FIX: Pastikan genres sentiasa ada (kalau undefined, jadi array kosong)
            genres: Array.isArray(item.genres) ? item.genres : [] 
        }));

        // Simpan balik
        const dataToString = JSON.stringify(uniqueList);
        localStorage.setItem('PepsiCola', dataToString);

        const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `token ${GIST_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    "pepsicola_data.json": { content: dataToString }
                }
            })
        });

        if (!updateResponse.ok) throw new Error("Gagal hantar data ke Cloud.");

        renderList();
        updateStats();
        alert("Sync Selesai! Nice one PepsiCola.");

    } catch (error) {
        console.error("Sync Error Details:", error);
        alert(`Sync Gagal: ${error.message}`);
    } finally {
        btn.innerHTML = originalText;
    }
}
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    // Toggle class 'active' untuk slide in/out
    sidebar.classList.toggle('active');
    
    // Kalau nak tukar icon arrow tu pun boleh
    const icon = document.querySelector('.toggle-btn i');
    if (sidebar.classList.contains('active')) {
        icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
    } else {
        icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
    }
}
const STORAGE_KEY = 'pepsiFolders';

// 1. Ambil data atau guna default
let folders = JSON.parse(localStorage.getItem(STORAGE_KEY)) || ['Uncategorized', 'Manhwa Shounen', 'Daily Updates'];
function toggleReviewText(index) {
    const p = document.getElementById(`review-text-${index}`);
    const btn = document.getElementById(`btn-read-${index}`);
    
    if (!p || !btn) return; // Guard clause supaya tak error kalau element tak jumpa

    // Kita guna getComputedStyle untuk baca nilai sebenar dari CSS
    const isClamped = window.getComputedStyle(p).webkitLineClamp !== "none";

    if (isClamped) {
        // KEMBANGKAN
        p.style.display = "block";
        p.style.webkitLineClamp = "none";
        p.style.overflow = "visible";
        btn.innerText = "Show Less";
    } else {
        // KUNCUPKAN
        p.style.display = "-webkit-box";
        p.style.webkitLineClamp = "2";
        p.style.overflow = "hidden";
        btn.innerText = "Read More";
    }
}
function renderFolders() {
    const grid = document.getElementById('folder-grid');
    const wrapper = document.getElementById('folder-container-wrapper');
    const mainGrid = document.getElementById('entry-list');

    if (!grid || !wrapper) return;

    // 1. Ambil senarai folder
    const senaraiFolder = getFinalFolders(); 

    // 2. Bersihkan grid manhwa
    if (mainGrid) mainGrid.innerHTML = ''; 

    // 3. Lukis folder
    grid.innerHTML = ''; 
    senaraiFolder.forEach(name => {
        // Kita gabungkan icon font-awesome abang dengan butang delete
        grid.innerHTML += `
            <div class="folder-item" onclick="filterByFolder('${name}')" 
                 style="cursor: pointer; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.1); position: relative;">
                
                <button onclick="event.stopPropagation(); deleteFolder('${name}')" 
                        style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: #ff5555; cursor: pointer; font-size: 16px; padding: 5px;">
                    <i class="fas fa-times-circle"></i>
                </button>

                <i class="fas fa-folder" style="font-size: 30px; color: #ffb86c; margin-bottom: 5px;"></i>
                <div style="font-weight: bold; font-size: 13px;">${name}</div>
                <small style="opacity: 0.6;">${countItemsInFolder(name)} items</small>
            </div>
        `;
    });
}
function getFolders() {
    // Ambil folder default/lama abang kat sini
    const folderLama = ['Uncategorized', 'Action List', 'Romance List']; 
    
    // Ambil folder baru dari localStorage
    const folderBaru = JSON.parse(localStorage.getItem('folders')) || [];
    
    // Gabungkan dan buang yang duplicate
    return [...new Set([...folderLama, ...folderBaru])];
}
function updateFolderDropdowns() {
    const folderSelect = document.getElementById('entryFolder'); 
    if (!folderSelect) return;

    const senaraiFolder = getFinalFolders(); 
    folderSelect.innerHTML = ''; 
    
    // Ambil folder asal kalau tengah edit
    let currentFolder = 'Uncategorized';
    if (editIndex !== null) {
        const list = JSON.parse(localStorage.getItem('readingList')) || [];
        currentFolder = list[editIndex]?.folderName || 'Uncategorized';
    }

    senaraiFolder.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        
        // AUTO-SELECT: Penting supaya bila buka modal, dia dah tahu folder mana
        if (folder === currentFolder) {
            option.selected = true;
        }
        
        folderSelect.appendChild(option);
    });

    if (senaraiFolder.length > 5) {
        folderSelect.setAttribute('size', '5'); 
        folderSelect.style.height = "auto";
        folderSelect.style.overflowY = "auto";
    } else {
        folderSelect.removeAttribute('size');
        folderSelect.style.height = "40px";
    }

    // Guna 'change' lebih selamat dari 'onclick' untuk elemen select
    folderSelect.onchange = function() {
        console.log("Folder sah dipilih:", this.value);
    };
}

function countItemsInFolder(name) {
    const list = JSON.parse(localStorage.getItem('readingList')) || [];
    return list.filter(item => {
        if (Array.isArray(item.folderNames)) {
            return item.folderNames.includes(name);
        }
        return item.folderName === name;
    }).length;
}
// 4. Function tambah folder baru
// 1. Fungsi bila tekan butang "+ New Folder"
function createNewFolder() {
    const folderName = prompt("Nama Folder Baru:"); // Macam dalam Screenshot 81
    if (!folderName) return;

    let storageFolders = JSON.parse(localStorage.getItem('folders')) || [];
    
    if (storageFolders.includes(folderName)) {
        alert("Folder dah ada bang!");
        return;
    }

    storageFolders.push(folderName);
    localStorage.setItem('folders', JSON.stringify(storageFolders));

    // PENTING: Update paparan serta-merta
    renderFolders(); 
    updateFolderDropdowns(); 
}

// 2. Fungsi untuk tutup modal folder
function closeFolderModal() {
    document.getElementById('folderModal').style.display = 'none';
}

// 3. Fungsi bila tekan butang "Create Folder"
function confirmCreateFolder() {
    const input = document.getElementById('newFolderName');
    const name = input.value.trim();
    
    if (!name) return;

    // Ambil yang dah ada dalam storage saja untuk ditambah
    let storageFolders = JSON.parse(localStorage.getItem('folders')) || [];
    
    if (storageFolders.includes(name)) {
        alert("Folder ni dah ada dalam senarai baru!");
        return;
    }

    // Simpan folder baru
    storageFolders.push(name);
    localStorage.setItem('folders', JSON.stringify(storageFolders));

    // --- BAHAGIAN PALING PENTING ---
    updateFolderDropdowns(); // Update dropdown serta-merta
    if (typeof renderFolders === 'function') renderFolders(); // Update grid Reading List
    
    closeFolderModal();
    input.value = ''; // Kosongkan input
}

// Tambahan: Tutup modal kalau user klik luar kotak
window.onclick = function(event) {
    const folderModal = document.getElementById('folderModal');
    const entryModal = document.getElementById('entryModal');
    if (event.target == folderModal) closeFolderModal();
    if (event.target == entryModal) closeModal();
}

// 5. Jalankan masa mula-mula load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Jalankan function permulaan
    if (typeof renderFolders === 'function') renderFolders();
    if (typeof updateFolderDropdowns === 'function') updateFolderDropdowns();

    // 2. Pasang pemerhati pada dropdown Sort
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const titleEl = document.getElementById('mainTitle');
            // Guna toLowerCase() supaya filter ni "cerdik" sikit
            const currentTitle = titleEl ? titleEl.innerText.toLowerCase().trim() : "";

            console.log("Sistem mengesan halaman:", currentTitle);

            if (currentTitle === "plan to read") {
                showToRead(); 
            } else if (currentTitle.includes("folder:")) {
                const folderName = titleEl.innerText.split("Folder:")[1].trim();
                filterByFolder(folderName);
            } else {
                renderList(); // Ini untuk "All Collection"
            }
        });
    }
});
function filterByFolder(folderName) {
    const folderWrap = document.getElementById('folder-container-wrapper');
    const allWrap = document.getElementById('all-collection-wrapper');
    const titleEl = document.getElementById('mainTitle');

    if (folderWrap) folderWrap.style.display = 'none';
    if (allWrap) {
        allWrap.style.display = 'block';
        // Sembunyikan search/stats supaya fokus pada isi folder
        const toHide = allWrap.querySelectorAll('.search-container, .filter-row, .stats-row');
        toHide.forEach(el => el.style.display = 'none');
    }

    if (titleEl) titleEl.innerText = `Folder: ${folderName}`;

    const list = JSON.parse(localStorage.getItem('readingList')) || [];
    
    const filtered = list.filter(item => {
        if (Array.isArray(item.folderNames)) {
            return item.folderNames.includes(folderName);
        }
        return item.folderName === folderName;
    });

    // Pastikan poster sentiasa ada sebelum render
    const cleanedData = filtered.map(item => ({
        ...item,
        poster: item.poster || item.link || ''
    }));

    renderList(cleanedData);
}
window.onload = () => {
    // 1. Muat turun tema
    const savedTheme = localStorage.getItem('preferred-theme');
    if(savedTheme) setTheme(savedTheme);
    
    // 2. Init rating
    initStars('story-stars');
    initStars('art-stars');
    
    // 3. Update dropdown dalam modal
    updateFolderDropdowns(); 
    
    // 4. LUKIS FOLDER KAT SIDEBAR (Tambahkan ni!)
    renderFolders(); 
    
    // 5. Paparkan semua manhwa secara default
    renderList(); 
    
    // 6. Kemaskini statistik
    updateStats();
};
function switchView(viewName) {
    const title = document.getElementById('mainTitle');
    const folderWrap = document.getElementById('folder-container-wrapper');
    const allWrap = document.getElementById('all-collection-wrapper');

    if (title) title.innerText = viewName;

    if (viewName === "Reading List") {
        // 1. Tunjukkan Folder Grid
        if (folderWrap) folderWrap.style.display = 'block';
        if (allWrap) allWrap.style.display = 'none';
        
        renderFolders(); 
    } 
    else if (viewName === "All Collection") {
        if (folderWrap) folderWrap.style.display = 'none';
        if (allWrap) {
            allWrap.style.display = 'block';
            const children = allWrap.querySelectorAll('.search-container, .filter-row, .stats-row');
            children.forEach(el => el.style.display = ''); 
        }
        
        renderList(); 
    }
}
function updateActiveNavLink(status) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        // Check kalau teks dalam link sama dengan status yang dipilih
        if (link.innerText.trim().includes(status) || (status === 'all' && link.innerText.includes('All'))) {
            link.classList.add('active');
        }
    });
}
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('preferred-theme') || 'theme-dark';
    
    const cleanThemeName = savedTheme.replace('theme-', '');
    setTheme(cleanThemeName);
});
function deleteFolder(targetFolder) {
    if (targetFolder === 'Uncategorized') {
        alert("Folder ni kebal bang!");
        return;
    }

    if (!confirm(`Padam folder "${targetFolder}"? Manhwa di dalam akan dipindahkan ke Uncategorized.`)) return;

    // 1. Padam dari senarai folder
    let storageFolders = JSON.parse(localStorage.getItem('folders')) || [];
    storageFolders = storageFolders.filter(f => f !== targetFolder);
    localStorage.setItem('folders', JSON.stringify(storageFolders));

    // 2. Kemaskini Manhwa yang duduk dalam folder ni
    let list = JSON.parse(localStorage.getItem('readingList')) || [];
    const updatedList = list.map(item => {
        if (Array.isArray(item.folderNames)) {
            item.folderNames = item.folderNames.filter(f => f !== targetFolder);
            if (item.folderNames.length === 0) item.folderNames = ['Uncategorized'];
        } else if (item.folderName === targetFolder) {
            item.folderName = 'Uncategorized';
        }
        return item;
    });

    localStorage.setItem('readingList', JSON.stringify(updatedList));

    // 3. Refresh UI tanpa reload
    renderFolders();
    updateFolderDropdowns();
    alert("Folder dipadam!");
}