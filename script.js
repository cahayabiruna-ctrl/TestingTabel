// --- SCRIPT BARU DITAMBAHKAN DI ATAS ---
// Registrasi plugin datalabels untuk Chart.js
// Periksa apakah ChartDataLabels sudah terdaftar sebelum mendaftarkannya lagi
if (typeof ChartDataLabels !== 'undefined' && Chart.registry.plugins.get('datalabels') === undefined) {
    Chart.register(ChartDataLabels);
    console.log("ChartDataLabels registered."); // Debug
} else if (typeof ChartDataLabels === 'undefined'){
    console.warn("ChartDataLabels library not found. Labels on chart might not appear.");
}
// --- AKHIR SCRIPT BARU ---


// --- GLOBAL VARIABLES & INITIALIZATION ---
let diagram = null;
let growthChart = null; // Variable to hold the chart instance
let memberListSortColumn = 'joinDate'; // Default sort
let memberListSortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed."); // Debug

    // --- Security: Disable context menu, copy, paste, cut ---
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('copy', event => event.preventDefault());
    document.addEventListener('paste', event => event.preventDefault());
    document.addEventListener('cut', event => event.preventDefault());

    const path = window.location.pathname;
    console.log("Current path:", path); // Debug

    // --- PROTEKSI LOGIN (PENTING) ---
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    console.log("Is logged in?", isLoggedIn); // Debug
    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        console.log("Access denied. Not logged in. Redirecting to index.html..."); // Debug
        window.location.href = 'index.html'; // Redirect
        return; // Hentikan script jika redirect
    }
    // --- AKHIR PROTEKSI ---


    // Inisialisasi halaman berdasarkan path
    if (path.includes('index.html') || path.endsWith('/')) {
        // Halaman Login
        console.log("On Login Page. Setting up login button listener."); // Debug
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', login);
            console.log("Login button listener added."); // Debug
        } else {
            console.error("FATAL: Login button ('loginButton') element not found in index.html!");
            alert("Kesalahan Kritis: Tombol login tidak ditemukan. Periksa ID elemen di index.html.");
        }
    } else if (isLoggedIn) {
         // Hanya inisialisasi halaman lain JIKA sudah login
        ensureFullScreen(); // Panggil fullscreen di sini jika sudah login

        if (path.includes('dashboard.html')) {
            console.log("On Dashboard Page and logged in. Initializing dashboard..."); // Debug
            initializeDashboard();
        } else if (path.includes('network.html')) {
            console.log("On Network Page and logged in. Initializing network page..."); // Debug
            initializeNetworkPage();
        }
    } else {
        // Kasus aneh: Tidak di index.html tapi belum login (seharusnya sudah diredirect)
        console.warn("Unexpected state: Not on index.html and not logged in.");
    }
});

// --- INITIALIZERS ---
function initializeDashboard() {
    console.log("Running initializeDashboard..."); // Debug
    // Tambahkan pemeriksaan elemen penting lainnya
    if (!document.getElementById('totalMembers') || !document.getElementById('growthChart') || !document.getElementById('logoutButton')) {
        console.error("Dashboard elements missing! Initialization aborted.");
        return;
    }
    updateCount();
    renderGrowthChart();

    // Event listeners dengan pemeriksaan null
    document.getElementById('addMemberButton')?.addEventListener('click', addMember);
    document.getElementById('searchButton')?.addEventListener('click', searchMembers);
    document.getElementById('resetButton')?.addEventListener('click', resetSearch);

    // === Listener untuk Upload (Sudah diperbaiki di jawaban sebelumnya) ===
    const uploadButton = document.getElementById('uploadButton');
    const csvFileInput = document.getElementById('csvFile');

    if (uploadButton && csvFileInput) {
        console.log("Upload button and file input found. Adding listeners."); // Debug
        uploadButton.addEventListener('click', () => {
            console.log("Upload button clicked, triggering file input click."); // Debug
            csvFileInput.value = null; // Reset input file sebelum diklik
            csvFileInput.click(); // Memicu klik pada input file
        });
        csvFileInput.addEventListener('change', uploadCSV); // Menangani file setelah dipilih
    } else {
        console.error("Upload button or CSV file input not found!"); // Debug Error
    }
    // === Akhir Listener Upload ===

    document.getElementById('viewNetworkButton')?.addEventListener('click', () => { window.location.href = 'network.html'; });
    document.getElementById('viewMemberListButton')?.addEventListener('click', showMemberList);
    document.getElementById('backToDashboardButton')?.addEventListener('click', showMainDashboard);
    setupTableSorting(); // Fungsi ini punya querySelectorAll, lebih aman
    document.getElementById('downloadButton')?.addEventListener('click', downloadCSV);
    document.getElementById('saveEditButton')?.addEventListener('click', saveEditedMember);
    document.getElementById('cancelEditButton')?.addEventListener('click', closeEditModal);
    document.getElementById('logoutButton')?.addEventListener('click', logout); // Logout button listener
    console.log("Dashboard initialized."); // Debug
}

