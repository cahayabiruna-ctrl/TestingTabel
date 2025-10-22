// --- SCRIPT BARU DITAMBAHKAN DI ATAS ---
// Registrasi plugin datalabels untuk Chart.js
// Periksa apakah ChartDataLabels sudah terdaftar sebelum mendaftarkannya lagi
if (typeof ChartDataLabels !== 'undefined' && Chart.registry.plugins.get('datalabels') === undefined) {
    Chart.register(ChartDataLabels);
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
    // --- Security: Disable context menu, copy, paste, cut ---
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('copy', event => event.preventDefault());
    document.addEventListener('paste', event => event.preventDefault());
    document.addEventListener('cut', event => event.preventDefault());

    const path = window.location.pathname;

    // --- PROTEKSI LOGIN (PENTING) ---
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        console.log("Not logged in, redirecting to index.html"); // Debug
        window.location.href = 'index.html';
        return; // Hentikan script jika redirect
    }
    // --- AKHIR PROTEKSI ---


    if (path.includes('dashboard.html') || path.includes('network.html')) {
        if (isLoggedIn) {
            ensureFullScreen();
        }
        // Inisialisasi halaman hanya jika sudah login dan di halaman yang benar
        if (path.includes('dashboard.html')) {
            initializeDashboard();
        } else if (path.includes('network.html')) {
            initializeNetworkPage();
        }
    } else if (path.includes('index.html') || path.endsWith('/')) {
        // Setup halaman login
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            console.log("Login button found, adding listener."); // Debug
            loginButton.addEventListener('click', login);
        } else {
            // Ini akan muncul jika ID tombol salah di index.html
            console.error("CRITICAL: Login button with id 'loginButton' not found in index.html!");
            alert("Error: Tombol login tidak ditemukan!");
        }
    }
});

// --- INITIALIZERS ---
function initializeDashboard() {
    console.log("Initializing Dashboard..."); // Debug
    // Pastikan semua elemen dashboard ada sebelum menambahkan listener
    if (!document.getElementById('addMemberButton')) {
        console.error("Dashboard elements not fully loaded yet?");
        // Anda bisa menambahkan sedikit delay atau memastikan script dijalankan setelah semua siap
        // setTimeout(initializeDashboard, 100); // Contoh retry (hati-hati infinite loop)
        return;
    }
    updateCount();
    renderGrowthChart();
    document.getElementById('addMemberButton').addEventListener('click', addMember);
    document.getElementById('searchButton').addEventListener('click', searchMembers);
    document.getElementById('resetButton').addEventListener('click', resetSearch);
    document.getElementById('uploadButton').addEventListener('click', () => document.getElementById('csvFile').click());
    document.getElementById('csvFile').addEventListener('change', uploadCSV);
    document.getElementById('viewNetworkButton').addEventListener('click', () => { window.location.href = 'network.html'; });
    document.getElementById('viewMemberListButton').addEventListener('click', showMemberList);
    document.getElementById('backToDashboardButton').addEventListener('click', showMainDashboard);
    setupTableSorting();
    document.getElementById('downloadButton').addEventListener('click', downloadCSV);
    document.getElementById('saveEditButton').addEventListener('click', saveEditedMember);
    document.getElementById('cancelEditButton').addEventListener('click', closeEditModal);
    document.getElementById('logoutButton').addEventListener('click', logout);
}

function initializeNetworkPage() {
    console.log("Initializing Network Page..."); // Debug
    renderNetwork();
    // Pastikan elemen ada sebelum menambahkan listener
    const backButton = document.getElementById('backButton');
    const downloadBtn = document.getElementById('downloadNetworkButton');
    if (backButton) backButton.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    if (downloadBtn) downloadBtn.addEventListener('click', downloadNetworkImage);
}


// --- NOTIFICATION & MODAL ---
function showNotification(message, duration = 3000) { /* ... */
    let notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), duration);
 }
