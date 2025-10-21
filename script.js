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

    // --- PERBAIKAN: PROTEKSI LOGIN ---
    // Cek apakah sudah login
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        // Jika BELUM login DAN TIDAK sedang di halaman index.html
        // Lempar kembali ke halaman login
        window.location.href = 'index.html';
        return; // Hentikan eksekusi script apa pun di halaman ini
    }
    // --- AKHIR PERBAIKAN ---

    
    if (path.includes('dashboard.html') || path.includes('network.html')) {
        // Hanya jalankan fullscreen jika sudah login dan di halaman dashboard/network
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
    populateDateFilters();
    renderGrowthChart();
    document.getElementById('chartPeriodSelector').addEventListener('change', renderGrowthChart);
    document.getElementById('addMemberButton').addEventListener('click', addMember);
    document.getElementById('searchButton').addEventListener('click', searchMembers);
    document.getElementById('resetButton').addEventListener('click', resetSearch);
    document.getElementById('uploadButton').addEventListener('click', () => document.getElementById('csvFile').click());
    document.getElementById('csvFile').addEventListener('change', uploadCSV);
    document.getElementById('viewNetworkButton').addEventListener('click', () => { window.location.href = 'network.html'; });
    
    // --- Event listener untuk fitur baru ---
    document.getElementById('viewMemberListButton').addEventListener('click', showMemberList);
    document.getElementById('backToDashboardButton').addEventListener('click', showMainDashboard);
    setupTableSorting(); // Menyiapkan listener untuk header tabel

    // --- Event listener untuk tombol-tombol yang sudah ada (termasuk Logout & Edit) ---
    document.getElementById('downloadButton').addEventListener('click', downloadCSV);
    document.getElementById('saveEditButton').addEventListener('click', saveEditedMember);
    document.getElementById('cancelEditButton').addEventListener('click', closeEditModal);
    document.getElementById('logoutButton').addEventListener('click', logout);
}

function initializeNetworkPage() {
    renderNetwork(); // Initial full network render
    document.getElementById('backButton').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
}

// --- NOTIFICATION & MODAL ---
function showNotification(message, duration = 3000) {
    let notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), duration);
}

// FUNGSI INI (openEditModal) DIPANGGIL OLEH TOMBOL 'Edit' DARI HASIL PENCARIAN
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

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// FUNGSI INI (openConfirmModal) DIPANGGIL OLEH TOMBOL 'Hapus' DARI HASIL PENCARIAN
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

// --- AUTH, NAVIGATION & FULLSCREEN ---
function requestFullScreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
}

function exitFullScreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
}

function ensureFullScreen() {
    if (!document.fullscreenElement) {
        requestFullScreen();
    }
}

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user === 'admin' && pass === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true'); // Menjaga status login
        requestFullScreen();
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 150);
    } else {
        document.getElementById('error').innerText = 'Login gagal!';
    }
}

// FUNGSI INI (logout) DIPANGGIL OLEH TOMBOL 'Logout'
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    exitFullScreen();
    window.location.href = 'index.html';
}

// --- DATA MANAGEMENT (CRUD) ---
function loadMembers() { return JSON.parse(localStorage.getItem('members') || '[]'); }
function saveMembers(members) { localStorage.setItem('members', JSON.stringify(members));}

function addMember() {
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
    ['name', 'uid', 'upline', 'joinDateInput'].forEach(id => document.getElementById(id).value = '');
    updateCount();
    searchMembers();
    renderGrowthChart();
}

