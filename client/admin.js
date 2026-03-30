import { apiCall, showNotice, updateNav } from './utils.js';

const currentUser = JSON.parse(sessionStorage.getItem('user'));
const navActions = document.getElementById('nav-actions');
let map = null;
let markers = [];
let heatLayer = null;
let selectedAlertId = null;
let lastAlertUserId = null;

if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'index.html';
}

updateNav(currentUser, navActions);

// New UI Elements
const dispatchCard = document.getElementById('selected-dispatch-card');
const selectedUsername = document.getElementById('selected-username');
const selectedPhone = document.getElementById('selected-phone');
const selectedEmail = document.getElementById('selected-email');
const selectedCoords = document.getElementById('selected-coords');
const selectedSyncTime = document.getElementById('selected-time');
const dispatchBtn = document.getElementById('dispatch-patrol-btn-new');
const contactBtn = document.getElementById('call-contacts-btn-new');

// Register Dispatch Listeners 
if (dispatchBtn) dispatchBtn.addEventListener('click', () => {
    if (!selectedAlertId) return showNotice('Select an active tracking target first.', 'error');
    dispatchProtocol(selectedAlertId);
});

if (contactBtn) contactBtn.addEventListener('click', () => {
    if (!lastAlertUserId) return showNotice('Select an active tracking target first.', 'error');
    window.viewSelectedContacts(lastAlertUserId, document.getElementById('selected-username').innerText);
});

async function dispatchProtocol(id) {
    try {
        await apiCall(`alerts/${id}/dispatch`, 'POST');
        showNotice('Emergency Support Dispatched. Help is arriving at the user location.', 'major');
        loadAlerts();
    } catch(e) {}
}

window.viewSelectedContacts = async function(userId, username = 'Target') {
    const contacts = await apiCall(`users/${userId}/contacts`, 'GET');
    if (contacts.length === 0) return showNotice(`No emergency contacts registered for ${username}.`, 'error');
    
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[5000] flex items-center justify-center p-4 transition-all duration-300';
    
    let contactsHtml = contacts.map(c => `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center mb-3 hover:border-indigo-200 transition">
            <div>
                <p class="font-bold text-slate-800 text-lg">${c.name}</p>
                <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">${c.relation}</p>
            </div>
            <a href="tel:${c.phone}" class="flex items-center gap-2 bg-indigo-100/50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-black transition shadow-sm border border-indigo-200">
                <i class="ph-fill ph-phone-call text-lg"></i> <span class="hidden sm:inline">${c.phone}</span>
            </a>
        </div>
    `).join('');

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform scale-95 opacity-0 transition-all duration-300" id="contact-modal-body">
            <div class="bg-indigo-600 p-6 flex flex-col pt-8 pb-6 border-b border-indigo-700 relative">
                <button onclick="this.closest('.fixed').remove()" class="absolute top-5 right-5 text-indigo-200 hover:text-white transition bg-black/10 hover:bg-black/20 rounded-full p-1.5"><i class="ph ph-x text-xl"></i></button>
                <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white text-3xl mb-4 shadow-inner ring-4 ring-indigo-500"><i class="ph-fill ph-address-book"></i></div>
                <h3 class="text-2xl font-black text-white leading-tight">Emergency Details</h3>
                <p class="text-indigo-200 text-sm mt-1">Classified network for <strong>${username}</strong></p>
            </div>
            <div class="p-6 max-h-[60vh] overflow-y-auto">
                ${contactsHtml}
            </div>
            <div class="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button onclick="this.closest('.fixed').remove()" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 rounded-2xl transition tracking-wide text-sm">CLOSE DATABASE ENTRY</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => {
        const modalBody = overlay.querySelector('#contact-modal-body');
        if(modalBody) { modalBody.classList.remove('scale-95', 'opacity-0'); modalBody.classList.add('scale-100', 'opacity-100'); }
    }, 10);
}

let activeAlerts = [];

