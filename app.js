/**
 * =========================================================================
 * WEDDING PLAN: FRONTEND JAVASCRIPT LOGIC (APP.JS)
 * =========================================================================
 */

// GANTI URL INI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA SAAT DI-DEPLOY NANTI
const GAS_API_URL = "https://script.google.com/macros/s/AKfycby_PASTIKAN_ANDA_MENGGANTI_INI_DENGAN_URL_GAS_YANG_BARU/exec";

// Global Application Data Configuration
let AppData = {
    settings: {
        AppTitle: "Wedding Plan",
        TargetDate: "2026-06-04T23:59:00",
        TargetTabungan: 150000000
    },
    users: [],
    todos: [],
    tabungan: [],
    currentUser: null
};

// =========================================================================
// 1. SYSTEM INITIALIZATION & API FETCHING
// =========================================================================

/**
 * Universal API Fetch Wrapper untuk Post ke GAS Web App
 */
async function fetchGasAPI(action, payload = {}) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: action,
                payload: payload,
                ...payload // spreading ID and status for specific endpoints
            }),
            // mode: 'no-cors' -> JANGAN GUNAKAN no-cors JIKA BUTUH BACA RESPONSE JSON
            // Pastikan GAS Web App di Deploy "Anyone"
        });

        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || "Unknown API Error");
        }
        return result.data;
    } catch (err) {
        console.error("fetchGasAPI Error:", err);
        throw err;
    }
}

// Global Init Load
async function initApp() {
    try {
        // Fetch All App Data from Gas API
        const data = await fetchGasAPI("getAppData");
        AppData = data;

        // Cek LocalStorage Session
        const sessionString = localStorage.getItem('weddingPlanSession');
        if (sessionString) {
            const session = JSON.parse(sessionString);
            const user = AppData.users.find(u => u.id === session.id);
            if (user) {
                AppData.currentUser = user;
                performLogin();
                return;
            } else {
                localStorage.removeItem('weddingPlanSession'); // stale session
            }
        }

        // Kalau belum login, render daftar user di login screen
        renderUserLoginList();
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');

    } catch (err) {
        document.getElementById('loaderSub').innerText = "Gagal memuat aplikasi. Pastikan koneksi dan URL API GAS benar.";
        document.getElementById('loaderTitle').innerText = "Error API";
        console.error(err);
        // Fallback or retry logic here could be added
    }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// =========================================================================
// 2. LOGIN SYSTEM
// =========================================================================
let selectedUserForLogin = null;

function renderUserLoginList() {
    const container = document.getElementById('userListContainer');
    container.innerHTML = '';
    AppData.users.forEach(user => {
        container.innerHTML += `
            <button onclick="selectUser('${user.id}')" 
                class="flex items-center gap-4 w-full p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined">${user.role === 'admin' ? 'manage_accounts' : 'person'}</span>
                </div>
                <div class="text-left">
                    <h3 class="font-bold text-gray-900 dark:text-white text-lg">${user.nama}</h3>
                    <p class="text-xs text-gray-500">${user.role === 'admin' ? 'Akses Penuh' : 'Akses Terbatas'}</p>
                </div>
                <span class="material-symbols-outlined ml-auto text-gray-400 group-hover:text-primary transition-colors">chevron_right</span>
            </button>
        `;
    });
}

function selectUser(userId) {
    selectedUserForLogin = AppData.users.find(u => u.id === userId);
    document.getElementById('userListContainer').classList.add('hidden');
    document.getElementById('pinContainer').classList.remove('hidden');
    document.getElementById('pinInput').focus();
}

function cancelLogin() {
    selectedUserForLogin = null;
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').classList.add('hidden');
    document.getElementById('userListContainer').classList.remove('hidden');
    document.getElementById('pinContainer').classList.add('hidden');
}

function verifyPin() {
    const pin = document.getElementById('pinInput').value;
    if (pin === selectedUserForLogin.pin) {
        AppData.currentUser = selectedUserForLogin;
        localStorage.setItem('weddingPlanSession', JSON.stringify({
            id: selectedUserForLogin.id,
            timestamp: new Date().getTime()
        }));
        performLogin();
    } else {
        document.getElementById('pinError').classList.remove('hidden');
        document.getElementById('pinInput').value = '';
        document.getElementById('pinInput').focus();
    }
}

function performLogin() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('loader').classList.add('hidden');

    // Set UI User
    document.getElementById('currentUserLabel').innerText = AppData.currentUser.nama;

    // Set UI Settings visibility based on Role
    if (AppData.currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }

    // Set Header/Titles (Config from API)
    document.title = AppData.settings.AppTitle || 'Wedding Plan';
    document.getElementById('headerAppName').innerText = AppData.settings.AppTitle || 'Wedding Plan';

    // RENDER COMPONENTS
    initCountDown();
    renderTodos();
    renderTabungan();
    renderKalender();

    // Reset Pin forms incase logged out
    document.getElementById('pinContainer').classList.add('hidden');
    document.getElementById('userListContainer').classList.remove('hidden');
    document.getElementById('pinError').classList.add('hidden');
    document.getElementById('pinInput').value = '';
}