function saveEditedMember() {
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

// FUNGSI INI (deleteMember) DIPANGGIL OLEH 'openConfirmModal'
function deleteMember(uid) {
    let members = loadMembers();
    members.forEach(member => { if (member.upline === uid) member.upline = null; });
    const updatedMembers = members.filter(m => m.uid !== uid);
    saveMembers(updatedMembers);
    showNotification("Anggota telah dihapus.");
    updateCount();
    searchMembers();
    renderGrowthChart();
}

function updateCount() {
    const el = document.getElementById('totalMembers');
    if (el) el.textContent = loadMembers().length;
}

// --- CSV FUNCTIONS ---
function downloadCSV() {
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

function uploadCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const text = event.target.result;
            const allRows = text.split(/\r?\n/);
            const parseCsvRow = row => {
                const columns = []; let currentColumn = ''; let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (char === '"') {
                        if (inQuotes && row[i + 1] === '"') { currentColumn += '"'; i++; } else { inQuotes = !inQuotes; }
                    } else if (char === ',' && !inQuotes) { columns.push(currentColumn); currentColumn = ''; } else { currentColumn += char; }
                }
                columns.push(currentColumn); return columns;
            };
            const header = allRows[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
            if (!header.includes('nama') || !header.includes('uid')) return showNotification("Format CSV salah.", 4000);
            const nameIndex = header.indexOf('nama'), uidIndex = header.indexOf('uid'), uplineIndex = header.indexOf('upline'), dateIndex = header.indexOf('tanggalbergabung');
            const newMembers = [];
            allRows.slice(1).filter(row => row.trim() !== '').forEach(row => {
              const columns = parseCsvRow(row);
              const name = columns[nameIndex] ? columns[nameIndex].trim() : '', uid = columns[uidIndex] ? columns[uidIndex].trim() : '';
              const upline = uplineIndex > -1 && columns[uplineIndex] ? columns[uplineIndex].trim() : null;
              let joinDate = new Date().toISOString();
              if (dateIndex > -1 && columns[dateIndex]) {
                  const parsedDate = new Date(columns[dateIndex].trim());
                  if (!isNaN(parsedDate.getTime())) joinDate = parsedDate.toISOString();
              }
              if (name && uid) newMembers.push({ name, uid, upline: upline || null, joinDate });
            });
            if (newMembers.length > 0) {
                saveMembers(newMembers); updateCount(); renderGrowthChart();
                showNotification(`Impor berhasil! ${newMembers.length} anggota dimuat.`);
            } else { showNotification("File CSV tidak berisi data yang valid."); }
        } catch (e) { showNotification("Gagal memproses file."); } 
        finally { document.getElementById('csvFile').value = ''; }
    };
    reader.readAsText(file);
}

// --- SEARCH FUNCTIONS ---
function populateDateFilters() {
    const daySelect = document.getElementById('searchDay'), monthSelect = document.getElementById('searchMonth'), yearSelect = document.getElementById('searchYear');
    for (let i = 1; i <= 31; i++) daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    months.forEach((month, i) => monthSelect.innerHTML += `<option value="${i + 1}">${month}</option>`);
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 10; i--) yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
}