function initializeNetworkPage() {
    console.log("Running initializeNetworkPage..."); // Debug
    renderNetwork();
    document.getElementById('backButton')?.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    document.getElementById('downloadNetworkButton')?.addEventListener('click', downloadNetworkImage);
    console.log("Network Page initialized."); // Debug
}


// --- NOTIFICATION & MODAL ---
function showNotification(message, duration = 3000) {
    let notification = document.getElementById('notification');
    if (!notification) {
        console.warn("Notification element not found.");
        return;
    }
    notification.textContent = message;
    notification.classList.add('show');
    // Clear any previous timeout
    if (notification.timer) clearTimeout(notification.timer);
    notification.timer = setTimeout(() => {
        notification.classList.remove('show');
        notification.timer = null;
    }, duration);
}
function openEditModal(uid) {
    const member = loadMembers().find(m => m.uid === uid);
    const modal = document.getElementById('editModal');
    if (!member || !modal) return;
    // Pre-fill form fields, ensure elements exist
    const originalUidEl = document.getElementById('originalUid');
    const editNameEl = document.getElementById('editName');
    const editUidEl = document.getElementById('editUid');
    const editUplineEl = document.getElementById('editUpline');
    const editJoinDateEl = document.getElementById('editJoinDate');

    if(originalUidEl) originalUidEl.value = member.uid;
    if(editNameEl) editNameEl.value = member.name || '';
    if(editUidEl) editUidEl.value = member.uid || '';
    if(editUplineEl) editUplineEl.value = member.upline || '';
    if(editJoinDateEl) editJoinDateEl.value = member.joinDate ? member.joinDate.split('T')[0] : '';

    modal.style.display = 'flex';
}
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if(modal) modal.style.display = 'none';
 }
function openConfirmModal(uid) {
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmDeleteButton');
    const cancelBtn = document.getElementById('cancelDeleteButton');
    if(!modal || !confirmBtn || !cancelBtn) return;

    modal.style.display = 'flex';
    // Clone buttons to remove old listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener('click', () => {
        deleteMember(uid);
        modal.style.display = 'none';
    }, { once: true });
    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    }, { once: true });
}

// --- AUTH, NAVIGATION & FULLSCREEN ---
function requestFullScreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen().catch(err => console.warn("Fullscreen request failed:", err));
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
 }