// Admin Logic
async function loadAlerts() {
    try {
        const alerts = await apiCall('alerts', 'GET');
        activeAlerts = alerts;
        const container = document.getElementById('alerts-list');
        
        // Update Stats
        const statActive = document.getElementById('stat-active');
        if (statActive) statActive.innerText = alerts.length;
        
        if (alerts.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm">No active alerts.</p>';
            updateMap(alerts);
            return;
        }

        container.innerHTML = alerts.map((alert, index) => `
            <div class="bg-white border-b border-slate-100 p-4 hover:bg-slate-50 transition relative group cursor-pointer" id="alert-card-${alert.id}">
                <div class="absolute right-4 top-4 text-[10px] font-black text-slate-300">#${index+1}</div>
                <div class="absolute left-0 top-0 bottom-0 w-1.5" style="background: ${getAlertColor(alert.type)};"></div>
                <div class="pl-4">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-slate-800">${alert.username.toUpperCase()}</h3>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm" style="background: ${getAlertColor(alert.type)};">${alert.type.toUpperCase()}</span>
                    </div>
                    <div class="text-xs text-slate-500 space-y-1 mb-4">
                        <p><i class="ph ph-clock mr-1"></i> ${new Date(alert.timestamp.replace(' ', 'T') + 'Z').toLocaleString()}</p>
                        <p><i class="ph ph-map-pin mr-1"></i> ${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition" onclick="selectAlert(${alert.id}, ${alert.user_id}, ${alert.lat}, ${alert.lng}, '${alert.username.replace(/'/g, "\\'")}')">📍 Track Info</button>
                        <button class="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded transition shadow-sm" onclick="resolveAlert(${alert.id})">✅ Resolve</button>
                    </div>
                </div>
            </div>
        `).join('');

        updateMap(alerts);
        
        // Update selected card if it exists in current active alerts
        if (selectedAlertId) {
            const current = alerts.find(a => a.id == selectedAlertId);
            if (current && selectedCoords && selectedSyncTime) {
                selectedCoords.innerHTML = `<i class="ph ph-map-pin mr-2 text-red-400"></i> GPS: ${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}`;
                selectedSyncTime.innerHTML = `<i class="ph ph-clock-counter-clockwise mr-2 text-red-400"></i> LAST SYNC: ${new Date(current.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString()}`;
            }
        }
    } catch (e) {}
}

function getAlertColor(type) {
    const t = type.toLowerCase();
    if (t.includes('ai detection')) return '#6366f1'; // Indigo/Purple for AI Sentinel
    if (t === 'fire') return '#e74c3c';
    if (t === 'police') return '#3498db';
    if (t === 'medical') return '#f1c40f';
    return '#ff4757';
}

function getUserAvatar(user) {
    if (user.profile_photo) {
        return `<img src="${user.profile_photo}" class="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white">`;
    }
    return `<div class="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs ring-2 ring-white"><i class="ph-fill ph-user"></i></div>`;
}