function logout() {
    localStorage.removeItem('weddingPlanSession');
    AppData.currentUser = null;
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    navigate('beranda'); // reset page state
}


// =========================================================================
// 3. SPA ROUTING
// =========================================================================
function navigate(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none'; // Ensure CSS hide
    });

    // Show request page
    const pageTarget = document.getElementById('page-' + pageId);
    if (pageTarget) {
        pageTarget.classList.add('active');
        pageTarget.style.display = 'block';
        pageTarget.classList.add('fade-in'); // Add animation
    }

    // Update active state in nav bars (Desktop)
    document.querySelectorAll('.nav-button').forEach(el => {
        el.classList.remove('active', 'text-primary'); // basic
        if (el.id !== 'nav-' + pageId) el.classList.add('text-gray-900', 'dark:text-gray-200');
    });
    const desktopNav = document.getElementById('nav-' + pageId);
    if (desktopNav) {
        desktopNav.classList.add('active', 'text-primary');
        desktopNav.classList.remove('text-gray-900', 'dark:text-gray-200');
    }

    // Update active state in nav bars (Mobile Bottom Nav)
    document.querySelectorAll('.mobile-nav-button').forEach(el => {
        el.classList.remove('text-primary');
        el.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    const mobileNav = document.getElementById('mobile-nav-' + pageId);
    if (mobileNav) {
        mobileNav.classList.remove('text-gray-500', 'dark:text-gray-400');
        mobileNav.classList.add('text-primary');
    }

    // Specific on-load triggers
    if (pageId === 'setting') {
        renderSetting();
    }

    // scroll top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// =========================================================================
// 4. UTILITY FORMATTERS
// =========================================================================
function formatRupiah(angka) {
    const number = parseFloat(angka);
    if (isNaN(number)) return "Rp 0";
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(number);
}

function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('id-ID', options).format(date);
}


// =========================================================================
// 5. BERANDA (COUNTDOWN & DASHBOARD STATS)
// =========================================================================
let countdownInterval;

function initCountDown() {
    if (countdownInterval) clearInterval(countdownInterval);

    const targetDateStr = AppData.settings.TargetDate; // e.g., "2026-06-04T23:59:00"
    if (!targetDateStr) return;

    const targetDate = new Date(targetDateStr).getTime();

    // Update Display Date Format for header
    const dObj = new Date(targetDateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('berandaTargetDateDisplay').innerText = dObj.toLocaleDateString('id-ID', options);

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("cd-hari").innerText = "0";
            document.getElementById("cd-jam").innerText = "0";
            document.getElementById("cd-menit").innerText = "0";
            document.getElementById("cd-detik").innerText = "0";
            document.getElementById('berandaTargetDateDisplay').innerText = "Hari Bahagia Telah Tiba!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("cd-hari").innerText = days;
        document.getElementById("cd-jam").innerText = hours.toString().padStart(2, '0');
        document.getElementById("cd-menit").innerText = minutes.toString().padStart(2, '0');
        document.getElementById("cd-detik").innerText = seconds.toString().padStart(2, '0');
    }, 1000);

    // Populate mini lists
    populateBerandaTodoList();
    populateBerandaTabungan();
}