function exitFullScreen() {
    if (document.fullscreenElement) { // Check if actually in fullscreen
        if (document.exitFullscreen) document.exitFullscreen().catch(err => console.warn("Exit fullscreen failed:", err));
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
 }
function ensureFullScreen() { if (!document.fullscreenElement) { requestFullScreen(); } }
function login() {
    console.log("Login function called."); // Debug
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    const errorEl = document.getElementById('error');
    if (!userEl || !passEl) { console.error("Login Error: Username or password input not found!"); return; }
    if (!errorEl) { console.warn("Login Warning: Error display element not found."); }
    const user = userEl.value;
    const pass = passEl.value;
    console.log(`Attempting login with user: [${user}] pass: [${pass}]`); // Debug
    if (user === 'admin' && pass === 'dvteam123') {
        console.log("Login credentials MATCH!"); // Debug
        try {
            sessionStorage.setItem('isLoggedIn', 'true');
            console.log("Session storage 'isLoggedIn' set to true."); // Debug
            console.log("Redirecting to dashboard.html..."); // Debug
            window.location.href = 'dashboard.html';
        } catch (e) {
            console.error("Error during login success:", e); // Debug error
            if(errorEl) errorEl.innerText = 'Terjadi kesalahan saat login.';
        }
    } else {
        console.log("Login credentials DO NOT MATCH."); // Debug
        if (errorEl) { errorEl.innerText = 'Login gagal! Username atau password salah.'; }
    }
}
function logout() {
    console.log("Logout function called."); // Debug
    sessionStorage.removeItem('isLoggedIn');
    exitFullScreen(); // Try to exit fullscreen
    window.location.href = 'index.html'; // Redirect to login
 }

// --- DATA MANAGEMENT (CRUD) ---
function loadMembers() {
    try {
        return JSON.parse(localStorage.getItem('members') || '[]');
    } catch (e) {
        console.error("Error loading members from localStorage:", e);
        return []; // Return empty array on error
    }
}
function saveMembers(members) {
    try {
        localStorage.setItem('members', JSON.stringify(members));
    } catch (e) {
        console.error("Error saving members to localStorage:", e);
        showNotification("Gagal menyimpan data!", 4000);
    }
}
function addMember() {
    const nameEl = document.getElementById('name');
    const uidEl = document.getElementById('uid');
    const uplineEl = document.getElementById('upline');
    const joinDateEl = document.getElementById('joinDateInput');
    if (!nameEl || !uidEl || !uplineEl || !joinDateEl) return showNotification("Error: Input fields not found.");

    const name = nameEl.value.trim();
    const uid = uidEl.value.trim();
    const upline = uplineEl.value.trim();
    const joinDateValue = joinDateEl.value;

    if (!name || !uid) return showNotification("Nama dan UID wajib diisi!");

    const members = loadMembers();
    if (members.some(m => m.uid === uid)) return showNotification("UID sudah terdaftar!");

    // Basic date validation before creating ISO string
    let joinDateISO = new Date().toISOString(); // Default to now
    if (joinDateValue) {
        try {
            const parsedDate = new Date(joinDateValue);
            if (!isNaN(parsedDate.getTime())) { // Check if date is valid
                joinDateISO = parsedDate.toISOString();
            } else {
                 console.warn(`Invalid date input: ${joinDateValue}. Using current date.`);
                 showNotification("Format tanggal bergabung tidak valid, menggunakan tanggal hari ini.", 4000);
            }
        } catch(e) {
             console.error("Error parsing date:", e);
             showNotification("Error format tanggal, menggunakan tanggal hari ini.", 4000);
        }
    }


    members.push({ name, uid, upline: upline || null, joinDate: joinDateISO });
    saveMembers(members);
    showNotification("Anggota berhasil ditambahkan!");

    // Clear inputs
    nameEl.value = ''; uidEl.value = ''; uplineEl.value = ''; joinDateEl.value = '';

    updateCount();
    searchMembers(); // Update search results if currently shown
    renderGrowthChart();
}
function saveEditedMember() {
     const originalUidEl = document.getElementById('originalUid');
     const editNameEl = document.getElementById('editName');
     const editUidEl = document.getElementById('editUid');
     const editUplineEl = document.getElementById('editUpline');
     const editJoinDateEl = document.getElementById('editJoinDate');
     if (!originalUidEl || !editNameEl || !editUidEl || !editUplineEl || !editJoinDateEl) return showNotification("Error: Edit modal fields not found.");

    const originalUid = originalUidEl.value;
    const newName = editNameEl.value.trim();
    const newUid = editUidEl.value.trim();
    const newUpline = editUplineEl.value.trim();
    const newJoinDateValue = editJoinDateEl.value;

    if (!newName || !newUid) return showNotification("Nama dan UID tidak boleh kosong!");

    let members = loadMembers();
    if (newUid !== originalUid && members.some(m => m.uid === newUid)) {
        return showNotification("UID baru sudah digunakan oleh anggota lain!");
    }

    const memberIndex = members.findIndex(m => m.uid === originalUid);
    if (memberIndex === -1) return showNotification("Anggota tidak ditemukan!");

    // Date validation
    let newJoinDateISO = members[memberIndex].joinDate; // Keep original if new date is invalid
    if (newJoinDateValue) {
         try {
            const parsedDate = new Date(newJoinDateValue);
            if (!isNaN(parsedDate.getTime())) {
                newJoinDateISO = parsedDate.toISOString();
            } else {
                 console.warn(`Invalid date input during edit: ${newJoinDateValue}. Keeping original date.`);
                 showNotification("Format tanggal baru tidak valid, tanggal tidak diubah.", 4000);
            }
        } catch(e) {
             console.error("Error parsing date during edit:", e);
             showNotification("Error format tanggal baru, tanggal tidak diubah.", 4000);
        }
    }


    // Update member data
    members[memberIndex] = {
        name: newName,
        uid: newUid,
        upline: newUpline || null,
        joinDate: newJoinDateISO
    };

    // Update upline references if UID changed
    if (originalUid !== newUid) {
        members = members.map(m => {
            if (m.upline === originalUid) {
                return { ...m, upline: newUid };
            }
            return m;
        });
    }

    saveMembers(members);
    closeEditModal();
    showNotification("Data anggota berhasil diperbarui.");
    searchMembers(); // Update search results
    renderGrowthChart();
    if (document.getElementById('memberListContainer').style.display === 'block') {
         renderMemberList(); // Update full list if it's visible
    }
}
function deleteMember(uid) {
    let members = loadMembers();
    // Decide on downline handling: make orphans or reassign? Making orphans:
    // members = members.map(m => (m.upline === uid ? { ...m, upline: null } : m)); // Optional

    const updatedMembers = members.filter(m => m.uid !== uid);
    if (members.length === updatedMembers.length) {
        console.warn(`Member with UID ${uid} not found for deletion.`);
        return; // Member not found
    }
    saveMembers(updatedMembers);
    showNotification("Anggota telah dihapus.");
    updateCount();
    searchMembers(); // Update search results
    renderGrowthChart();
     if (document.getElementById('memberListContainer').style.display === 'block') {
         renderMemberList(); // Update full list if it's visible
    }
}
function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = loadMembers().length; }

