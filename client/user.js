import { apiCall, showNotice, updateNav } from './utils.js';

const currentUser = JSON.parse(sessionStorage.getItem('user'));
const navActions = document.getElementById('nav-actions');
let trackingInterval = null;

if (!currentUser || currentUser.role !== 'user') {
    window.location.href = 'index.html';
}

updateNav(currentUser, navActions);
loadProfile();
checkActiveAlert();

async function checkActiveAlert() {
    try {
        const resp = await apiCall(`alerts/status/${currentUser.id}`, 'GET');
        if (resp && resp.status === 'active') {
            showNotice('Resuming active emergency tracking...', 'rescue');
            startTracking(true); // pass true to indicate resume
        }
    } catch(e) {}
}

// Profile Details
function loadProfile() {
    const imgElement = document.getElementById('profile-display-img');
    const iconElement = document.getElementById('profile-fallback-icon');
    
    if (currentUser.profile_photo && imgElement && iconElement) {
        imgElement.src = currentUser.profile_photo;
        imgElement.classList.remove('hidden');
        iconElement.classList.add('hidden');
    }

    const details = document.getElementById('user-details');
    details.innerHTML = `
        <div class="space-y-4">
            <div><p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Username</p><p class="font-medium text-slate-800 text-lg">${currentUser.username}</p></div>
            <div><p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Phone</p><p class="font-medium text-slate-800">${currentUser.phone || 'Not provided'}</p></div>
            <div><p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Email</p><p class="font-medium text-slate-800">${currentUser.email || 'Not provided'}</p></div>
            <div><p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Clearance Status</p><p class="font-medium text-green-600 flex items-center mt-1"><i class="ph-fill ph-check-circle mr-1 text-lg"></i> ${currentUser.verified ? 'Verified Active' : 'Pending Verification'}</p></div>
        </div>
    `;
    loadContacts();
}