function populateBerandaTodoList() {
    const list = document.getElementById('berandaTodoList');
    list.innerHTML = '';

    if (!AppData.todos) return;

    // Highest priority / shortest deadline first, not done
    let pending = AppData.todos.filter(t => t.status === 'Belum Selesai');
    pending.sort((a, b) => {
        if (a.prioritas === 'Tinggi' && b.prioritas !== 'Tinggi') return -1;
        if (b.prioritas === 'Tinggi' && a.prioritas !== 'Tinggi') return 1;

        let d1 = a.deadline ? new Date(a.deadline).getTime() : 9999999999999;
        let d2 = b.deadline ? new Date(b.deadline).getTime() : 9999999999999;
        return d1 - d2;
    });

    const topPending = pending.slice(0, 3);

    if (topPending.length === 0) {
        list.innerHTML = `<p class="text-sm text-gray-500 italic">Semua tugas beres! Mantap.</p>`;
        return;
    }

    topPending.forEach(t => {
        const dStr = t.deadline ? formatDateIndo(t.deadline) : 'Tanpa Tenggat';
        let badge = '';
        if (t.prioritas === 'Tinggi') {
            badge = `<span class="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] sm:text-xs px-2 py-0.5 rounded font-bold uppercase">Penting</span>`;
        }

        list.innerHTML += `
             <div class="flex items-start gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                <div class="mt-0.5 sm:mt-1 h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                   <div class="flex flex-wrap items-center gap-2 mb-1">
                       <p class="text-sm font-bold text-gray-800 dark:text-white truncate" title="${t.tugas}">${t.tugas}</p>
                       ${badge}
                   </div>
                   <p class="text-[10px] sm:text-xs text-gray-500 truncate flex items-center gap-1">
                       <span class="material-symbols-outlined text-[12px] sm:text-[14px]">event</span> ${dStr}
                       <span class="mx-1">•</span> ${t.penanggungJawab}
                   </p>
                </div>
            </div>
        `;
    });
}

function populateBerandaTabungan() {
    const target = parseFloat(AppData.settings.TargetTabungan) || 0;
    let terkumpul = 0;

    if (AppData.tabungan) {
        AppData.tabungan.forEach(t => {
            terkumpul += parseFloat(t.nominal) || 0;
        });
    }

    const persen = target > 0 ? Math.min(100, Math.round((terkumpul / target) * 100)) : 0;

    document.getElementById('berandaTabunganStatus').innerText = persen >= 100 ? 'Tercapai 🎉' : 'On Track';
    if (persen >= 100) {
        document.getElementById('berandaTabunganStatus').classList.remove('bg-primary/10', 'text-primary');
        document.getElementById('berandaTabunganStatus').classList.add('bg-green-100', 'text-green-600', 'dark:bg-green-900/30', 'dark:text-green-400');
    }

    document.getElementById('berandaTabunganPersen').innerText = `${persen}%`;
    document.getElementById('berandaTabunganTerkumpul').innerText = formatRupiah(terkumpul);

    setTimeout(() => {
        document.getElementById('berandaTabunganBar').style.width = persen + '%';
    }, 500);
}


// =========================================================================
// 6. TODO LIST MODULE
// =========================================================================
let currentTodoFilter = 'Semua';

