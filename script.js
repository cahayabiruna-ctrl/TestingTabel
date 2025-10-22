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


// --- NOTIFICATION & MODAL (Tidak Diubah) ---
function showNotification(message, duration = 3000) { /* ... */ }
function openEditModal(uid) { /* ... */ }
function closeEditModal() { /* ... */ }
function openConfirmModal(uid) { /* ... */ }

// --- AUTH, NAVIGATION & FULLSCREEN (Tidak Diubah) ---
function requestFullScreen() { /* ... */ }
function exitFullScreen() { /* ... */ }
function ensureFullScreen() { /* ... */ }
function login() { /* ... */ }
function logout() { /* ... */ }

// --- DATA MANAGEMENT (CRUD) (Tidak Diubah) ---
function loadMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(members) { localStorage.setItem('members', JSON.stringify(members));}
function addMember() { /* ... (panggil renderGrowthChart di akhir) */ }
function saveEditedMember() { /* ... (panggil renderGrowthChart di akhir) */ }
function deleteMember(uid) { /* ... (panggil renderGrowthChart di akhir) */ }
function updateCount() { /* ... */ }

// --- CSV FUNCTIONS (Tidak Diubah) ---
function downloadCSV() { /* ... */ }
 function uploadCSV() { /* ... (panggil renderGrowthChart di akhir) */ }

// --- SEARCH FUNCTIONS (Tidak Diubah) ---
function searchMembers() { /* ... */ }
function getDownlineCount(allMembersList, parentUid) { /* ... */ }
 function displaySearchResults(results, allMembers) { /* ... */ }
function resetSearch() { /* ... */ }

// --- FUNGSI DAFTAR ANGGOTA (Tidak Diubah) ---
function showMainDashboard() { /* ... */ }
function showMemberList() { /* ... */ }
function setupTableSorting() { /* ... */ }
function renderMemberList() { /* ... */ }

// --- FUNGSI CHART (Tidak Diubah) ---
function renderGrowthChart() { /* ... */ }


// --- NETWORK VISUALIZATION ---
function renderNetwork() {
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

    if (focusedMemberUid) { /* ... (hierarchy logic tidak berubah) ... */
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

    // ==========================================================
    // === NODE TEMPLATE DIPERBARUI (Ukuran Font & Margin) ===
    // ==========================================================
    diagram.nodeTemplate =
        $(go.Node, "Horizontal", { selectionObjectName: "PANEL", background: "transparent" },
            $(go.Panel, "Auto", { name: "PANEL", margin: 2 },
                $(go.Shape, "RoundedRectangle", {
                    strokeWidth: 2,
                    fill: "var(--warna-bg-kartu)", // Gunakan warna kartu
                    stroke: "var(--warna-border)"   // Gunakan warna border
                 },
                    // Binding stroke tetap sama
                    new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-border)")
                ),
                $(go.TextBlock, {
                    // Margin disesuaikan agar ada ruang
                    margin: new go.Margin(10, 15, 10, 15),
                    // FONT DIPERBESAR
                    font: "500 14px Inter", // Coba 14px, atau 15px jika perlu
                    textAlign: "center",
                    stroke: "var(--warna-teks)", // Warna teks utama
                    wrap: go.TextBlock.WrapFit // Coba tambahkan wrap jika teks panjang
                 },
                    // Binding stroke teks tetap sama
                     new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-teks)"),
                    new go.Binding("text", "label")
                )
            ),
            // Tombol expander tetap sama
            $("TreeExpanderButton", { margin: new go.Margin(10, 0, 10, 2), width: 18, height: 18, "ButtonBorder.fill": "var(--warna-teks-sekunder)", "ButtonBorder.stroke": null },
                 { "_treeExpandedFigure": "MinusLine", "_treeCollapsedFigure": "PlusLine" })
        );
    // ==========================================================
    // === AKHIR PERUBAHAN NODE TEMPLATE ===
    // ==========================================================

    // Link template (Tidak Diubah)
    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, fromSpot: go.Spot.Right, toSpot: go.Spot.Left, corner: 10 },
            $(go.Shape, { strokeWidth: 1.5, stroke: "var(--warna-border)" },
                 new go.Binding("stroke", "from", fromKey => (downlineCounts[fromKey] || 0) >= 5 ? "var(--warna-aksen)" : "var(--warna-border)")
            )
        );

    // Format nodes (Tidak Diubah)
    const nodes = membersToRender.map(m => { /* ... (format label UID/Nama/Tgl-Bln) ... */
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
    // Format links (Tidak Diubah)
    const links = membersToRender.filter(m => m.upline && membersToRender.some(u => u.uid === m.upline)).map(m => ({ from: m.upline, to: m.uid }));
    // Set model (Tidak Diubah)
    diagram.model = new go.GraphLinksModel(nodes, links);
    // Focus logic (Tidak Diubah)
    if (focusedMemberUid) { /* ... */ } else { diagram.clearSelection(); }
}


// --- FUNGSI DOWNLOAD GAMBAR JARINGAN (Tidak Diubah) ---
function downloadNetworkImage() { /* ... */ }