// --- CSV FUNCTIONS ---
function downloadCSV() { /* ... (Kode tidak berubah) ... */ }
function uploadCSV() {
    console.log("uploadCSV function triggered."); // Debug
    const fileInput = document.getElementById('csvFile');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        console.log("No file selected or file input not found."); // Debug
        return; // Tidak ada file dipilih
    }
    const file = fileInput.files[0];
    console.log("File selected:", file.name, file.type, file.size); // Debug

    const reader = new FileReader();

    reader.onload = function(event) {
        console.log("File read successfully."); // Debug
        let newMembers = []; // Define newMembers here
        try {
            const text = event.target.result;
            // Handle potential BOM (Byte Order Mark) at the start of the file
            const cleanedText = text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
            const allRows = cleanedText.split(/\r?\n/);
            console.log(`CSV has ${allRows.length} rows (including header).`); // Debug

            // Robust CSV parsing function
            const parseCsvRow = row => { /* ... (fungsi parsing CSV tidak diubah) ... */
                const columns = []; let currentColumn = ''; let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i]; const nextChar = row[i + 1];
                    if (char === '"' && !inQuotes && currentColumn === '') { inQuotes = true; }
                    else if (char === '"' && inQuotes && nextChar === '"') { currentColumn += '"'; i++; }
                    else if (char === '"' && inQuotes && (nextChar === ',' || nextChar === undefined)) { inQuotes = false; }
                    else if (char === ',' && !inQuotes) { columns.push(currentColumn.trim()); currentColumn = ''; }
                    else { currentColumn += char; }
                }
                columns.push(currentColumn.trim()); return columns;
             };


            if (allRows.length < 2 || allRows[0].trim() === '') throw new Error("File CSV kosong atau hanya berisi header.");

            const header = allRows[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
            console.log("CSV Header:", header); // Debug
            if (!header.includes('nama') || !header.includes('uid')) {
                 throw new Error("Format CSV salah: Kolom 'nama' atau 'uid' tidak ditemukan.");
            }

            const nameIndex = header.indexOf('nama');
            const uidIndex = header.indexOf('uid');
            const uplineIndex = header.indexOf('upline');
            const dateIndex = header.indexOf('tanggalbergabung');
            console.log(`Column indices - Nama: ${nameIndex}, UID: ${uidIndex}, Upline: ${uplineIndex}, Tgl: ${dateIndex}`); // Debug

            // Get existing UIDs to prevent duplicates during merge/overwrite decision
            // const existingUIDs = loadMembers().map(m => m.uid); // Uncomment if merging

            allRows.slice(1).filter(row => row.trim() !== '').forEach((row, rowIndex) => {
               try {
                   const columns = parseCsvRow(row);
                   const name = columns[nameIndex] ? columns[nameIndex].trim() : '';
                   const uid = columns[uidIndex] ? columns[uidIndex].trim() : '';
                   // Ensure upline is null if empty string, otherwise keep the value
                   const upline = (uplineIndex > -1 && columns[uplineIndex] && columns[uplineIndex].trim() !== '') ? columns[uplineIndex].trim() : null;


                   let joinDateISO = new Date().toISOString(); // Default to now
                   if (dateIndex > -1 && columns[dateIndex]) {
                       const dateStr = columns[dateIndex].trim();
                       if (dateStr) { // Only parse if date string is not empty
                           let parsedDate = new Date(dateStr); // Try ISO / YYYY-MM-DD
                           if (isNaN(parsedDate.getTime())) {
                               // Try DD/MM/YYYY or DD-MM-YYYY
                               const partsDMY = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                               if (partsDMY) { parsedDate = new Date(partsDMY[3], partsDMY[2] - 1, partsDMY[1]); }
                               // Add more format checks if necessary (e.g., MM/DD/YYYY)
                           }
                           if (!isNaN(parsedDate.getTime())) {
                               joinDateISO = parsedDate.toISOString();
                           } else { console.warn(`Format tanggal tidak valid di baris ${rowIndex + 2}: ${dateStr}. Menggunakan tanggal hari ini.`); }
                       }
                   }

                   if (name && uid) {
                       // Check for duplicates within the file being uploaded
                       if (newMembers.some(m => m.uid === uid)) {
                           console.warn(`UID duplikat ditemukan di file CSV: ${uid}. Baris ${rowIndex + 2} dilewati.`);
                       }
                       // Optional: Check against existing data if merging
                       // else if (existingUIDs.includes(uid)) {
                       //    console.warn(`UID ${uid} sudah ada di data. Baris ${rowIndex + 2} dilewati.`);
                       // }
                       else {
                           newMembers.push({ name, uid, upline: upline, joinDate: joinDateISO });
                       }
                   } else { console.warn(`Nama atau UID kosong di baris ${rowIndex + 2}. Baris dilewati.`); }
               } catch (rowError) { console.error(`Gagal memproses baris ${rowIndex + 2}: ${rowError.message}\nBaris: ${row}`); }
             });

            console.log(`Parsed ${newMembers.length} valid members from CSV.`); // Debug
            if (newMembers.length > 0) {
                 console.log("Saving new members to localStorage (overwriting existing)..."); // Debug
                 saveMembers(newMembers); // Current behavior: Overwrite
                 console.log("Updating counts and charts..."); // Debug
                 updateCount();
                 renderGrowthChart();
                 searchMembers(); // Refresh search results too
                 showNotification(`Impor berhasil! ${newMembers.length} anggota dimuat.`);
                 console.log("Import process finished."); // Debug
            } else {
                 showNotification("Tidak ada data anggota valid yang ditemukan di file CSV.");
                 console.log("No valid members found to import."); // Debug
            }
         } catch (e) {
             console.error("Gagal memproses file CSV:", e); // Debug Error
             showNotification(`Gagal memproses file: ${e.message}`);
         }
         finally {
             if (fileInput) fileInput.value = ''; // Reset file input
             console.log("File input reset."); // Debug
         }
     };
     reader.onerror = (e) => {
         console.error("FileReader error occurred:", e); // Debug Error
         showNotification("Gagal membaca file.");
          if (fileInput) fileInput.value = ''; // Reset file input
     };

     console.log("Reading file as text..."); // Debug
     reader.readAsText(file);
 }