function renderTodos() {
    const container = document.getElementById('todoListContainer');
    container.innerHTML = '';

    if (!AppData.todos || AppData.todos.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500 text-sm">Belum ada tugas. Tekan 'Tugas Baru'.</div>`;
        return;
    }

    // Filter Logic
    let filteredList = AppData.todos;
    if (currentTodoFilter === 'Belum Selesai') {
        filteredList = AppData.todos.filter(x => x.status === 'Belum Selesai');
    } else if (currentTodoFilter === 'Selesai') {
        filteredList = AppData.todos.filter(x => x.status === 'Selesai');
    } else if (currentTodoFilter === 'Prioritas Tinggi') {
        filteredList = AppData.todos.filter(x => x.prioritas === 'Tinggi' && x.status === 'Belum Selesai');
    }

    if (filteredList.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500 text-sm">Tidak ada tugas di kategori ini.</div>`;
        return;
    }

    // Sort by Date
    filteredList.sort((a, b) => {
        let d1 = a.deadline ? new Date(a.deadline).getTime() : 9999999999999;
        let d2 = b.deadline ? new Date(b.deadline).getTime() : 9999999999999;
        return d1 - d2;
    });

    filteredList.forEach(item => {
        const isDone = item.status === 'Selesai';
        const dStr = item.deadline ? formatDateIndo(item.deadline) : 'Tanpa Tenggat';

        let priorityPill = '';
        if (item.prioritas === 'Tinggi') {
            priorityPill = `<span class="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/20 px-2 py-1 text-[10px] sm:text-xs font-bold text-red-600 ring-1 ring-inset ring-red-500/10"><span class="material-symbols-outlined text-[12px] sm:text-[14px] mr-1">warning</span>Penting</span>`;
        }

        let adminActions = '';
        if (AppData.currentUser && AppData.currentUser.role === 'admin') {
            adminActions = `
                <div class="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1 rounded-lg">
                    <button onclick="editTodo('${item.id}')" title="Edit" class="p-1 sm:p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"><span class="material-symbols-outlined text-[16px] sm:text-[18px]">edit</span></button>
                    <button onclick="deleteTodo('${item.id}')" title="Hapus" class="p-1 sm:p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"><span class="material-symbols-outlined text-[16px] sm:text-[18px]">delete</span></button>
                </div>
            `;
        }

        const picColor = getPicColor(item.penanggungJawab);

        container.innerHTML += `
            <div class="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative" onclick="toggleTodoStatus('${item.id}', '${item.status}')">
                <div class="mt-0.5 sm:mt-1 relative flex items-center justify-center shrink-0">
                    <div class="h-5 w-5 sm:h-6 sm:w-6 rounded border-2 ${isDone ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center transition-colors">
                        ${isDone ? '<span class="material-symbols-outlined text-white text-[16px] sm:text-[18px] animate-check">check</span>' : ''}
                    </div>
                </div>
                
                <div class="flex-1 min-w-0 pr-12 sm:pr-24">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
                        <span class="text-xs font-bold text-primary uppercase tracking-wider">${item.kategori}</span>
                        ${priorityPill}
                    </div>
                    
                    <p class="text-sm sm:text-base font-bold ${isDone ? 'text-gray-400 dark:text-gray-500 todo-text-strike' : 'text-gray-800 dark:text-gray-100 todo-text-nostrike'} leading-snug mb-2 transition-colors break-words">
                        ${item.tugas}
                    </p>
                    
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 flex-row">
                        <span class="inline-flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <span class="material-symbols-outlined text-[14px] sm:text-[16px]">calendar_today</span> ${dStr}
                        </span>
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold border ${picColor}">
                            PIC: ${item.penanggungJawab}
                        </span>
                    </div>
                </div>

                <div class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-2" onclick="event.stopPropagation()">
                    ${adminActions}
                </div>
            </div>
        `;
    });
}

function getPicColor(pic) {
    if (pic === 'Ojan') return 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:bg-blue-900/30';
    if (pic === 'Juju') return 'border-pink-200 text-pink-700 bg-pink-50 dark:border-pink-900 dark:text-pink-300 dark:bg-pink-900/30';
    if (pic === 'Bersama') return 'border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-900 dark:text-purple-300 dark:bg-purple-900/30';
    return 'border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800';
}