function openEditModal(uid) { /* ... */
    const member = loadMembers().find(m => m.uid === uid);
    if (!member) return;
    document.getElementById('originalUid').value = member.uid;
    document.getElementById('editName').value = member.name;
    document.getElementById('editUid').value = member.uid;
    document.getElementById('editUpline').value = member.upline || '';
    document.getElementById('editJoinDate').value = member.joinDate ? member.joinDate.split('T')[0] : '';
    document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }
function openConfirmModal(uid) { /* ... */
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmDeleteButton');
    const cancelBtn = document.getElementById('cancelDeleteButton');
    modal.style.display = 'flex';
    // Penting: Hapus listener lama sebelum menambah baru untuk mencegah multiple delete
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        deleteMember(uid);
        modal.style.display = 'none';
    }, { once: true }); // Opsi { once: true } juga membantu

    // Listener batal juga sebaiknya pakai clone atau remove/add
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    }, { once: true });
}

// --- AUTH, NAVIGATION & FULLSCREEN ---
function requestFullScreen() { /* ... */
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen().catch(err => console.error("Fullscreen request failed:", err));
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
 }
function exitFullScreen() { /* ... */
    if (document.exitFullscreen) document.exitFullscreen().catch(err => console.error("Exit fullscreen failed:", err));
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
 }
function ensureFullScreen() { if (!document.fullscreenElement) { requestFullScreen(); } }

// === FUNGSI LOGIN (Dengan Alert Debug) ===
function login() {
    // alert("Tombol Login Ditekan!"); // AKTIFKAN JIKA PERLU TES TOMBOL

    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    const errorEl = document.getElementById('error');

    if (!userEl || !passEl) {
        console.error("Username or password input field not found!");
        if (errorEl) errorEl.innerText = 'Kesalahan internal: Input tidak ditemukan.';
        return;
    }

    const user = userEl.value;
    const pass = passEl.value;

    console.log(`Attempting login with user: ${user}`); // Debug

    if (user === 'admin' && pass === 'dvteam123') {
        console.log("Login successful!"); // Debug
        sessionStorage.setItem('isLoggedIn', 'true');
        // Coba redirect langsung, kadang fullscreen bikin masalah timing
        window.location.href = 'dashboard.html';
        // Request fullscreen setelah redirect (opsional, bisa dilakukan di dashboard init)
        // ensureFullScreen(); // Pindahkan ini ke initializeDashboard jika perlu
    } else {
        console.log("Login failed."); // Debug
        if (errorEl) {
            errorEl.innerText = 'Login gagal! Periksa username & password.';
        } else {
            console.error("Error element not found to display login failure.");
        }
    }
}
// === AKHIR FUNGSI LOGIN ===

function logout() { /* ... */
    sessionStorage.removeItem('isLoggedIn');
    exitFullScreen();
    window.location.href = 'index.html';
 }