async function loadContacts() {
    const contacts = await apiCall(`users/${currentUser.id}/contacts`, 'GET');
    const list = document.getElementById('contacts-list');
    
    if (contacts.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500 col-span-2">No trusted contacts found.</p>';
        return;
    }
    
    list.innerHTML = contacts.map(c => `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group hover:border-slate-300 transition-colors">
            <h4 class="font-bold text-slate-800 flex items-center">${c.name} <span class="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] uppercase rounded-full">${c.relation}</span></h4>
            <div class="mt-3 space-y-1.5 text-sm text-slate-500">
                <p class="flex items-center"><i class="ph-fill ph-phone mr-2 text-slate-400"></i> ${c.phone || 'N/A'}</p>
                <p class="flex items-center"><i class="ph-fill ph-envelope mr-2 text-slate-400"></i> ${c.email || 'N/A'}</p>
            </div>
            <button class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" onclick="deleteContact(${c.id})" title="Remove Contact"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');
}

window.deleteContact = async (contactId) => {
    if (confirm('Delete this emergency contact?')) {
        await apiCall(`users/${currentUser.id}/contacts/${contactId}`, 'DELETE');
        showNotice('Contact deleted successfully!');
        loadContacts();
    }
};

document.getElementById('add-contact-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const email = document.getElementById('contact-email').value;
    const relation = document.getElementById('contact-relation').value;
    
    await apiCall(`users/${currentUser.id}/contacts`, 'POST', { name, phone, email, relation });
    showNotice('Contact added successfully!');
    loadContacts();
    e.target.reset();
};

// Edit Profile Logic
window.toggleEditProfile = (show) => {
    document.getElementById('edit-profile-view').classList.toggle('hidden', !show);
    document.getElementById('verify-profile-view').classList.add('hidden'); // Hide verify if opening edit
    if (show) {
        document.getElementById('edit-username').value = currentUser.username;
        document.getElementById('edit-phone').value = currentUser.phone || '';
        document.getElementById('edit-email').value = currentUser.email || '';
    }
};

document.getElementById('edit-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        user_id: currentUser.id,
        username: document.getElementById('edit-username').value,
        phone: document.getElementById('edit-phone').value,
        email: document.getElementById('edit-email').value
    };
    
    try {
        await apiCall('profile/update', 'POST', data);
        showNotice('Identity verify code sent to your email!', 'success');
        document.getElementById('edit-profile-view').classList.add('hidden');
        document.getElementById('verify-profile-view').classList.remove('hidden');
    } catch (e) {}
};

document.getElementById('verify-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const otp = document.getElementById('profile-otp').value;
    try {
        const res = await apiCall('profile/verify', 'POST', { user_id: currentUser.id, otp });
        showNotice('Profile updated and verified!', 'success');
        
        // Update local session data
        sessionStorage.setItem('user', JSON.stringify(res.user));
        setTimeout(() => window.location.reload(), 1500); // Reload to reflect changes everywhere
    } catch (e) {}
};

const triggerSOS = async (lat = 28.6139, lng = 77.2090, aiType = null) => {
    const defaultType = document.getElementById('sos-type').value;
    const type = aiType ? `AI Detection: ${aiType}` : defaultType;
    
    try {
        const res = await apiCall('sos', 'POST', { user_id: currentUser.id, lat, lng, type });
        const serverTime = res.timestamp ? new Date(res.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString() : new Date().toLocaleTimeString();

        if (!trackingInterval) {
            showNotice(`🚨 SOS (${type.toUpperCase()}) TRIGGERED!`);
            startAudioRecording();
        }
        document.getElementById('location-info').innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center text-green-600">
                <div class="flex items-center font-bold uppercase tracking-tighter text-sm mb-1"><i class="ph-fill ph-broadcast mr-2 animate-pulse text-lg"></i> Transmitting Signal</div>
                <div class="bg-green-500/10 px-3 py-1.5 rounded-full text-[10px] font-mono border border-green-500/20 shadow-inner">
                    GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
                <div class="text-[9px] text-slate-400 font-black tracking-widest mt-2 flex items-center gap-1 uppercase">
                    <i class="ph-fill ph-clock"></i> Last Sync: ${serverTime}
                </div>
            </div>
        `;
    } catch (e) {}
};

async function startAudioRecording() {
    console.log("🎤 Ambient Audio Recording - Captured (Simulation)");
    // In production, we'd use navigator.mediaDevices.getUserMedia() and capture for 15s
}

document.getElementById('sos-btn').onclick = () => {
    if (trackingInterval) {
        stopTracking();
    } else {
        startTracking();
    }
};

async function stopTracking() {
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = null;
    document.getElementById('sos-btn').innerHTML = '<i class="ph-fill ph-warning-octagon text-6xl mb-2"></i><span>SOS PANIC</span>';
    document.getElementById('sos-btn').classList.remove('animate-pulse');
    document.getElementById('location-info').innerHTML = '<div class="flex items-center justify-center"><i class="ph ph-gps-fix mr-2 text-primary"></i> Standby...</div>';
}

async function startTracking(isResume = false) {
    const btn = document.getElementById('sos-btn');
    btn.innerText = '...';

    let hasTriggered = isResume; // If resuming, we already triggered initially

    const performUpdate = async () => {
        // Automatically check if admin resolved it - but ONLY after we created or resumed an alert
        if (hasTriggered) {
            const statusCheck = await apiCall(`alerts/status/${currentUser.id}`, 'GET');
            if (statusCheck && statusCheck.status === 'resolved') {
                stopTracking();
                document.getElementById('location-info').innerHTML = '<div class="flex items-center justify-center"><i class="ph-fill ph-check-circle mr-2 text-slate-400"></i> Alert remotely resolved.</div>';
                showNotice('✅ Emergency Resolved by Admin');
                return;
            }
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            await triggerSOS(pos.coords.latitude, pos.coords.longitude, window.lastAIThreat);
            hasTriggered = true;
            btn.innerHTML = '<i class="ph-fill ph-broadcast text-6xl mb-2 animate-pulse"></i><span>TRACKING</span>';
        }, (err) => {
            triggerSOS(28.61, 77.20, window.lastAIThreat);
            hasTriggered = true;
            btn.innerHTML = '<i class="ph-fill ph-broadcast text-6xl mb-2 animate-pulse"></i><span>TRACKING</span>';
        });
    };

    performUpdate();
    trackingInterval = setInterval(performUpdate, 10000);
}