function filterTodos(filter) {
    currentTodoFilter = filter;
    document.querySelectorAll('.todo-filter').forEach(btn => {
        btn.classList.remove('border-primary', 'text-gray-900', 'dark:text-white', 'border-b-2');
        btn.classList.add('border-transparent', 'border-b-2');
    });

    // Parse ID from filter
    let btnId = 'filter-' + filter.split(' ')[0]; // Handle 'Prioritas Tinggi' -> 'filter-Prioritas'
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.remove('border-transparent');
        btn.classList.add('border-primary', 'text-gray-900', 'dark:text-white');
    }

    renderTodos();
}

function openTodoModal() {
    if (!AppData.currentUser || AppData.currentUser.role !== 'admin') return alert("Hanya admin yang dapat menambah/mengedit tugas.");
    document.getElementById('todoForm').reset();
    document.getElementById('todoId').value = '';
    document.getElementById('todoModalTitle').innerText = 'Tambah Tugas';
    document.getElementById('todoModal').classList.remove('hidden');
}

function closeTodoModal() {
    document.getElementById('todoModal').classList.add('hidden');
}

async function submitTodoForm() {
    const payload = {
        id: document.getElementById('todoId').value,
        kategori: document.getElementById('todoKategori').value,
        tugas: document.getElementById('todoTugas').value,
        penanggungJawab: document.getElementById('todoPIC').value,
        deadline: document.getElementById('todoDeadline').value,
        prioritas: document.querySelector('input[name="todoPrioritas"]:checked').value
    };

    if (!payload.tugas) return alert("Peringatan: Nama Tugas harus diisi!");

    document.getElementById('loader').classList.remove('hidden');

    try {
        await fetchGasAPI("saveTodo", payload);
        // Refresh DB
        AppData = await fetchGasAPI("getAppData");

        closeTodoModal();
        renderTodos();
        populateBerandaTodoList();
        document.getElementById('loader').classList.add('hidden');
    } catch (err) {
        alert("Gagal menyimpan tugas: " + err.message);
        document.getElementById('loader').classList.add('hidden');
    }
}

async function toggleTodoStatus(id, currentStatus) {
    if (!AppData.currentUser || AppData.currentUser.role !== 'admin') return alert("Akses Ditolak: Hanya Admin.");

    const newStatus = currentStatus === 'Selesai' ? 'Belum Selesai' : 'Selesai';

    // Optimistic UI updates
    const itemA = AppData.todos.find(x => x.id === id);
    if (itemA) itemA.status = newStatus;
    renderTodos();
    if (typeof renderKalender === 'function') renderKalender(); // update kalender log

    try {
        await fetchGasAPI("toggleTodoStatus", { id: id, statusTarget: newStatus });
        // Background silent refresh
        fetchGasAPI("getAppData").then(res => { AppData = res; });
    } catch {
        // Revert on fail
        const itemR = AppData.todos.find(x => x.id === id);
        if (itemR) itemR.status = currentStatus;
        renderTodos();
        alert("Gagal update status koneksi.");
    }
}

async function deleteTodo(id) {
    if (!confirm("Yakin ingin menghapus tugas ini secara permanen?")) return;
    document.getElementById('loader').classList.remove('hidden');

    try {
        await fetchGasAPI("deleteTodo", { id: id });
        AppData = await fetchGasAPI("getAppData");

        renderTodos();
        populateBerandaTodoList();
        document.getElementById('loader').classList.add('hidden');
    } catch (err) {
        alert("Gagal menghapus tugas.");
        document.getElementById('loader').classList.add('hidden');
    }
}

function editTodo(id) {
    const item = AppData.todos.find(x => x.id === id);
    if (!item) return;

    document.getElementById('todoId').value = item.id;
    document.getElementById('todoKategori').value = item.kategori;
    document.getElementById('todoTugas').value = item.tugas;
    document.getElementById('todoPIC').value = item.penanggungJawab;
    document.getElementById('todoDeadline').value = item.deadline ? item.deadline.substring(0, 10) : '';

    document.querySelectorAll('input[name="todoPrioritas"]').forEach(r => {
        if (r.value === item.prioritas) r.checked = true;
    });

    document.getElementById('todoModalTitle').innerText = 'Edit Tugas';
    document.getElementById('todoModal').classList.remove('hidden');
}