// --- SEARCH FUNCTIONS ---
// ... (searchMembers, getDownlineCount, displaySearchResults, resetSearch tidak diubah) ...
function searchMembers() { /* ... */ }
function getDownlineCount(allMembersList, parentUid) { /* ... */ }
function displaySearchResults(results, allMembers) { /* ... */ }
function resetSearch() { /* ... */ }

// --- FUNGSI DAFTAR ANGGOTA ---
// ... (showMainDashboard, showMemberList, setupTableSorting, renderMemberList tidak diubah) ...
function showMainDashboard() { /* ... */ }
function showMemberList() { /* ... */ }
function setupTableSorting() { /* ... */ }
function renderMemberList() { /* ... */ }

// --- FUNGSI CHART ---
// ... (renderGrowthChart tidak diubah) ...
function renderGrowthChart() { /* ... */ }

// --- NETWORK VISUALIZATION ---
// ... (renderNetwork tidak diubah) ...
function renderNetwork() { /* ... */ }
// ... (downloadNetworkImage tidak diubah) ...
function downloadNetworkImage() { /* ... */ }

// --- (PASTIKAN SEMUA FUNGSI LAMA SUDAH TERSALIN DI SINI) ---
// (Salin semua fungsi yang tidak diubah dari jawaban sebelumnya ke sini)
// Contoh fungsi yang mungkin belum tersalin jika Anda hanya menyalin bagian:
// showNotification, openEditModal, closeEditModal, openConfirmModal,
// requestFullScreen, exitFullScreen, ensureFullScreen,
// loadMembers, saveMembers, addMember, saveEditedMember, deleteMember, updateCount,
// downloadCSV, uploadCSV (versi lengkap),
// searchMembers, getDownlineCount, displaySearchResults, resetSearch,
// showMainDashboard, showMemberList, setupTableSorting, renderMemberList,
// renderGrowthChart, renderNetwork, downloadNetworkImage