// --- DATA MANAGEMENT (CRUD) ---
// ... (loadMembers, saveMembers, addMember, saveEditedMember, deleteMember, updateCount tidak diubah) ...
function loadMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(members) { localStorage.setItem('members', JSON.stringify(members));}
function addMember() { /* ... */
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    const joinDateValue = document.getElementById('joinDateInput').value;
    if (!name || !uid) return showNotification("Nama dan UID wajib diisi!");
    const members = loadMembers();
    if (members.some(m => m.uid === uid)) return showNotification("UID sudah terdaftar!");
    const joinDate = joinDateValue ? new Date(joinDateValue).toISOString() : new Date().toISOString();
    members.push({ name, uid, upline: upline || null, joinDate });
    saveMembers(members);
    showNotification("Anggota berhasil ditambahkan!");
    ['name', 'uid', 'upline', 'joinDateInput'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    updateCount();
    searchMembers();
    renderGrowthChart();
}
function saveEditedMember() { /* ... */
    const originalUid = document.getElementById('originalUid').value;
    const newName = document.getElementById('editName').value.trim();
    const newUid = document.getElementById('editUid').value.trim();
    const newUpline = document.getElementById('editUpline').value.trim();
    const newJoinDate = document.getElementById('editJoinDate').value;
    if (!newName || !newUid) return showNotification("Nama dan UID tidak boleh kosong!");
    let members = loadMembers();
    if (newUid !== originalUid && members.some(m => m.uid === newUid)) {
        return showNotification("UID baru sudah digunakan oleh anggota lain!");
    }
    const memberIndex = members.findIndex(m => m.uid === originalUid);
    if (memberIndex === -1) return showNotification("Anggota tidak ditemukan!");
    members[memberIndex] = {
        name: newName, uid: newUid, upline: newUpline || null,
        joinDate: newJoinDate ? new Date(newJoinDate).toISOString() : members[memberIndex].joinDate
    };
    if (originalUid !== newUid) {
        members.forEach(m => { if (m.upline === originalUid) m.upline = newUid; });
    }
    saveMembers(members);
    closeEditModal();
    showNotification("Data anggota berhasil diperbarui.");
    searchMembers();
    renderGrowthChart();
}
function deleteMember(uid) { /* ... */
    let members = loadMembers();
    // Reassign upline logic might be needed here depending on requirements
    const updatedMembers = members.filter(m => m.uid !== uid);
    saveMembers(updatedMembers);
    showNotification("Anggota telah dihapus.");
    updateCount();
    searchMembers();
    renderGrowthChart();
}
function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = loadMembers().length; }

// --- CSV FUNCTIONS ---
// ... (downloadCSV, uploadCSV tidak diubah) ...
function downloadCSV() { /* ... */
    const members = loadMembers();
    if (members.length === 0) return showNotification("Belum ada data!");
    let csv = "Nama,UID,Upline,TanggalBergabung\n";
    members.forEach(m => {
        const name = `"${(m.name || '').replace(/"/g, '""')}"`; // Handle potential null names
        const joinDate = m.joinDate ? m.joinDate.split('T')[0] : '';
        csv += `${name},${m.uid || ''},${m.upline || ''},${joinDate}\n`; // Handle potential null uid/upline
    });
    try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_anggota_dvteam.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Download dimulai.');
    } catch (e) { console.error("CSV Download failed:", e); showNotification('Download gagal.'); }
 }
 function uploadCSV() { /* ... */
     const fileInput = document.getElementById('csvFile');
     if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
     const file = fileInput.files[0];

     const reader = new FileReader();
     reader.onload = function(event) {
         let newMembers = [];
         try {
             const text = event.target.result;
             const allRows = text.split(/\r?\n/);
             const parseCsvRow = row => { /* ... (CSV parsing logic) ... */
                const columns = [];
                let currentColumn = '';
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];
                    if (char === '"' && !inQuotes && currentColumn === '') { inQuotes = true; }
                    else if (char === '"' && inQuotes && nextChar === '"') { currentColumn += '"'; i++; }
                    else if (char === '"' && inQuotes && (nextChar === ',' || nextChar === undefined)) { inQuotes = false; }
                    else if (char === ',' && !inQuotes) { columns.push(currentColumn.trim()); currentColumn = ''; }
                    else { currentColumn += char; }
                }
                columns.push(currentColumn.trim());
                return columns;
             };

             if (allRows.length < 2) throw new Error("File CSV kosong atau hanya berisi header.");
             const header = allRows[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
             if (!header.includes('nama') || !header.includes('uid')) throw new Error("Format CSV salah: Kolom 'nama' atau 'uid' tidak ditemukan.");

             const nameIndex = header.indexOf('nama');
             const uidIndex = header.indexOf('uid');
             const uplineIndex = header.indexOf('upline');
             const dateIndex = header.indexOf('tanggalbergabung');

             allRows.slice(1).filter(row => row.trim() !== '').forEach((row, rowIndex) => {
               try {
                   const columns = parseCsvRow(row);
                   const name = columns[nameIndex] ? columns[nameIndex].trim() : '';
                   const uid = columns[uidIndex] ? columns[uidIndex].trim() : '';
                   const upline = uplineIndex > -1 && columns[uplineIndex] && columns[uplineIndex].trim() !== '' ? columns[uplineIndex].trim() : null; // Ensure empty upline is null

                   let joinDate = new Date().toISOString();
                   if (dateIndex > -1 && columns[dateIndex]) {
                       const dateStr = columns[dateIndex].trim();
                       let parsedDate = new Date(dateStr); // Try ISO/common US format first
                       if (isNaN(parsedDate.getTime())) {
                            // Try DD/MM/YYYY
                           const parts = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                           if (parts) { parsedDate = new Date(parts[3], parts[2] - 1, parts[1]); }
                           // Add more specific format checks if needed
                       }
                       if (!isNaN(parsedDate.getTime())) { joinDate = parsedDate.toISOString(); }
                       else { console.warn(`Format tanggal tidak valid di baris ${rowIndex + 2}: ${dateStr}. Menggunakan tanggal hari ini.`); }
                   }

                   if (name && uid) {
                       if (newMembers.some(m => m.uid === uid)) { console.warn(`UID duplikat ditemukan di file CSV: ${uid}. Baris ${rowIndex + 2} dilewati.`); }
                       else { newMembers.push({ name, uid, upline: upline, joinDate }); } // Use potentially null upline
                   } else { console.warn(`Nama atau UID kosong di baris ${rowIndex + 2}. Baris dilewati.`); }
               } catch (rowError) { console.error(`Gagal memproses baris ${rowIndex + 2}: ${rowError.message}`); }
             });

             if (newMembers.length > 0) {
                 saveMembers(newMembers); updateCount(); renderGrowthChart();
                 showNotification(`Impor berhasil! ${newMembers.length} anggota dimuat.`);
             } else { showNotification("Tidak ada data anggota valid yang ditemukan di file CSV."); }
         } catch (e) { console.error("Gagal memproses file CSV:", e); showNotification(`Gagal memproses file: ${e.message}`); }
         finally { if (fileInput) fileInput.value = ''; }
     };
     reader.onerror = () => { showNotification("Gagal membaca file."); if (fileInput) fileInput.value = ''; };
     reader.readAsText(file);
 }