// =========================================================================
// 7. KALENDER COMPONENT (LOG HISTORY)
// =========================================================================
function renderKalender() {
    const container = document.getElementById('kalenderListContainer');
    container.innerHTML = '';

    let doneTodos = AppData.todos.filter(x => x.status === 'Selesai');

    if (doneTodos.length === 0) {
        container.innerHTML = `
        <div class="py-12 text-center flex flex-col items-center gap-3">
            <div class="h-16 w-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                <span class="material-symbols-outlined text-3xl">event_available</span>
            </div>
            <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">Belum Ada Riwayat</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm max-w-sm">Tugas ToDo List yang telah ditandai Selesai akan muncul di sini sebagai rekam jejak persiapan acara.</p>
        </div>`;
        return;
    }

    let htmlContent = '<div class="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">';

    doneTodos.forEach(item => {
        const picColor = getPicColor(item.penanggungJawab);
        htmlContent += `
         <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div class="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-primary/20 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 backdrop-blur-sm">
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
            <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md">
                <div class="flex items-center justify-between space-x-2 mb-1">
                    <div class="font-bold text-gray-900 dark:text-white text-sm">${item.tugas}</div>
                    <span class="text-[10px] uppercase font-bold text-green-600 dark:text-green-400 flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">done_all</span> Selesai</span>
                </div>
                <div class="text-xs text-gray-500 mb-2">Kategori: <span class="font-medium text-gray-700 dark:text-gray-300">${item.kategori}</span></div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${picColor}">Oleh ${item.penanggungJawab}</span>
                </div>
            </div>
        </div>`;
    });

    htmlContent += '</div>';
    container.innerHTML = htmlContent;
}


// =========================================================================
// 8. TABUNGAN COMPONENT
// =========================================================================
function renderTabungan() {
    populateTabunganStats();
    populateTabunganList();
}

function populateTabunganStats() {
    const target = parseFloat(AppData.settings.TargetTabungan) || 0;
    let terkumpul = 0;

    if (AppData.tabungan) {
        AppData.tabungan.forEach(t => {
            terkumpul += parseFloat(t.nominal) || 0;
        });
    }

    const kurang = target - terkumpul;
    const persen = target > 0 ? Math.min(100, Math.round((terkumpul / target) * 100)) : 0;

    document.getElementById('tabunganTargetDisplay').innerText = `Target: ${formatRupiah(target)}`;
    document.getElementById('tabunganTotal').innerText = formatRupiah(terkumpul);
    document.getElementById('tabunganProgressTxt').innerText = `${persen}% Tercapai`;

    if (kurang <= 0) {
        document.getElementById('tabunganKurangTxt').innerText = "Target Telah Terpenuhi!";
        document.getElementById('tabunganKurangTxt').classList.replace("text-primary", "text-green-500");
    } else {
        document.getElementById('tabunganKurangTxt').innerText = `Kurang: ${formatRupiah(kurang)}`;
    }

    setTimeout(() => {
        document.getElementById('tabunganProgressBar').style.width = persen + '%';
    }, 500);
}

