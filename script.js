// --- SCRIPT BARU DITAMBAHKAN DI ATAS ---
// Registrasi plugin datalabels untuk Chart.js
// Periksa apakah ChartDataLabels sudah terdaftar sebelum mendaftarkannya lagi
if (Chart.registry.plugins.get('datalabels') === undefined) {
    Chart.register(ChartDataLabels);
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

    // --- PROTEKSI LOGIN (Tidak Diubah) ---
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        window.location.href = 'index.html';
        return;
    }
    // --- AKHIR PROTEKSI ---


    if (path.includes('dashboard.html') || path.includes('network.html')) {
        if (isLoggedIn) {
            ensureFullScreen();
        }
    }

    if (path.includes('index.html') || path.endsWith('/')) {
        // Pastikan elemen ada sebelum menambahkan listener
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', login);
        } else {
            console.error("Login button not found!"); // Pesan error jika tombol tidak ada
        }
    } else if (path.includes('dashboard.html')) {
        initializeDashboard();
    } else if (path.includes('network.html')) {
        initializeNetworkPage();
    }
});

// --- INITIALIZERS ---
function initializeDashboard() {
    updateCount();
    renderGrowthChart(); // Panggil fungsi chart yang baru
    // Hapus event listener untuk chartPeriodSelector karena elemennya sudah dihapus
    // document.getElementById('chartPeriodSelector').addEventListener('change', renderGrowthChart);
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
    renderNetwork(); // Initial full network render
    document.getElementById('backButton').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    document.getElementById('downloadNetworkButton').addEventListener('click', downloadNetworkImage);
}


// --- NOTIFICATION & MODAL (Tidak Diubah) ---
// ... (semua fungsi modal, auth, crud, csv, dan search tidak berubah) ...
function showNotification(message, duration = 3000) {
    let notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), duration);
}
function openEditModal(uid) {
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
function openConfirmModal(uid) {
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmDeleteButton');
    const cancelBtn = document.getElementById('cancelDeleteButton');
    modal.style.display = 'flex';
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', () => {
        deleteMember(uid);
        modal.style.display = 'none';
    });
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}
function requestFullScreen() { /* ... */
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
 }
function exitFullScreen() { /* ... */
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
}
function ensureFullScreen() { if (!document.fullscreenElement) { requestFullScreen(); } }