async function loadUsers() {
    const allUsers = await apiCall('admin/users', 'GET');
    const tableBody = document.getElementById('users-table-body');
    const systemTableBody = document.getElementById('system-table-body');
    
    // Filter standard users for the general directory
    const normalUsers = allUsers.filter(u => u.role === 'user');
    
    // Update Stats
    const statUsers = document.getElementById('stat-users');
    if (statUsers) statUsers.innerText = normalUsers.length;
    
    tableBody.innerHTML = normalUsers.map((u, index) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 flex items-center gap-3">
                ${getUserAvatar(u)}
                <span class="font-medium text-slate-900">${u.username}</span>
            </td>
            <td class="px-6 py-4 text-slate-500">${u.phone || 'N/A'}</td>
            <td class="px-6 py-4 text-slate-500">${u.email || 'N/A'}</td>
            <td class="px-6 py-4">
                <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">${u.role}</span>
            </td>
            <td class="px-6 py-4 flex gap-2">
                <button class="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded transition" onclick="editUser(${u.id}, '${u.username}', '${u.email || ''}', '${u.phone || ''}', '${u.role}')" title="Edit"><i class="ph-fill ph-pencil-simple"></i></button>
                <button class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" onclick="deleteUser(${u.id})" title="Delete"><i class="ph-fill ph-trash"></i></button>
            </td>
        </tr>
    `).join('');

    // If Main Admin, populate System Database and unhide button
    if (currentUser.isMainAdmin) {
        document.getElementById('nav-system').classList.remove('hidden');
        document.getElementById('nav-system').classList.add('flex');
        if (systemTableBody) {
            systemTableBody.innerHTML = allUsers.map((u, index) => `
                <tr class="hover:bg-indigo-50/30 transition-colors border-b border-indigo-50">
                    <td class="px-6 py-4 font-bold text-indigo-400">#${index + 1}</td>
                    <td class="px-6 py-4 flex items-center gap-3">
                        ${getUserAvatar(u)}
                        <span class="font-semibold text-slate-900">${u.username}</span>
                    </td>
                    <td class="px-6 py-4 text-slate-600">${u.phone || 'N/A'}</td>
                    <td class="px-6 py-4 text-slate-600">${u.email || 'N/A'}</td>
                    <td class="px-6 py-4">
                        <span class="px-2.5 py-1 text-xs font-bold rounded-full ${u.role === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'}">${u.role.toUpperCase()}</span>
                    </td>
                    <td class="px-6 py-4 flex gap-2">
                        <button class="p-1.5 px-3 flex items-center gap-1.5 text-indigo-600 font-semibold bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-100 text-xs" onclick="window.viewSelectedContacts(${u.id}, '${u.username}')" title="Emergency Details"><i class="ph-fill ph-address-book text-base"></i> Contacts</button>
                        <button class="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 rounded transition" onclick="editUser(${u.id}, '${u.username}', '${u.email || ''}', '${u.phone || ''}', '${u.role}')" title="Edit"><i class="ph-fill ph-pencil-simple"></i></button>
                        <button class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition" onclick="deleteUser(${u.id})" title="Delete"><i class="ph-fill ph-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

window.deleteUser = async (id) => {
    if (confirm('Delete this user? All their alerts and contacts will be removed as well.')) {
        await apiCall(`admin/users/${id}`, 'DELETE');
        showNotice('User deleted');
        loadUsers();
    }
};

window.editUser = async (id, currentName, currentEmail, currentPhone, currentRole) => {
    const username = prompt("Username:", currentName) || currentName;
    const email = prompt("Email:", currentEmail) || currentEmail;
    const phone = prompt("Phone:", currentPhone) || currentPhone;
    const role = prompt("Role (user/admin):", currentRole) || currentRole;
    
    await apiCall(`admin/users/${id}`, 'PUT', { username, email, phone, role });
    showNotice('User updated');
    loadUsers();
};

function initMap() {
    if (!map) {
        map = L.map('map').setView([28.6139, 77.2090], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }
}

function updateMap(alerts) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    const heatData = alerts.map(a => [a.lat, a.lng, 0.5]);
    if (heatLayer) map.removeLayer(heatLayer);
    heatLayer = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 }).addTo(map);

    if (alerts.length > 0) {
        alerts.forEach(alert => {
            const marker = L.marker([alert.lat, alert.lng]).addTo(map)
                .bindPopup(`<strong>${alert.username.toUpperCase()}</strong><br>Type: ${alert.type.toUpperCase()}`);
            markers.push(marker);
        });

        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.5));
    }
}

window.centerOn = (lat, lng) => map.setView([lat, lng], 16);