function populateTabunganList() {
    const container = document.getElementById('tabunganListWrapper');
    container.innerHTML = '';

    if (!AppData.tabungan || AppData.tabungan.length === 0) {
        container.innerHTML = `<div class="py-10 text-center text-gray-400 font-medium text-sm">Belum ada penyetoran. Mulai menabung!</div>`;
        return;
    }

    const sortedData = [...AppData.tabungan].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    sortedData.forEach(item => {
        let icon = 'account_balance_wallet';
        if (item.penyetor.includes('Hadiah')) icon = 'redeem';
        else if (item.penyetor === 'Tabungan Bersama') icon = 'savings';

        const dateStr = item.tanggal ? formatDateIndo(item.tanggal) : '';

        let photoBtnHtml = '';
        if (item.bukti) {
            photoBtnHtml = `<button onclick="viewFoto('${item.bukti}')" title="Lihat Bukti" class="text-[10px] sm:text-xs text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded font-bold flex items-center gap-1 mt-2 w-max transition-colors">
                    <span class="material-symbols-outlined text-[14px]">image</span> Bukti
                </button>`;
        }

        let adminActions = '';
        if (AppData.currentUser && AppData.currentUser.role === 'admin') {
            adminActions = `<div class="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 items-end pt-1">
                 <button onclick="editTabunganItem('${item.id}')" title="Edit" class="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded-md transition-colors"><span class="material-symbols-outlined text-[16px]">edit</span></button>
                 <button onclick="deleteTabunganItem('${item.id}')" title="Hapus" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded-md transition-colors"><span class="material-symbols-outlined text-[16px]">delete</span></button>
            </div>`;
        }

        container.innerHTML += `
         <div class="group flex items-start justify-between p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-100 dark:border-gray-700 hover:border-primary/20 transition-all shadow-sm">
            <div class="flex items-start gap-3 sm:gap-4 flex-1">
                <div class="mt-1 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                    <span class="material-symbols-outlined text-[18px] sm:text-[24px]">${icon}</span>
                </div>
                <div class="flex-1">
                    <p class="font-bold text-gray-900 dark:text-white capitalize text-xs sm:text-sm line-clamp-2">${item.keterangan || 'Setoran'}</p>
                    <div class="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                        <span>${dateStr}</span>
                        <span class="w-1 h-1 rounded-full bg-primary/40 text-[0px] hidden sm:block">•</span>
                        <span class="font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">${item.penyetor}</span>
                    </div>
                    ${photoBtnHtml}
                </div>
            </div>
            <div class="flex items-start gap-2 sm:gap-3">
                <div class="text-right">
                    <span class="font-bold text-primary-dark dark:text-primary text-xs sm:text-base block tracking-tight">+${formatRupiah(item.nominal)}</span>
                </div>
                ${adminActions}
            </div>
         </div>
        `;
    });
}

