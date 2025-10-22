// --- SCRIPT BARU DITAMBAHKAN DI ATAS ---
// Registrasi plugin datalabels untuk Chart.js
Chart.register(ChartDataLabels);
// --- AKHIR SCRIPT BARU ---


// --- GLOBAL VARIABLES & INITIALIZATION ---
let diagram = null;
let growthChart = null; // Variable to hold the chart instance
let memberListSortColumn = 'joinDate'; // Default sort
let memberListSortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    // ... (kode 'DOMContentLoaded' lainnya tidak berubah) ...
    
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
        document.getElementById('loginButton').addEventListener('click', login);
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
function showNotification(message, duration = 3000) { /* ... */ }
function openEditModal(uid) { /* ... */ }
function closeEditModal() { /* ... */ }
function openConfirmModal(uid) { /* ... */ }
function requestFullScreen() { /* ... */ }
function exitFullScreen() { /* ... */ }
function ensureFullScreen() { /* ... */ }
function login() { /* ... */ }
function logout() { /* ... */ }
function loadMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(members) { localStorage.setItem('members', JSON.stringify(members));}
function addMember() { /* ... (panggil renderGrowthChart di akhir) */
    // ... (kode tambah anggota) ...
    renderGrowthChart(); // <-- Pastikan ini dipanggil
}
function saveEditedMember() { /* ... (panggil renderGrowthChart di akhir) */
    // ... (kode simpan edit) ...
    renderGrowthChart(); // <-- Pastikan ini dipanggil
}
function deleteMember(uid) { /* ... (panggil renderGrowthChart di akhir) */
    // ... (kode hapus anggota) ...
    renderGrowthChart(); // <-- Pastikan ini dipanggil
}
function updateCount() { /* ... */ }
function downloadCSV() { /* ... */ }
function uploadCSV() { /* ... (panggil renderGrowthChart di akhir) */
     // ... (kode upload CSV) ...
     if (newMembers.length > 0) {
         saveMembers(newMembers); updateCount(); renderGrowthChart(); // <-- Pastikan ini dipanggil
         showNotification(`Impor berhasil! ${newMembers.length} anggota dimuat.`);
     } // ...
}
function searchMembers() { /* ... */ }
function getDownlineCount(allMembersList, parentUid) { /* ... */ }
function displaySearchResults(results, allMembers) { /* ... */ }
function resetSearch() { /* ... */ }
function showMainDashboard() { /* ... */ }
function showMemberList() { /* ... */ }
function setupTableSorting() { /* ... */ }
function renderMemberList() { /* ... */ }


// ==========================================================
// === FUNGSI INI DITULIS ULANG (renderGrowthChart) ===
// ==========================================================
function renderGrowthChart() {
    const members = loadMembers();
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    // Hancurkan chart lama jika ada
    if (growthChart) {
        growthChart.destroy();
    }

    // Dapatkan tahun dan bulan saat ini
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Filter anggota yang bergabung di bulan ini
    const membersThisMonth = members.filter(member => {
        if (!member.joinDate) return false;
        const joinDate = new Date(member.joinDate);
        return joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth;
    });

    // Hitung anggota untuk setiap periode
    let period1Count = 0; // Tgl 1-15
    let period2Count = 0; // Tgl 16-akhir
    membersThisMonth.forEach(member => {
        const joinDay = new Date(member.joinDate).getDate();
        if (joinDay >= 1 && joinDay <= 15) {
            period1Count++;
        } else {
            period2Count++;
        }
    });
    
    // Siapkan data untuk chart
    const labels = ['Periode 1-15', `Periode 16-${new Date(currentYear, currentMonth + 1, 0).getDate()}`]; // Label periode dinamis
    const data = [period1Count, period2Count];

    // Buat chart baru
    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anggota Baru Bulan Ini', // Label dataset (tidak terlihat karena legend: false)
                data: data,
                backgroundColor: [ // Warna berbeda untuk setiap bar
                    'rgba(255, 175, 64, 0.7)', // Warna aksen (oranye) transparan
                    'rgba(255, 175, 64, 0.9)', // Warna aksen lebih solid
                ], 
                borderColor: [ // Border untuk setiap bar
                    'rgba(255, 175, 64, 1)',
                    'rgba(255, 175, 64, 1)',
                ],
                borderWidth: 1,
                borderRadius: 5, // Sudut bar sedikit rounded
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Biarkan tinggi diatur oleh kontainer
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: 'var(--warna-teks-sekunder)', 
                        stepSize: 1, // Pastikan skala y adalah integer
                        precision: 0 // Tidak ada desimal di skala y
                    },
                    grid: { 
                        color: 'var(--warna-border)', // Warna garis grid
                        drawBorder: false // Sembunyikan border sumbu y
                    }
                },
                x: {
                    ticks: { 
                        color: 'var(--warna-teks-sekunder)' 
                    },
                    grid: { 
                        display: false // Sembunyikan garis grid x
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Sembunyikan legenda
                },
                tooltip: {
                    enabled: false // MATIKAN TOOLTIP
                },
                // Konfigurasi plugin datalabels
                datalabels: {
                    display: true, // Tampilkan label
                    color: 'var(--warna-teks)', // Warna teks label
                    anchor: 'end', // Posisi label di atas bar
                    align: 'top', // Rata atas
                    offset: 4, // Jarak dari atas bar
                    font: {
                        weight: 'bold' // Font tebal
                    },
                    formatter: (value) => { // Tampilkan value jika > 0
                        return value > 0 ? value : ''; 
                    }
                }
            }
        }
    });
    
     // Tampilkan pesan jika tidak ada data bulan ini
    if (membersThisMonth.length === 0) {
        const canvas = ctx.canvas;
        const chartArea = growthChart.chartArea;
        if (!chartArea) return; // Tunggu area chart siap
        ctx.save();
        ctx.fillStyle = 'var(--warna-teks-sekunder)';
        ctx.textAlign = 'center';
        ctx.font = '16px Inter';
        ctx.fillText('Belum ada data bulan ini', canvas.width / 2, (chartArea.top + chartArea.bottom) / 2);
        ctx.restore();
    }
}
// ==========================================================
// === AKHIR PERUBAHAN ===
// ==========================================================



// --- NETWORK VISUALIZATION ---
// ... (fungsi renderNetwork tidak berubah dari jawaban sebelumnya) ...
function renderNetwork() { /* ... */ }

// --- FUNGSI DOWNLOAD GAMBAR JARINGAN (Tidak Diubah) ---
// ... (fungsi downloadNetworkImage tidak berubah dari jawaban sebelumnya) ...
function downloadNetworkImage() { /* ... */ }