function searchMembers() {
    const searchTerm = document.getElementById('searchTerm').value.toLowerCase();
    const day = document.getElementById('searchDay').value, month = document.getElementById('searchMonth').value, year = document.getElementById('searchYear').value;
    const results = loadMembers().filter(member => {
        const matchesSearchTerm = searchTerm === '' || member.name.toLowerCase().includes(searchTerm) || member.uid.toLowerCase().includes(searchTerm);
        let matchesDate = true;
        if (day || month || year) {
            if (!member.joinDate) return false;
            const joinDate = new Date(member.joinDate);
            matchesDate = (!day || joinDate.getDate() == day) && (!month || (joinDate.getMonth() + 1) == month) && (!year || joinDate.getFullYear() == year);
        }
        return matchesSearchTerm && matchesDate;
    });
    displaySearchResults(results.reverse());
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResultsContainer');
    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Tidak ada anggota ditemukan.</p>';
        return;
    }
    let html = `<h4>Hasil (${results.length})</h4>
                <table class="results-table"><thead><tr><th>Nama</th><th>UID</th><th>Upline</th><th>Tgl Gabung</th><th>Aksi</th></tr></thead><tbody>`;
    results.forEach(member => {
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID') : 'N/A';
        html += `<tr>
                    <td>${member.name}</td><td>${member.uid}</td><td>${member.upline || '-'}</td><td>${joinDate}</td>
                    <td>
                        <button class="btn-edit" onclick="openEditModal('${member.uid}')">Edit</button>
                        <button class="btn-delete" onclick="openConfirmModal('${member.uid}')">Hapus</button>
                        <button onclick="sessionStorage.setItem('focusedMemberUid', '${member.uid}'); window.location.href='network.html';">Lihat Jaringan</button>
                    </td></tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function resetSearch() {
    document.getElementById('searchTerm').value = '';
    document.getElementById('searchDay').value = '';
    document.getElementById('searchMonth').value = '';
    document.getElementById('searchYear').value = '';
    document.getElementById('searchResultsContainer').innerHTML = '';
}

// --- FUNGSI BARU UNTUK DAFTAR ANGGOTA & SORTING ---
function showMainDashboard() {
    document.getElementById('mainDashboardContent').style.display = 'block';
    document.getElementById('memberListContainer').style.display = 'none';
}

function showMemberList() {
    document.getElementById('mainDashboardContent').style.display = 'none';
    document.getElementById('memberListContainer').style.display = 'block';
    renderMemberList(); 
}

function setupTableSorting() {
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

function renderMemberList() {
    const members = loadMembers();
    const tbody = document.getElementById('memberListTableBody');
    tbody.innerHTML = ''; 
    
    let sortedMembers = [];
    
    if (memberListSortColumn === 'no') {
        sortedMembers = members.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
        if (memberListSortDirection === 'desc') {
            sortedMembers.reverse();
        }
    } else {
        sortedMembers = members.sort((a, b) => {
            let valA, valB;
            switch (memberListSortColumn) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 'uid':
                    valA = a.uid.toLowerCase();
                    valB = b.uid.toLowerCase();
                    break;
                case 'upline':
                    valA = (a.upline || '').toLowerCase(); 
                    valB = (b.upline || '').toLowerCase();
                    break;
                case 'joinDate':
                default:
                    valA = new Date(a.joinDate);
                    valB = new Date(b.joinDate);
                    break;
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
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID') : 'N/A';
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.uid}</td>
                <td>${member.upline || '-'}</td>
                <td>${joinDate}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
// --- AKHIR FUNGSI BARU ---


// --- GROWTH CHART FUNCTION ---
function renderGrowthChart() {
    const members = loadMembers();
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (growthChart) growthChart.destroy();
    if (members.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.font = '16px Arial';
        ctx.fillText('Belum ada data untuk ditampilkan', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    members.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
    const periods = {};
    const firstDate = new Date(members[0].joinDate);
    const lastDate = new Date();
    let currentDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    while (currentDate <= lastDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        periods[`${year}-${month}-P1`] = 0;
        periods[`${year}-${month}-P2`] = 0;
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    members.forEach(member => {
        const joinDate = new Date(member.joinDate);
        const key = `${joinDate.getFullYear()}-${joinDate.getMonth() + 1}-${joinDate.getDate() <= 15 ? 'P1' : 'P2'}`;
        if (periods.hasOwnProperty(key)) periods[key]++;
    });
    const labels = [];
    const periodData = [];
    Object.keys(periods).forEach(key => {
        const [year, month, period] = key.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('id-ID', { month: 'short' });
        labels.push(`${monthName} ${year} (${period})`);
        periodData.push(periods[key]);
    });
    const numPeriodsToShow = parseInt(document.getElementById('chartPeriodSelector').value, 10);
    const finalLabels = numPeriodsToShow > 0 ? labels.slice(-numPeriodsToShow) : labels;
    const finalData = numPeriodsToShow > 0 ? periodData.slice(-numPeriodsToShow) : periodData;
    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: finalLabels,
            datasets: [{
                label: 'Anggota Baru per Periode',
                data: finalData,
                backgroundColor: 'rgba(255, 215, 0, 0.7)',
                borderColor: 'rgba(255, 215, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#ccc', stepSize: 1 }, grid: { color: '#444' }},
                x: { ticks: { color: '#ccc' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#000',
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 },
                    displayColors: false,
                    callbacks: {
                        label: context => 'Anggota Baru: ' + context.parsed.y
                    }
                }
            }
        }
    });
}

// --- NETWORK VISUALIZATION (STABLE VERSION) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 20 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center
    });

    const members = loadMembers();
    if (members.length === 0) {
        diagram.model = new go.GraphLinksModel([], []);
        return; 
    }
    
    const downlineCounts = {};
    members.forEach(m => { downlineCounts[m.uid] = 0; });
    members.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    diagram.nodeTemplate =
        $(go.Node, "Horizontal", { selectionObjectName: "PANEL" },
            $(go.Panel, "Auto", { name: "PANEL" },
                $(go.Shape, "RoundedRectangle", { strokeWidth: 2 },
                    new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "gold" : "white"),
                    new go.Binding("fill", "key", key => (downlineCounts[key] || 0) >= 5 ? "#1a1a1a" : "#111")
                ),
                $(go.TextBlock, { margin: 10, font: "bold 14px sans-serif", textAlign: "center" },
                    new go.Binding("stroke", "key", key => (downlineCounts[key] || 0) >= 5 ? "gold" : "white"),
                    new go.Binding("text", "label")
                )
            ),
            $("TreeExpanderButton",
                { margin: new go.Margin(6, 6, 6, 2), width: 20, height: 20, "ButtonBorder.fill": "white" },
                { "_treeExpandedFigure": "MinusLine", "_treeCollapsedFigure": "PlusLine" }
            )
        );

    diagram.linkTemplate =
        $(go.Link, { routing: go.Link.Orthogonal, fromSpot: go.Spot.Right, toSpot: go.Spot.Left, corner: 10 },
            $(go.Shape, { strokeWidth: 2 },
                new go.Binding("stroke", "from", fromKey => (downlineCounts[fromKey] || 0) >= 5 ? "gold" : "white")
            )
        );
        
    const nodes = members.map(m => ({ key: m.uid, label: `${m.name}\n(UID: ${m.uid})` }));
    const links = members.filter(m => m.upline && members.some(u => u.uid === m.upline)).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);

    const focusedMemberUid = sessionStorage.getItem('focusedMemberUid');
    if (focusedMemberUid) {
        const node = diagram.findNodeForKey(focusedMemberUid);
        if (node) {
            diagram.centerRect(node.actualBounds);
            diagram.scale = 1.0;
            node.isSelected = true;
        }
        sessionStorage.removeItem('focusedMemberUid');
    }
}