function processFile(event) {
    const file = event.target.files[0];
    if (!file) return clearFile();

    if (file.size > 500 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 500kb.");
        return clearFile();
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const dataURL = e.target.result;
        document.getElementById('tabunganBase64').value = dataURL;
        document.getElementById('filePreviewImg').src = dataURL;
        document.getElementById('filePreviewContainer').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearFile() {
    document.getElementById('tabunganFileInput').value = '';
    document.getElementById('tabunganBase64').value = '';
    document.getElementById('filePreviewContainer').classList.add('hidden');
    document.getElementById('filePreviewImg').src = '';
}

function viewFoto(base64Str) {
    document.getElementById('fotoModalImg').src = base64Str;
    document.getElementById('fotoModal').classList.remove('hidden');
}

async function submitTabunganForm() {
    const payload = {
        id: document.getElementById('tabunganId').value,
        nominal: document.getElementById('tabunganNominal').value,
        tanggal: document.getElementById('tabunganTanggal').value,
        penyetor: document.getElementById('tabunganPenyetor').value,
        keterangan: document.getElementById('tabunganKeterangan').value,
        bukti: document.getElementById('tabunganBase64').value
    };

    if (!payload.nominal || !payload.tanggal) return alert("Peringatan: Nominal dan Tanggal wajib diisi!");

    document.getElementById('loader').classList.remove('hidden');

    try {
        await fetchGasAPI("saveTabungan", payload);
        AppData = await fetchGasAPI("getAppData");

        resetTabunganForm();
        renderTabungan();
        populateBerandaTabungan();
        document.getElementById('loader').classList.add('hidden');
    } catch (err) {
        alert("Gagal menyimpan data tabungan: " + err.message);
        document.getElementById('loader').classList.add('hidden');
    }
}

async function deleteTabunganItem(id) {
    if (!confirm("Yakin ingin menghapus setoran ini?")) return;
    document.getElementById('loader').classList.remove('hidden');

    try {
        await fetchGasAPI("deleteTabungan", { id: id });
        AppData = await fetchGasAPI("getAppData");

        renderTabungan();
        populateBerandaTabungan();
        document.getElementById('loader').classList.add('hidden');
    } catch (err) {
        alert("Gagal menghapus data tabungan.");
        document.getElementById('loader').classList.add('hidden');
    }
}

function editTabunganItem(id) {
    const item = AppData.tabungan.find(x => x.id === id);
    if (!item) return;

    document.getElementById('tabunganId').value = item.id;
    document.getElementById('tabunganNominal').value = item.nominal;
    document.getElementById('tabunganTanggal').value = item.tanggal ? item.tanggal.substring(0, 10) : '';
    document.getElementById('tabunganPenyetor').value = item.penyetor;
    document.getElementById('tabunganKeterangan').value = item.keterangan;

    document.getElementById('btnBatalEditTabungan').classList.remove('hidden');
    document.getElementById('btnBatalEditTabungan').classList.replace('hidden', 'block');
    document.getElementById('btnSimpanTabungan').innerHTML = 'Perbarui';
    clearFile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetTabunganForm() {
    document.getElementById('tabunganForm').reset();
    document.getElementById('tabunganId').value = '';
    clearFile();

    document.getElementById('btnBatalEditTabungan').classList.add('hidden');
    document.getElementById('btnSimpanTabungan').innerHTML = 'Simpan';
}


// =========================================================================
// 9. SETTINGS COMPONENT
// =========================================================================
function renderSetting() {
    if (!AppData || !AppData.settings) return;

    document.getElementById('setAppTitle').value = AppData.settings.AppTitle || '';
    document.getElementById('setTargetTabungan').value = AppData.settings.TargetTabungan || '';

    if (AppData.settings.TargetDate) {
        let d = AppData.settings.TargetDate;
        if (d.length > 16) d = d.substring(0, 16);
        document.getElementById('setTargetDate').value = d;
    }
}

async function submitSettings() {
    const payload = {
        AppTitle: document.getElementById('setAppTitle').value,
        TargetDate: document.getElementById('setTargetDate').value,
        TargetTabungan: document.getElementById('setTargetTabungan').value
    };

    if (!payload.TargetDate || !payload.TargetTabungan) return alert("Waktu dan Target Tabungan harus diisi!");

    document.getElementById('loader').classList.remove('hidden');

    try {
        await fetchGasAPI("saveSettings", payload);
        AppData = await fetchGasAPI("getAppData");

        document.title = AppData.settings.AppTitle;
        document.getElementById('headerAppName').innerText = AppData.settings.AppTitle;
        initCountDown();
        populateTabunganStats();

        document.getElementById('loader').classList.add('hidden');
        alert("Pengaturan berhasil disimpan!");
        navigate('beranda');
    } catch (err) {
        alert("Gagal menyimpan pengaturan: " + err.message);
        document.getElementById('loader').classList.add('hidden');
    }
}


// =========================================================================
// 10. PROGRESSIVE WEB APP (PWA) SERVICE WORKER & UI PROMPT
// =========================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('ServiceWorker registered:', reg.scope))
            .catch(err => console.log('ServiceWorker error:', err));
    });
}

let deferredPrompt;
const pwaBanner = document.getElementById('pwa-install-banner');
const pwaBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show custom prompt banner
    pwaBanner.classList.remove('hidden');
});

pwaBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        pwaBanner.classList.add('hidden');
    }
});

// Hide install banner if successfully installed
window.addEventListener('appinstalled', () => {
    pwaBanner.classList.add('hidden');
    deferredPrompt = null;
    console.log('PWA was installed');
});

// Also hide banner if already standalone
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    pwaBanner.classList.add('hidden');
}
