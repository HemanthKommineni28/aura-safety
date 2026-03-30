export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3001' 
  : 'https://aura-safety.onrender.com';

export async function apiCall(endpoint, method = 'POST', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}/${endpoint}`, options);
    const contentType = response.headers.get("content-type");
    
    let data;
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        data = { message: await response.text() };
    }

    if (!response.ok) throw new Error(data.error || data.message || 'Server error');
    return data;
  } catch (err) {
    showNotice(err.message, 'error');
    throw err;
  }
}

export function showNotice(msg, type = 'success') {
    let container = document.getElementById('notice-container');
    if (!container) return;
    
    const notice = document.createElement('div');
    notice.className = `notice notice-${type}`;
    
    // Icon based on type
    let icon = '🛡️';
    if (type === 'error') icon = '⚠️';
    if (type === 'rescue') icon = '🚨';
    if (type === 'major') icon = '🚀';

    if (type === 'major') {
        notice.className = 'fixed inset-0 flex items-center justify-center z-[3000] p-4 bg-black/60 backdrop-blur-sm animate-fadeIn';
        notice.innerHTML = `
            <div class="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl border border-slate-200 transform animate-bounceIn">
                <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                    <i class="ph-fill ph-check-circle"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">Success Confirmed</h3>
                <p class="text-slate-500 font-medium mb-8">${msg}</p>
                <button onclick="this.closest('.fixed').remove()" class="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 uppercase tracking-widest text-sm">Dismiss Protocol</button>
            </div>
        `;
        container.appendChild(notice);
        return;
    }

    notice.innerHTML = `<div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:1.2rem;">${icon}</span>
        <span class="font-medium">${msg}</span>
    </div>`;
    
    container.appendChild(notice);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notice.style.transform = 'translateX(120%)';
        notice.style.opacity = '0';
        notice.style.transition = 'all 0.4s ease-in';
        setTimeout(() => notice.remove(), 400);
    }, 4000);
}

export function updateNav(currentUser, navActions) {
  if (currentUser) {
    navActions.innerHTML = `
      <div class="flex items-center space-x-4">
          <span class="text-sm">Welcome, <strong class="text-slate-900">${currentUser.username}</strong></span>
          <button id="logout-btn" class="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200">Logout</button>
      </div>
    `;
    document.getElementById('logout-btn').onclick = () => {
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    };
  } else {
    // Redirect if not logged in (for protected pages)
    if (!window.location.pathname.endsWith('index.html') && 
        !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
    }
    navActions.innerHTML = '';
  }
}