// ---- TENSORFLOW.JS AI SENTINEL LOGIC ----
let isAORunning = false;
let model = null;
let video = null;

document.getElementById('activate-ml-btn').onclick = async () => {
    const btn = document.getElementById('activate-ml-btn');
    const container = document.getElementById('webcam-container');
    const indicator = document.getElementById('camera-recording-indicator');
    
    if (isAORunning) {
        // Stop AI
        isAORunning = false;
        btn.innerHTML = '<i class="ph ph-power mr-2"></i> Activate Autonomous Detection';
        btn.className = 'mt-auto w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow flex items-center justify-center';
        container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-500 text-sm italic"><i class="ph ph-video-camera-slash text-2xl mr-2"></i> Camera Inactive</div>';
        indicator.classList.add('hidden');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        return;
    }

    try {
        isAORunning = true;
        btn.innerHTML = '<i class="ph ph-spinner-gap animate-spin mr-2"></i> Booting Neural Network...';
        btn.className = 'mt-auto w-full bg-slate-400 text-white font-semibold py-3 px-4 rounded-xl shadow flex items-center justify-center cursor-not-allowed';
        
        // 1. Boot up webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        
        // 2. Set up video element inside container
        container.innerHTML = `
            <video id="ml-video" autoplay playsinline muted class="w-full h-full object-cover rounded-lg"></video>
            <canvas id="ml-canvas" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
            <div id="ml-overlay-text" class="absolute bottom-2 left-2 bg-black/70 text-green-400 text-[10px] font-mono px-2 py-1 rounded">SYS.ONLINE</div>
        `;
        
        video = document.getElementById('ml-video');
        video.srcObject = stream;
        indicator.classList.remove('hidden');

        // Wait for video to be ready
        await new Promise(resolve => { video.onloadedmetadata = () => resolve(); });
        video.play();

        // 3. Load COCO-SSD Model (Object Detection)
        if (!model) {
            model = await cocoSsd.load();
        }
        
        btn.innerHTML = '<i class="ph ph-shield-check mr-2"></i> AI Sentinel Active (Click to Stop)';
        btn.className = 'mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow flex items-center justify-center animate-pulse';

        // 4. Start detection loop
        const canvas = document.getElementById('ml-canvas');
        const ctx = canvas.getContext('2d');
        const overlayText = document.getElementById('ml-overlay-text');
        
        // We will trigger SOS if we see any weapons or suspicious handheld devices.
        // COCO-SSD weapon and device classes: 'knife', 'scissors', 'baseball bat', 'cell phone'
        const threatKeywords = ['knife', 'scissors', 'baseball bat', 'cell phone'];

        async function detectFrame() {
            if (!isAORunning) return;
            
            // Sync canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Run inference
            const predictions = await model.detect(video);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let threatDetected = false;
            let detectedItem = "";

            predictions.forEach(pred => {
                // Draw bounding boxes for cool UI effect
                const [x, y, width, height] = pred.bbox;
                ctx.strokeStyle = '#22c55e'; // Green outline normally
                ctx.lineWidth = 2;
                ctx.fillStyle = '#22c55e';
                
                const isThreat = threatKeywords.includes(pred.class.toLowerCase());
                if (isThreat) {
                    ctx.strokeStyle = '#ef4444'; // Red outline for threats!
                    ctx.fillStyle = '#ef4444';
                    threatDetected = true;
                    detectedItem = pred.class.toUpperCase();
                }

                ctx.strokeRect(x, y, width, height);
                ctx.font = '14px Arial';
                ctx.fillText(pred.class + ' ' + Math.round(pred.score * 100) + '%', x, y > 15 ? y - 5 : 15);
            });

            overlayText.innerText = `SCANNING... (Found ${predictions.length} objects)`;

            // TRIGER SOS IF THREAT SPOTTED
            if (threatDetected && !trackingInterval) {
                isAORunning = false; // Stop loop immediately
                btn.innerHTML = '<i class="ph ph-warning mr-2"></i> THREAT DETECTED';
                overlayText.innerText = `THREAT: ${detectedItem}`;
                overlayText.className = 'absolute bottom-2 left-2 bg-red-600/90 text-white text-[10px] font-mono px-2 py-1 rounded animate-pulse';
                
                showNotice(`AI ALERT: 🚨 ${detectedItem} detected! Auto-triggering SOS!`, 'rescue');
                
                // Store threat globally so triggerSOS can pick it up
                window.lastAIThreat = detectedItem;
                
                // Automatically click the manual SOS button to formally fire the system!
                const manualBtn = document.getElementById('sos-btn');
                setTimeout(() => manualBtn.click(), 1000);
                return;
            }
            
            // Clear cache if not triggered
            if (!threatDetected) window.lastAIThreat = null;

            requestAnimationFrame(detectFrame);
        }

        detectFrame();

    } catch (e) {
        showNotice('Failed to start AI camera: ' + e.message, 'error');
        resetAIBtn(btn, container, indicator);
    }
};