window.selectAlert = async (id, userId, lat, lng, alertUsername = 'USER') => {
    selectedAlertId = id;
    lastAlertUserId = userId;
    centerOn(lat, lng);
    
    // Show a distinct pop-up style notification with the user's name
    showNotice(`LOCATING DEVICE: <strong>${alertUsername.toUpperCase()}</strong>`, 'rescue');
    
    // Initial display update
    if (selectedCoords) selectedCoords.innerHTML = `<i class="ph ph-map-pin mr-2 text-red-400"></i> GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (selectedSyncTime) selectedSyncTime.innerHTML = `<i class="ph ph-clock-counter-clockwise mr-2 text-red-400"></i> LAST SYNC: SYNCING...`;
    
    // Show Dispatch Card with animation
    dispatchCard.classList.remove('hidden');
    setTimeout(() => {
        dispatchCard.classList.add('scale-100', 'opacity-100');
    }, 10);
    
    // Fetch User Details for card
    try {
        const users = await apiCall('admin/users', 'GET');
        const user = users.find(u => u.id === userId);
        if (user) {
            selectedUsername.innerText = user.username.toUpperCase();
            selectedPhone.innerHTML = `<i class="ph-fill ph-phone mr-2"></i> ${user.phone}`;
            selectedEmail.innerHTML = `<i class="ph-fill ph-envelope mr-2"></i> ${user.email}`;
            
            const avatarContainer = document.getElementById('selected-avatar-container');
            const avatarImg = document.getElementById('selected-avatar-img');
            const avatarIcon = document.getElementById('selected-avatar-icon');
            
            if (avatarContainer) {
                avatarContainer.classList.remove('hidden');
                if (user.profile_photo) {
                    avatarImg.src = user.profile_photo;
                    avatarImg.classList.remove('hidden');
                    avatarIcon.classList.add('hidden');
                } else {
                    avatarImg.classList.add('hidden');
                    avatarIcon.classList.remove('hidden');
                }
            }
        }
    } catch(e) {}
};

window.deselectAlert = () => {
    selectedAlertId = null;
    lastAlertUserId = null;
    dispatchCard.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
        dispatchCard.classList.add('hidden');
    }, 300);
};



window.resolveAlert = async function resolveAlert(id) {
    try {
        await apiCall(`alerts/${id}/resolve`, 'POST');
        showNotice('Alert successfully resolved!');
        deselectAlert();
        loadAlerts();
    } catch (e) {}
}
window.resolveAlert = resolveAlert;

window.deleteHistoryAlert = async (id) => {
    if(confirm('Permanently delete this alert from history?')) {
        await apiCall(`alerts/${id}`, 'DELETE');
        loadHistory();
    }
}

window.deleteAllHistory = async () => {
    if(confirm('Are you sure you want to permanently delete all resolved history? This action cannot be undone.')) {
        await apiCall('alerts/history/all', 'DELETE');
        loadHistory();
    }
}

async function loadHistory() {
    try {
        const history = await apiCall('alerts/history', 'GET');
        const container = document.getElementById('history-list');
        const statHistory = document.getElementById('stat-history');
        const statResponse = document.getElementById('stat-response');
        
        if (statHistory) statHistory.innerText = history.length;
        
        let totalTime = 0;
        let validResolved = 0;
        
        if (history.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm col-span-3">No resolved alerts in history.</p>';
            if (statResponse) statResponse.innerText = '0s';
            return;
        }

        container.innerHTML = history.map((alert, index) => {
            const created = new Date(alert.timestamp.replace(' ', 'T') + 'Z');
            const resolved = new Date(alert.resolved_at.replace(' ', 'T') + 'Z');
            let diffStr = 'N/A';
            if (resolved > created) {
                const diffSec = Math.floor((resolved - created) / 1000);
                totalTime += diffSec;
                validResolved++;
                diffStr = diffSec < 60 ? `${diffSec}s` : `${Math.floor(diffSec/60)}m ${diffSec%60}s`;
            }

            return `
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors relative group">
                <div class="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase tracking-wide">ENTRY #${index + 1}</div>
                <h3 class="font-bold text-slate-800 text-lg mb-1">${alert.username.toUpperCase()}</h3>
                <p class="text-xs text-slate-500 mb-4 tracking-wide uppercase font-semibold">${alert.type}</p>
                <div class="space-y-2 mb-4 text-sm text-slate-600">
                    <p class="flex justify-between border-b border-slate-200 pb-2"><span>Triggered:</span> <span class="font-medium text-slate-800">${created.toLocaleTimeString()}</span></p>
                    <p class="flex justify-between border-b border-slate-200 pb-2"><span>Resolved:</span> <span class="font-medium text-slate-800">${resolved.toLocaleTimeString()}</span></p>
                    <p class="flex justify-between"><span>Response Time:</span> <span class="font-bold text-emerald-600">${diffStr}</span></p>
                </div>
                <div class="flex gap-2">
                    <button class="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded transition" onclick="window.open('https://maps.google.com/?q=${alert.lat},${alert.lng}', '_blank')">View Map</button>
                    <button class="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded transition" title="Delete Log" onclick="deleteHistoryAlert(${alert.id})"><i class="ph-fill ph-trash"></i></button>
                </div>
            </div>`;
        }).join('');

        if (statResponse) {
            if (validResolved > 0) {
                const avgSec = Math.floor(totalTime / validResolved);
                statResponse.innerText = avgSec < 60 ? `${avgSec}s` : `${Math.floor(avgSec/60)}m ${avgSec%60}s`;
            } else {
                statResponse.innerText = '0s';
            }
        }
    } catch(e) {}
}

// Polling Center (Faster sync)
setInterval(() => {
    loadAlerts();
    loadHistory();
}, 4000);

initMap();
loadAlerts();
loadHistory();
loadUsers();

window.showSection = (name) => {
    document.getElementById('live-section').style.display = name === 'live' ? 'block' : 'none';
    document.getElementById('history-section').style.display = name === 'history' ? 'block' : 'none';
    document.getElementById('users-section').style.display = name === 'users' ? 'block' : 'none';
    document.getElementById('system-section').style.display = name === 'system' ? 'block' : 'none';
    
    ['live', 'history', 'users', 'system'].forEach(x => {
        const item = document.getElementById('nav-' + x);
        if (item) item.classList.remove('bg-indigo-50', 'bg-slate-100', 'sidebar-item-active');
    });
    const activeNav = document.getElementById('nav-' + name);
    if (activeNav && name !== 'system') activeNav.classList.add('sidebar-item-active');
};
