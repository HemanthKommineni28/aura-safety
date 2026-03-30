import { apiCall, showNotice, updateNav } from './utils.js';

let currentUser = JSON.parse(sessionStorage.getItem('user')) || null;
const navActions = document.getElementById('nav-actions');

// Redirect if already logged in
if (currentUser) {
    if (currentUser.role === 'admin') window.location.href = 'admin.html';
    else window.location.href = 'user.html';
}

const views = {
  login: document.getElementById('login-view'),
  register: document.getElementById('register-view'),
  otp: document.getElementById('otp-view'),
  forgot: document.getElementById('forgot-view'),
  reset: document.getElementById('reset-view')
};

const forms = {
  login: document.getElementById('login-form'),
  register: document.getElementById('register-form'),
  otp: document.getElementById('otp-form'),
  forgot: document.getElementById('forgot-form'),
  reset: document.getElementById('reset-form')
};

let pendingVerificationUsername = null;

function showView(viewName) {
  Object.keys(views).forEach(v => {
    views[v].style.display = v === viewName ? 'block' : 'none';
  });
}

forms.login.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const user = await apiCall('login', 'POST', { username, password });
    if (user.requiresOtp) {
        pendingVerificationUsername = user.username;
        showNotice('Security lock! Please check your email for the OTP.', 'error');
        showView('otp');
        return;
    }
    
    sessionStorage.setItem('user', JSON.stringify(user));
    if (user.role === 'admin') window.location.href = 'admin.html';
    else window.location.href = 'user.html';
  } catch (e) {}
});

forms.register.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const phone = document.getElementById('reg-phone').value;
  const email = document.getElementById('reg-email').value;
  const role = document.getElementById('reg-role').value;
  
  try {
    const res = await apiCall('register', 'POST', { username, password, role, phone, email });
    pendingVerificationUsername = res.username;
    if (role === 'admin') {
        showNotice('Registration submitted. Waiting for main admin approval via email.', 'success');
        showView('login');
        forms.register.reset();
    } else {
        showNotice('Account created! A secure OTP has been emailed to you.', 'success');
        showView('otp');
    }
  } catch (e) {}
});

forms.forgot.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    try {
        const res = await apiCall('forgot-password', 'POST', { email });
        pendingVerificationUsername = res.username;
        showNotice('Recovery code sent to your email!', 'success');
        showView('reset');
    } catch(e) {}
});

forms.reset.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('reset-otp').value;
    const newPassword = document.getElementById('reset-new-password').value;
    try {
        await apiCall('reset-password', 'POST', { username: pendingVerificationUsername, otp, newPassword });
        showNotice('Password updated! Please sign in with your new credential.', 'success');
        showView('login');
        forms.login.reset();
        forms.reset.reset();
    } catch (e) {}
});

document.getElementById('btn-otp-login').addEventListener('click', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('reset-otp').value;
    if (!otp) return showNotice('Please enter the verification code first.', 'error');
    
    try {
        const user = await apiCall('otp-login', 'POST', { username: pendingVerificationUsername, otp });
        showNotice('OTP verified! Access granted.', 'success');
        sessionStorage.setItem('user', JSON.stringify(user));
        if (user.role === 'admin') window.location.href = 'admin.html';
        else window.location.href = 'user.html';
    } catch (e) {}
});

forms.otp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('otp-code').value;
    try {
        await apiCall('verify-otp', 'POST', { username: pendingVerificationUsername, otp });
        showNotice('Email verified successfully! You can now sign in.', 'success');
        showView('login');
        forms.login.reset();
        forms.register.reset();
        forms.otp.reset();
    } catch(e) {}
});

document.getElementById('go-to-register').onclick = () => showView('register');
document.getElementById('go-to-login').onclick = () => showView('login');
document.getElementById('go-back-login').onclick = () => showView('login');
document.getElementById('go-to-forgot').onclick = () => showView('forgot');

document.querySelectorAll('.go-to-login-link').forEach(btn => {
    btn.onclick = (e) => {
        e.preventDefault();
        showView('login');
    };
});

updateNav(null, navActions);