let localStream = null;

window.openPhotoCapture = async () => {
    document.getElementById('photo-capture-modal').classList.remove('hidden');
    document.getElementById('photo-capture-modal').classList.add('flex');
    const video = document.getElementById('photo-video');
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
    } catch(err) {
        showNotice('Camera access denied or unavailable.', 'error');
        closePhotoCapture();
    }
};

window.closePhotoCapture = () => {
    document.getElementById('photo-capture-modal').classList.add('hidden');
    document.getElementById('photo-capture-modal').classList.remove('flex');
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
};

document.getElementById('photo-capture-btn').addEventListener('click', async () => {
    const video = document.getElementById('photo-video');
    const canvas = document.getElementById('photo-canvas');
    if (!localStream) return;
    
    // Set canvas dimension exactly as video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Square crop for best looking avatar
    const ctx = canvas.getContext('2d');
    const minDim = Math.min(canvas.width, canvas.height);
    const startX = (canvas.width - minDim) / 2;
    const startY = (canvas.height - minDim) / 2;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = minDim;
    cropCanvas.height = minDim;
    cropCanvas.getContext('2d').drawImage(video, startX, startY, minDim, minDim, 0, 0, minDim, minDim);
    
    // To Data URL
    const photoData = cropCanvas.toDataURL('image/jpeg', 0.8);
    
    // Send to backend
    try {
        document.getElementById('photo-capture-btn').innerText = "SECURING...";
        await apiCall('profile/photo', 'POST', { user_id: currentUser.id, profile_photo: photoData });
        
        // Update local session
        currentUser.profile_photo = photoData;
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        
        // Update UI immediately 
        loadProfile();
        
        showNotice('Biometric visual successfully saved.', 'major');
    } catch (e) {
        showNotice('Failed to securely save profile photo.', 'error');
    } finally {
        document.getElementById('photo-capture-btn').innerText = "CAPTURE & SECURE";
        closePhotoCapture();
    }
});

function resetAIBtn(btn, container, indicator) {
    isAORunning = false;
    btn.innerHTML = '<i class="ph ph-power mr-2"></i> Activate Autonomous Detection';
    btn.className = 'mt-auto w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow flex items-center justify-center';
    container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-500 text-sm italic"><i class="ph ph-video-camera-slash text-2xl mr-2"></i> Camera Inactive</div>';
    indicator.classList.add('hidden');
}