// === FUNGSI LOGIN (Pastikan tidak ada error di sini) ===
function login() {
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    const errorEl = document.getElementById('error');

    // Tambahan: Periksa apakah elemen input ada
    if (!userEl || !passEl) {
        console.error("Username or password input field not found!");
        if(errorEl) errorEl.innerText = 'Kesalahan: Input tidak ditemukan.';
        return;
    }

    const user = userEl.value;
    const pass = passEl.value;

    if (user === 'admin' && pass === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        requestFullScreen();
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 150);
    } else {
        if (errorEl) {
            errorEl.innerText = 'Login gagal!';
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
function loadMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(members) { localStorage.setItem('members', JSON.stringify(members));}
function addMember() { /* ... (panggil renderGrowthChart di akhir) */
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
    searchMembers(); // Panggil searchMembers agar hasil pencarian ter-update jika ada
    renderGrowthChart(); // <-- Pastikan ini dipanggil
}
function saveEditedMember() { /* ... (panggil renderGrowthChart di akhir) */
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
    searchMembers(); // Panggil searchMembers agar hasil pencarian ter-update
    renderGrowthChart(); // <-- Pastikan ini dipanggil
}
function deleteMember(uid) { /* ... (panggil renderGrowthChart di akhir) */
    let members = loadMembers();
    // Reassign upline for direct downlines (optional, keeps structure cleaner)
    // You might want to decide if downlines should become orphans or re-assigned
    // members.forEach(member => { if (member.upline === uid) member.upline = null; }); // Example: make orphans

    const updatedMembers = members.filter(m => m.uid !== uid);
    saveMembers(updatedMembers);
    showNotification("Anggota telah dihapus.");
    updateCount();
    searchMembers(); // Panggil searchMembers agar hasil pencarian ter-update
    renderGrowthChart(); // <-- Pastikan ini dipanggil
}
function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = loadMembers().length; }
function downloadCSV() { /* ... */
    const members = loadMembers();
    if (members.length === 0) return showNotification("Belum ada data!");
    let csv = "Nama,UID,Upline,TanggalBergabung\n";
    members.forEach(m => {
        const name = `"${m.name.replace(/"/g, '""')}"`;
        const joinDate = m.joinDate ? m.joinDate.split('T')[0] : '';
        csv += `${name},${m.uid},${m.upline || ''},${joinDate}\n`;
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
    } catch (e) { showNotification('Download gagal.'); }
 }
function uploadCSV() { /* ... (panggil renderGrowthChart di akhir) */
     const fileInput = document.getElementById('csvFile');
     if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
     const file = fileInput.files[0];

     const reader = new FileReader();
     reader.onload = function(event) {
         let newMembers = []; // Define newMembers here
         try {
             const text = event.target.result;
             const allRows = text.split(/\r?\n/);
             // Robust CSV parsing function (handles quotes and commas within fields)
             const parseCsvRow = row => {
                 const columns = [];
                 let currentColumn = '';
                 let inQuotes = false;
                 for (let i = 0; i < row.length; i++) {
                     const char = row[i];
                     const nextChar = row[i + 1];

                     if (char === '"' && !inQuotes && currentColumn === '') {
                         inQuotes = true;
                     } else if (char === '"' && inQuotes && nextChar === '"') {
                         // Handle escaped quote ("")
                         currentColumn += '"';
                         i++; // Skip the next quote
                     } else if (char === '"' && inQuotes && (nextChar === ',' || nextChar === undefined)) {
                         inQuotes = false;
                     } else if (char === ',' && !inQuotes) {
                         columns.push(currentColumn.trim());
                         currentColumn = '';
                     } else {
                         currentColumn += char;
                     }
                 }
                 columns.push(currentColumn.trim()); // Add the last column
                 return columns;
             };

             if (allRows.length < 2) throw new Error("File CSV kosong atau hanya berisi header.");

             const header = allRows[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
             if (!header.includes('nama') || !header.includes('uid')) throw new Error("Format CSV salah: Kolom 'nama' atau 'uid' tidak ditemukan.");

             const nameIndex = header.indexOf('nama');
             const uidIndex = header.indexOf('uid');
             const uplineIndex = header.indexOf('upline');
             const dateIndex = header.indexOf('tanggalbergabung'); // Lowercase consistent

             allRows.slice(1).filter(row => row.trim() !== '').forEach((row, rowIndex) => {
               try {
                   const columns = parseCsvRow(row);
                   const name = columns[nameIndex] ? columns[nameIndex].trim() : '';
                   const uid = columns[uidIndex] ? columns[uidIndex].trim() : '';
                   const upline = uplineIndex > -1 && columns[uplineIndex] ? columns[uplineIndex].trim() : null;

                   let joinDate = new Date().toISOString(); // Default to now if date is invalid/missing
                   if (dateIndex > -1 && columns[dateIndex]) {
                       const dateStr = columns[dateIndex].trim();
                       // Try parsing common formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
                       let parsedDate = new Date(dateStr); // Try ISO format first
                       if (isNaN(parsedDate.getTime())) {
                            // Try DD/MM/YYYY
                           const parts = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                           if (parts) {
                               parsedDate = new Date(parts[3], parts[2] - 1, parts[1]);
                           } else {
                               // Try MM/DD/YYYY
                               const parts2 = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                               if (parts2) {
                                  parsedDate = new Date(parts2[3], parts2[1] - 1, parts2[2]);
                               }
                           }
                       }

                       if (!isNaN(parsedDate.getTime())) {
                           joinDate = parsedDate.toISOString();
                       } else {
                           console.warn(`Format tanggal tidak valid di baris ${rowIndex + 2}: ${dateStr}. Menggunakan tanggal hari ini.`);
                       }
                   }

                   if (name && uid) {
                       // Basic validation (e.g., check if UID already exists in the batch)
                       if (newMembers.some(m => m.uid === uid)) {
                           console.warn(`UID duplikat ditemukan di file CSV: ${uid}. Baris ${rowIndex + 2} dilewati.`);
                       } else {
                           newMembers.push({ name, uid, upline: upline || null, joinDate });
                       }
                   } else {
                       console.warn(`Nama atau UID kosong di baris ${rowIndex + 2}. Baris dilewati.`);
                   }
               } catch (rowError) {
                   console.error(`Gagal memproses baris ${rowIndex + 2}: ${rowError.message}`);
               }
             });

             if (newMembers.length > 0) {
                 // Option: Overwrite or merge? Currently overwriting.
                 saveMembers(newMembers);
                 updateCount();
                 renderGrowthChart(); // <-- Pastikan ini dipanggil
                 showNotification(`Impor berhasil! ${newMembers.length} anggota dimuat.`);
             } else {
                 showNotification("Tidak ada data anggota valid yang ditemukan di file CSV.");
             }
         } catch (e) {
             console.error("Gagal memproses file CSV:", e);
             showNotification(`Gagal memproses file: ${e.message}`);
         }
         finally {
             if (fileInput) fileInput.value = ''; // Reset file input
         }
     };
     reader.onerror = () => {
         showNotification("Gagal membaca file.");
          if (fileInput) fileInput.value = ''; // Reset file input
     };
     reader.readAsText(file);
 }
function searchMembers() { /* ... */
    const searchTerm = document.getElementById('searchTerm').value.toLowerCase();
    const allMembers = loadMembers();
    const results = allMembers.filter(member => {
        const matchesSearchTerm = searchTerm === '' || member.name.toLowerCase().includes(searchTerm) || member.uid.toLowerCase().includes(searchTerm);
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
    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--warna-teks-sekunder); margin-top: 20px;">Tidak ada anggota ditemukan.</p>'; // Use variable color
        return;
    }
    let html = `<h4 style="margin-top: 20px; color: var(--warna-teks-sekunder); font-weight: 500;">Hasil (${results.length})</h4>`; // Style title
    results.forEach(member => {
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/A'; // Format date better
        const uplineMember = allMembers.find(m => m.uid === member.upline);
        const uplineName = uplineMember ? uplineMember.name : '-';
        const uplineUid = member.upline || '-';
        const downlineCount = getDownlineCount(allMembers, member.uid);
        html += `
            <div class="result-card">
                <div class="result-info">
                    <span class="info-label">Nama:</span>
                    <span class="info-value">${member.name}</span>
                </div>
                <div class="result-info">
                    <span class="info-label">No. UID:</span>
                    <span class="info-value">${member.uid}</span>
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
function resetSearch() { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; }
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
    if (!tbody) return; // Add check if tbody exists
    tbody.innerHTML = '';
    let sortedMembers = [];
    // Sorting logic (ensure dates are compared correctly)
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
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'uid':
                    valA = (a.uid || '').toLowerCase();
                    valB = (b.uid || '').toLowerCase();
                    break;
                case 'upline':
                    valA = (a.upline || '').toLowerCase();
                    valB = (b.upline || '').toLowerCase();
                    break;
                default: // Should not happen if data-sort is correct
                    return 0;
            }
            if (valA < valB) return (memberListSortDirection === 'asc') ? -1 : 1;
            if (valA > valB) return (memberListSortDirection === 'asc') ? 1 : -1;
            return 0;
        });
    }

    // Update header classes
    document.querySelectorAll('#memberListTable th.sortable-header').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-sort') === memberListSortColumn) {
            th.classList.add(memberListSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });

    // Populate table body
    sortedMembers.forEach((member, index) => {
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/A';
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${member.name || ''}</td>
                <td>${member.uid || ''}</td>
                <td>${member.upline || '-'}</td>
                <td>${joinDate}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
 }

// === FUNGSI CHART DIPERBARUI ===
function renderGrowthChart() { /* ... */
    const members = loadMembers();
    const ctx = document.getElementById('growthChart')?.getContext('2d'); // Add optional chaining
    if (!ctx) return; // Exit if canvas context not found

    if (growthChart) {
        growthChart.destroy();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const membersThisMonth = members.filter(member => {
        if (!member.joinDate) return false;
        try {
            const joinDate = new Date(member.joinDate);
             // Check if joinDate is valid before getting year/month
             return !isNaN(joinDate.getTime()) &&
                    joinDate.getFullYear() === currentYear &&
                    joinDate.getMonth() === currentMonth;
        } catch (e) {
            console.error("Error parsing joinDate for member:", member, e);
            return false;
        }
    });

    let period1Count = 0;
    let period2Count = 0;
    membersThisMonth.forEach(member => {
        try {
            const joinDay = new Date(member.joinDate).getDate();
            if (joinDay >= 1 && joinDay <= 15) {
                period1Count++;
            } else {
                period2Count++;
            }
        } catch (e) {
             console.error("Error getting date for member:", member, e);
        }
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const labels = ['Periode 1-15', `Periode 16-${daysInMonth}`];
    const data = [period1Count, period2Count];

    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anggota Baru Bulan Ini',
                data: data,
                backgroundColor: [
                    'rgba(255, 175, 64, 0.7)',
                    'rgba(255, 175, 64, 0.9)',
                ],
                borderColor: [
                    'rgba(255, 175, 64, 1)',
                    'rgba(255, 175, 64, 1)',
                ],
                borderWidth: 1,
                borderRadius: 5,
                barThickness: 60 // Adjust bar thickness if needed
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'var(--warna-teks-sekunder)',
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: 'var(--warna-border)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--warna-teks-sekunder)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                datalabels: {
                    display: true,
                    color: 'var(--warna-teks)',
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    font: { weight: 'bold', size: 14 }, // Increase font size
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        },
        // Register plugin instance if needed, but global registration is usually sufficient
        // plugins: [ChartDataLabels]
    });

     if (membersThisMonth.length === 0 && growthChart.chartArea) { // Check chartArea again
        const canvas = ctx.canvas;
        ctx.save();
        ctx.fillStyle = 'var(--warna-teks-sekunder)';
        ctx.textAlign = 'center';
        ctx.font = '16px Inter';
        ctx.fillText('Belum ada data bulan ini', canvas.width / 2, (growthChart.chartArea.top + growthChart.chartArea.bottom) / 2);
        ctx.restore();
    }
}
// === AKHIR FUNGSI CHART ===

function renderNetwork() { /* ... */
    const $ = go.GraphObject.make;
    const diagramDiv = document.getElementById("networkDiagram");
    if (!diagramDiv) {
        console.error("Network diagram container not found!");
        return;
    }
    if (diagram) diagram.div = null; // Clear previous diagram instance if exists

    diagram = $(go.Diagram, diagramDiv, { // Ensure it targets the div
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 25 }), // Increase node spacing slightly
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center,
        "animationManager.isEnabled": false // Disable animations for potentially faster rendering
    });

    const allMembers = loadMembers();
    if (allMembers.length === 0) {
        diagram.model = new go.GraphLinksModel([], []);
        return;
    }

    const focusedMemberUid = sessionStorage.getItem('focusedMemberUid');
    let membersToRender;

    // Hierarchy logic (no changes needed here)
    if (focusedMemberUid) {
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
        } else {
            console.warn(`Focused member UID ${focusedMemberUid} not found.`);
            membersToRender = allMembers; // Fallback to all members
        }
    } else {
        membersToRender = allMembers;
    }

    // Downline counts (no changes needed)
    const downlineCounts = {};
    allMembers.forEach(m => { downlineCounts[m.uid] = 0; });
    allMembers.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    // Node template (adjust font size/style)
    diagram.nodeTemplate =
        $(go.Node, "Horizontal", { selectionObjectName: "PANEL", background: "transparent" }, // Set background transparent
            $(go.Panel, "Auto", { name: "PANEL", margin: 2 }, // Add small margin
                $(go.Shape, "RoundedRectangle", {
                    strokeWidth: 2,
                    fill: "var(--warna-bg-kartu)", // Use card background
                    stroke: "var(--warna-border)"   // Use border color
                 },
                    new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-border)") // Use accent color for >5
                ),
                $(go.TextBlock, {
                    margin: new go.Margin(8, 12, 8, 12), // Adjust margin for padding
                    font: "500 13px Inter", // Use Inter font, adjust size/weight
                    textAlign: "center",
                    stroke: "var(--warna-teks)" // Use main text color
                 },
                     new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-teks)"), // Accent color for text too
                    new go.Binding("text", "label")
                )
            ),
            $("TreeExpanderButton",
                {
                    margin: new go.Margin(10, 0, 10, 2), // Adjust margin
                    width: 18, height: 18, // Slightly smaller button
                    "ButtonBorder.fill": "var(--warna-teks-sekunder)", // Button color
                    "ButtonBorder.stroke": null // No border on button border shape
                },
                 // Change icons maybe? Using default +/- for now
                 { "_treeExpandedFigure": "MinusLine", "_treeCollapsedFigure": "PlusLine" }
            )
        );

    // Link template (adjust color)
    diagram.linkTemplate =
        $(go.Link, {
            routing: go.Link.Orthogonal,
            fromSpot: go.Spot.Right,
            toSpot: go.Spot.Left,
            corner: 10
         },
            $(go.Shape, { strokeWidth: 1.5, stroke: "var(--warna-border)" }, // Use border color, slightly thinner
                 new go.Binding("stroke", "from", fromKey => (downlineCounts[fromKey] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-border)")
            )
        );

    // Format nodes (no changes needed here from previous logic)
    const nodes = membersToRender.map(m => {
        let joinDateFormatted = 'N/A';
        if (m.joinDate) {
             try {
                 const d = new Date(m.joinDate);
                 if (!isNaN(d.getTime())) { // Check if date is valid
                     const day = String(d.getDate()).padStart(2, '0');
                     const month = String(d.getMonth() + 1).padStart(2, '0');
                     joinDateFormatted = `${day}-${month}`;
                 }
             } catch (e) { console.error("Error formatting date for node:", m, e); }
        }
        const label = `${m.uid}/${m.name || 'Nama?'}/${joinDateFormatted}`;
        return { key: m.uid, label: label };
    });

    // Format links (no changes needed)
    const links = membersToRender
        .filter(m => m.upline && membersToRender.some(u => u.uid === m.upline))
        .map(m => ({ from: m.upline, to: m.uid }));

    // Set model
    diagram.model = new go.GraphLinksModel(nodes, links);

    // Focus logic (no changes needed)
    if (focusedMemberUid) {
        // Ensure diagram is ready before finding node
        diagram.addDiagramListener("InitialLayoutCompleted", function(e) {
             const node = diagram.findNodeForKey(focusedMemberUid);
             if (node) {
                 diagram.centerRect(node.actualBounds);
                 diagram.scale = 1.0; // Reset scale
                 node.isSelected = true;
             } else {
                 console.warn(`Node with key ${focusedMemberUid} not found after layout.`);
             }
             sessionStorage.removeItem('focusedMemberUid'); // Remove after use
        });
    } else {
         // Optional: Clear selection if no focus
         diagram.clearSelection();
    }
}


function downloadNetworkImage() { /* ... */
    if (!diagram) {
        showNotification("Diagram belum dimuat.");
        return;
    }
    try {
        const img = diagram.makeImage({
            scale: 1.5, // Increase scale slightly for better resolution
            background: "var(--warna-bg-utama)", // Use theme background color
            maxSize: new go.Size(Infinity, Infinity),
            padding: 20 // Add some padding around the diagram
        });
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'struktur_jaringan_dvteam.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Mulai mengunduh gambar jaringan...");
    } catch (e) {
        console.error("Gagal membuat gambar diagram:", e);
        showNotification("Gagal mengunduh gambar.");
    }
}