// --- SEARCH FUNCTIONS ---
// ... (searchMembers, getDownlineCount, displaySearchResults, resetSearch tidak diubah) ...
function searchMembers() { /* ... */
    const searchTerm = document.getElementById('searchTerm').value.toLowerCase();
    const allMembers = loadMembers();
    const results = allMembers.filter(member => {
        const matchesSearchTerm = searchTerm === '' || (member.name && member.name.toLowerCase().includes(searchTerm)) || (member.uid && member.uid.toLowerCase().includes(searchTerm)); // Add checks for null
        return matchesSearchTerm;
    });
    displaySearchResults(results.reverse(), allMembers);
}
function getDownlineCount(allMembersList, parentUid) { /* ... */
    const directChildren = allMembersList.filter(m => m.upline === parentUid);
    let count = directChildren.length;
    for (const child of directChildren) {
        count += getDownlineCount(allMembersList, child.uid);
    }
    return count;
 }
 function displaySearchResults(results, allMembers) { /* ... */
    const container = document.getElementById('searchResultsContainer');
     if (!container) return; // Add check
    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--warna-teks-sekunder); margin-top: 20px;">Tidak ada anggota ditemukan.</p>';
        return;
    }
    let html = `<h4 style="margin-top: 20px; color: var(--warna-teks-sekunder); font-weight: 500;">Hasil (${results.length})</h4>`;
    results.forEach(member => {
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/A';
        const uplineMember = member.upline ? allMembers.find(m => m.uid === member.upline) : null; // Find only if upline exists
        const uplineName = uplineMember ? uplineMember.name : '-';
        const uplineUid = member.upline || '-';
        const downlineCount = getDownlineCount(allMembers, member.uid);
        html += `
            <div class="result-card">
                <div class="result-info">
                    <span class="info-label">Nama:</span>
                    <span class="info-value">${member.name || ''}</span>
                </div>
                <div class="result-info">
                    <span class="info-label">No. UID:</span>
                    <span class="info-value">${member.uid || ''}</span>
                </div>
                <div class="result-info">
                    <span class="info-label">Nama Refferal:</span>
                    <span class="info-value">${uplineName}</span>
                </div>
                <div class="result-info">
                    <span class="info-label">No. UID Refferal:</span>
                    <span class="info-value">${uplineUid}</span>
                </div>
                <div class="result-info">
                    <span class="info-label">Tgl Bergabung:</span>
                    <span class="info-value">${joinDate}</span>
                </div>
                <div class="result-info">
                    <span class="info-label">Jml Anggota:</span>
                    <span class="info-value">${downlineCount}</span>
                </div>
                <div class="result-actions">
                    <button class="btn-edit" onclick="openEditModal('${member.uid}')">Edit</button>
                    <button class="btn-delete" onclick="openConfirmModal('${member.uid}')">Hapus</button>
                    <button onclick="sessionStorage.setItem('focusedMemberUid', '${member.uid}'); window.location.href='network.html';">Lihat Jaringan</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}
function resetSearch() {
    const searchTermEl = document.getElementById('searchTerm');
    const resultsContainerEl = document.getElementById('searchResultsContainer');
    if(searchTermEl) searchTermEl.value = '';
    if(resultsContainerEl) resultsContainerEl.innerHTML = '';
}


// --- FUNGSI DAFTAR ANGGOTA ---
// ... (showMainDashboard, showMemberList, setupTableSorting, renderMemberList tidak diubah) ...
function showMainDashboard() { document.getElementById('mainDashboardContent').style.display = 'block'; document.getElementById('memberListContainer').style.display = 'none'; }
function showMemberList() { document.getElementById('mainDashboardContent').style.display = 'none'; document.getElementById('memberListContainer').style.display = 'block'; renderMemberList(); }
function setupTableSorting() { /* ... */
    document.querySelectorAll('#memberListTable th.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const newSortColumn = header.getAttribute('data-sort');
            if (newSortColumn === memberListSortColumn) {
                memberListSortDirection = (memberListSortDirection === 'asc') ? 'desc' : 'asc';
            } else {
                memberListSortColumn = newSortColumn;
                memberListSortDirection = 'asc';
            }
            renderMemberList();
        });
    });
 }
function renderMemberList() { /* ... */
    const members = loadMembers();
    const tbody = document.getElementById('memberListTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let sortedMembers = [];
    if (memberListSortColumn === 'no' || memberListSortColumn === 'joinDate') {
         sortedMembers = members.sort((a, b) => {
             const dateA = a.joinDate ? new Date(a.joinDate).getTime() : 0;
             const dateB = b.joinDate ? new Date(b.joinDate).getTime() : 0;
             return dateA - dateB;
         });
         if ((memberListSortColumn === 'no' && memberListSortDirection === 'desc') || (memberListSortColumn === 'joinDate' && memberListSortDirection === 'desc')) {
            sortedMembers.reverse();
        }
    } else {
        sortedMembers = members.sort((a, b) => {
            let valA, valB;
            switch (memberListSortColumn) {
                case 'name': valA = (a.name || '').toLowerCase(); valB = (b.name || '').toLowerCase(); break;
                case 'uid': valA = (a.uid || '').toLowerCase(); valB = (b.uid || '').toLowerCase(); break;
                case 'upline': valA = (a.upline || '').toLowerCase(); valB = (b.upline || '').toLowerCase(); break;
                default: return 0;
            }
            if (valA < valB) return (memberListSortDirection === 'asc') ? -1 : 1;
            if (valA > valB) return (memberListSortDirection === 'asc') ? 1 : -1;
            return 0;
        });
    }
    document.querySelectorAll('#memberListTable th.sortable-header').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-sort') === memberListSortColumn) {
            th.classList.add(memberListSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
    sortedMembers.forEach((member, index) => {
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/A';
        const row = `<tr><td>${index + 1}</td><td>${member.name || ''}</td><td>${member.uid || ''}</td><td>${member.upline || '-'}</td><td>${joinDate}</td></tr>`;
        tbody.innerHTML += row;
    });
 }

// === FUNGSI CHART DIPERBARUI ===
function renderGrowthChart() { /* ... */
    const members = loadMembers();
    const ctx = document.getElementById('growthChart')?.getContext('2d');
    if (!ctx) return;

    if (growthChart) { growthChart.destroy(); }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const membersThisMonth = members.filter(member => {
        if (!member.joinDate) return false;
        try {
            const joinDate = new Date(member.joinDate);
             return !isNaN(joinDate.getTime()) && joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth;
        } catch (e) { console.error("Error parsing joinDate for member:", member, e); return false; }
    });

    let period1Count = 0;
    let period2Count = 0;
    membersThisMonth.forEach(member => {
        try {
            const joinDay = new Date(member.joinDate).getDate();
            if (joinDay >= 1 && joinDay <= 15) { period1Count++; } else { period2Count++; }
        } catch (e) { console.error("Error getting date for member:", member, e); }
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const labels = ['Periode 1-15', `Periode 16-${daysInMonth}`];
    const data = [period1Count, period2Count];

    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anggota Baru Bulan Ini', data: data,
                backgroundColor: ['rgba(255, 175, 64, 0.7)', 'rgba(255, 175, 64, 0.9)'],
                borderColor: ['rgba(255, 175, 64, 1)', 'rgba(255, 175, 64, 1)'],
                borderWidth: 1, borderRadius: 5, barThickness: 60
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { color: 'var(--warna-teks-sekunder)', stepSize: 1, precision: 0 }, grid: { color: 'var(--warna-border)', drawBorder: false } },
                x: { ticks: { color: 'var(--warna-teks-sekunder)' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false }, tooltip: { enabled: false },
                datalabels: {
                    display: true, color: 'var(--warna-teks)', anchor: 'end', align: 'top', offset: 4,
                    font: { weight: 'bold', size: 14 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        },
    });

     // Display message only if chart area is ready and no data
     if (membersThisMonth.length === 0) {
        growthChart.options.animation = false; // Disable animation to draw text immediately
        growthChart.update(); // Update to ensure chartArea is calculated
        if (growthChart.chartArea) {
             const canvas = ctx.canvas;
             ctx.save();
             ctx.fillStyle = 'var(--warna-teks-sekunder)';
             ctx.textAlign = 'center';
             ctx.font = '16px Inter';
             ctx.fillText('Belum ada data bulan ini', canvas.width / 2, (growthChart.chartArea.top + growthChart.chartArea.bottom) / 2);
             ctx.restore();
        }
    }
}
// === AKHIR FUNGSI CHART ===

function renderNetwork() { /* ... */
    const $ = go.GraphObject.make;
    const diagramDiv = document.getElementById("networkDiagram");
    if (!diagramDiv) { console.error("Network diagram container not found!"); return; }
    if (diagram) diagram.div = null;

    diagram = $(go.Diagram, diagramDiv, {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 25 }),
        "undoManager.isEnabled": true, "initialContentAlignment": go.Spot.Center, "animationManager.isEnabled": false
    });

    const allMembers = loadMembers();
    if (allMembers.length === 0) { diagram.model = new go.GraphLinksModel([], []); return; }

    const focusedMemberUid = sessionStorage.getItem('focusedMemberUid');
    let membersToRender;

    if (focusedMemberUid) { /* ... (hierarchy logic) ... */
        const rootMember = allMembers.find(m => m.uid === focusedMemberUid);
        if (rootMember) {
            const getDownlineHierarchy = (allMembersList, parentUid) => {
                let downlines = [];
                const directChildren = allMembersList.filter(m => m.upline === parentUid);
                for (const child of directChildren) {
                    downlines.push(child);
                    const childDownlines = getDownlineHierarchy(allMembersList, child.uid);
                    downlines = downlines.concat(childDownlines);
                }
                return downlines;
            };
            membersToRender = [rootMember, ...getDownlineHierarchy(allMembers, focusedMemberUid)];
        } else { console.warn(`Focused member UID ${focusedMemberUid} not found.`); membersToRender = allMembers; }
     } else { membersToRender = allMembers; }

    const downlineCounts = {};
    allMembers.forEach(m => { downlineCounts[m.uid] = 0; });
    allMembers.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    diagram.nodeTemplate = $(go.Node, "Horizontal", { selectionObjectName: "PANEL", background: "transparent" },
            $(go.Panel, "Auto", { name: "PANEL", margin: 2 },
                $(go.Shape, "RoundedRectangle", { strokeWidth: 2, fill: "var(--warna-bg-kartu)", stroke: "var(--warna-border)" },
                    new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-border)")
                ),
                $(go.TextBlock, { margin: new go.Margin(8, 12, 8, 12), font: "500 13px Inter", textAlign: "center", stroke: "var(--warna-teks)" },
                     new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-teks)"),
                    new go.Binding("text", "label")
                )
            ),
            $("TreeExpanderButton", { margin: new go.Margin(10, 0, 10, 2), width: 18, height: 18, "ButtonBorder.fill": "var(--warna-teks-sekunder)", "ButtonBorder.stroke": null },
                 { "_treeExpandedFigure": "MinusLine", "_treeCollapsedFigure": "PlusLine" })
        );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, fromSpot: go.Spot.Right, toSpot: go.Spot.Left, corner: 10 },
            $(go.Shape, { strokeWidth: 1.5, stroke: "var(--warna-border)" },
                 new go.Binding("stroke", "from", fromKey => (downlineCounts[fromKey] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-border)")
            )
        );

    const nodes = membersToRender.map(m => {
        let joinDateFormatted = 'N/A';
        if (m.joinDate) {
             try {
                 const d = new Date(m.joinDate);
                 if (!isNaN(d.getTime())) { const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); joinDateFormatted = `${day}-${month}`; }
             } catch (e) { console.error("Error formatting date for node:", m, e); }
        }
        const label = `${m.uid}/${m.name || 'Nama?'}/${joinDateFormatted}`;
        return { key: m.uid, label: label };
    });
    const links = membersToRender.filter(m => m.upline && membersToRender.some(u => u.uid === m.upline)).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);

    if (focusedMemberUid) {
        diagram.addDiagramListener("InitialLayoutCompleted", function(e) {
             const node = diagram.findNodeForKey(focusedMemberUid);
             if (node) { diagram.centerRect(node.actualBounds); diagram.scale = 1.0; node.isSelected = true; }
             else { console.warn(`Node with key ${focusedMemberUid} not found after layout.`); }
             sessionStorage.removeItem('focusedMemberUid');
        });
    } else { diagram.clearSelection(); }
}


function downloadNetworkImage() { /* ... */
    if (!diagram) { showNotification("Diagram belum dimuat."); return; }
    try {
        const img = diagram.makeImage({ scale: 1.5, background: "var(--warna-bg-utama)", maxSize: new go.Size(Infinity, Infinity), padding: 20 });
        const link = document.createElement('a'); link.href = img.src; link.download = 'struktur_jaringan_dvteam.png';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showNotification("Mulai mengunduh gambar jaringan...");
    } catch (e) { console.error("Gagal membuat gambar diagram:", e); showNotification("Gagal mengunduh gambar."); }
}

