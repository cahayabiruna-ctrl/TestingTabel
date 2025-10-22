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
        return; // Hentikan eksekusi script lebih lanjut
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
        // Mungkin tampilkan pesan ke pengguna?
        // showNotification("Gagal memuat dashboard. Coba refresh.", 5000);
        return;
    }
    updateCount();
    renderGrowthChart();
    // Setup event listeners hanya jika elemen ada
    document.getElementById('addMemberButton')?.addEventListener('click', addMember);
    document.getElementById('searchButton')?.addEventListener('click', searchMembers);
    document.getElementById('resetButton')?.addEventListener('click', resetSearch);
    document.getElementById('uploadButton')?.addEventListener('click', () => document.getElementById('csvFile').click());
    document.getElementById('csvFile')?.addEventListener('change', uploadCSV);
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
function showNotification(message, duration = 3000) { /* ... */ }
function openEditModal(uid) { /* ... */ }
function closeEditModal() { /* ... */ }
function openConfirmModal(uid) { /* ... */ }

// --- AUTH, NAVIGATION & FULLSCREEN ---
function requestFullScreen() { /* ... */ }
function exitFullScreen() { /* ... */ }
function ensureFullScreen() { /* ... */ }

// === FUNGSI LOGIN ===
function login() {
    console.log("Login function called."); // Debug

    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    const errorEl = document.getElementById('error');

    // Pemeriksaan elemen yang lebih detail
    if (!userEl) { console.error("Login Error: Username input not found!"); return; }
    if (!passEl) { console.error("Login Error: Password input not found!"); return; }
    if (!errorEl) { console.warn("Login Warning: Error display element not found."); } // Lanjut tapi beri warning

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
            // Pindahkan ensureFullScreen() ke initializeDashboard() agar dipanggil setelah halaman dimuat
        } catch (e) {
            console.error("Error during login success:", e); // Debug error
            if(errorEl) errorEl.innerText = 'Terjadi kesalahan saat login.';
        }
    } else {
        console.log("Login credentials DO NOT MATCH."); // Debug
        if (errorEl) {
            errorEl.innerText = 'Login gagal! Username atau password salah.';
        }
    }
}
// === AKHIR FUNGSI LOGIN ===

function logout() { /* ... */ }

// --- DATA MANAGEMENT (CRUD) ---
function loadMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(members) { localStorage.setItem('members', JSON.stringify(members));}
function addMember() { /* ... */ }
function saveEditedMember() { /* ... */ }
function deleteMember(uid) { /* ... */ }
function updateCount() { /* ... */ }

// --- CSV FUNCTIONS ---
function downloadCSV() { /* ... */ }
function uploadCSV() { /* ... */ }

// --- SEARCH FUNCTIONS ---
function searchMembers() { /* ... */ }
function getDownlineCount(allMembersList, parentUid) { /* ... */ }
function displaySearchResults(results, allMembers) { /* ... */ }
function resetSearch() { /* ... */ }

// --- FUNGSI DAFTAR ANGGOTA ---
function showMainDashboard() { /* ... */ }
function showMemberList() { /* ... */ }
function setupTableSorting() { /* ... */ }
function renderMemberList() { /* ... */ }

// --- FUNGSI CHART ---
function renderGrowthChart() { /* ... (kode chart dari sebelumnya) ... */ }

// --- NETWORK VISUALIZATION ---
function renderNetwork() { /* ... (kode network dari sebelumnya) ... */ }
function downloadNetworkImage() { /* ... */ }

// --- (Salin semua fungsi yang tidak diubah dari jawaban sebelumnya ke sini) ---
// Pastikan semua fungsi seperti showNotification, modal, CRUD, CSV, Search,
// Chart, Network ada di sini.

