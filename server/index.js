require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const templates = require('./emailTemplates.js');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Twilio Setup
const client = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// GLOBAL LOGGER for debugging
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// Deployment Health Check
app.get('/', (req, res) => res.send('Aura Safety System: Online 🛡️'));

// --- AUTH ROUTES ---
app.post('/register', (req, res) => {
  const { username, password, role, phone, email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    db.prepare('INSERT INTO users (username, password, role, phone, email, otp, verified) VALUES (?, ?, ?, ?, ?, ?, 0)').run(username, password, role, phone, email, otp);
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const baseUrl = process.env.PORT ? 'https://aura-safety.onrender.com' : `http://localhost:${PORT}`;
        
        if (role === 'admin') {
            const approvalLink = `${baseUrl}/approve-admin/${username}/${otp}`;
            const rejectionLink = `${baseUrl}/reject-admin/${username}/${otp}`;
            
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: `🛡️ Action Required: Command Center Registration (${username})`,
                html: templates.adminRequest(username, email, approvalLink, rejectionLink)
            }).catch(err => console.error(`[EMAIL FAILED] Admin approval: ${err.message}`));
        } else {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: `🛡️ Verify your Aura Safety Account`,
                html: templates.otp(username, otp)
            }).catch(err => console.error(`[EMAIL FAILED] OTP to ${email}: ${err.message}`));
        }
    }
    res.json({ success: true, username, role });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists or data invalid' });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT id, username, role, phone, email, verified, password, profile_photo FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Incorrect username.' });
  if (user.password !== password) return res.status(401).json({ error: 'Incorrect password.' });
  if (user.verified === 0) {
      if (user.role === 'admin') return res.status(403).json({ error: 'Your admin account is pending approval from the main administrator.' });
      return res.json({ requiresOtp: true, username: user.username });
  }
  const isMainAdmin = user.email === process.env.EMAIL_USER;
  const { password: discarded, ...userWithoutPassword } = user;
  res.json({ ...userWithoutPassword, isMainAdmin });
});

app.post('/verify-otp', (req, res) => {
    const { username, otp } = req.body;
    const user = db.prepare('SELECT id, otp FROM users WHERE username = ?').get(username);
    if (user && user.otp === String(otp)) {
        db.prepare('UPDATE users SET verified = 1, otp = NULL WHERE id = ?').run(user.id);
        res.json({ success: true });
    } else res.status(400).json({ error: 'Incorrect OTP code.' });
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT username, id FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'No account found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare('UPDATE users SET otp = ? WHERE id = ?').run(otp, user.id);
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `🔑 Password Reset - Aura Safety`,
            html: templates.otp(user.username, otp, 'password reset')
        }).catch(e => console.error("Email failed:", e));
    }
    res.json({ success: true, email, username: user.username });
});

app.post('/reset-password', (req, res) => {
    const { username, otp, newPassword } = req.body;
    const user = db.prepare('SELECT id, otp FROM users WHERE username = ?').get(username);
    if (user && user.otp === String(otp)) {
        db.prepare('UPDATE users SET password = ?, verified = 1, otp = NULL WHERE id = ?').run(newPassword, user.id);
        res.json({ success: true });
    } else res.status(400).json({ error: 'Incorrect OTP' });
});

app.post('/otp-login', (req, res) => {
    const { username, otp } = req.body;
    const user = db.prepare('SELECT id, username, role, phone, email, verified, otp, profile_photo FROM users WHERE username = ?').get(username);
    if (user && user.otp === String(otp)) {
        db.prepare('UPDATE users SET verified = 1, otp = NULL WHERE id = ?').run(user.id);
        const isMainAdmin = (user.email === process.env.EMAIL_USER);
        const { otp: discarded, ...rest } = user;
        res.json({ ...rest, verified: 1, isMainAdmin });
    } else res.status(400).json({ error: 'Incorrect OTP' });
});

app.get('/approve-admin/:username/:otp', (req, res) => {
    const { username, otp } = req.params;
    const user = db.prepare("SELECT id, otp, role, email FROM users WHERE username = ? AND role = 'admin'").get(username);
    if (user && user.otp === String(otp)) {
        db.prepare('UPDATE users SET verified = 1, otp = NULL WHERE id = ?').run(user.id);
        
        if (user.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `✅ Security Clearance Approved: Welcome to Command Center`,
                html: templates.adminApproved(username)
            }).catch(e => console.error(e));
        }

        res.send('<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;"><h2>✅ Admin Approved Successfully</h2><p>The user <strong>' + username + '</strong> has been granted administrator privileges and can now log in.</p></body></html>');
    } else {
        res.status(400).send('<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; color: red;"><h2>❌ Invalid or Expired Approval Link</h2></body></html>');
    }
});

app.get('/reject-admin/:username/:otp', (req, res) => {
    const { username, otp } = req.params;
    const user = db.prepare("SELECT id, otp, role, email FROM users WHERE username = ? AND role = 'admin'").get(username);
    if (user && user.otp === String(otp)) {
        db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        
        if (user.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `❌ Security Clearance Denied`,
                html: templates.adminRejected(username)
            }).catch(e => console.error(e));
        }

        res.send('<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;"><h2>✅ Admin Request Rejected</h2><p>The user <strong>' + username + '</strong> has been denied access and purged from the system.</p></body></html>');
    } else {
        res.status(400).send('<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; color: red;"><h2>❌ Invalid or Expired Approval Link</h2></body></html>');
    }
});

// --- ALERT ROUTES ---
app.post('/sos', (req, res) => {
  const { user_id, lat, lng, type } = req.body;
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Check for an existing active alert for this user to update location instead of flooding the board
  const existingAlert = db.prepare("SELECT id FROM alerts WHERE user_id = ? AND status = 'active'").get(user_id);

  let alertId;
  if (existingAlert) {
    db.prepare("UPDATE alerts SET lat = ?, lng = ?, type = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?").run(lat, lng, type || 'general', existingAlert.id);
    alertId = existingAlert.id;
  } else {
    const info = db.prepare("INSERT INTO alerts (user_id, username, lat, lng, type) VALUES (?, ?, ?, ?, ?)").run(user_id, user.username, lat, lng, type || 'general');
    alertId = info.lastInsertRowid;
  }
  
  // ALWAYS notify contacts on every SOS press to ensure delivery during testing/emergency
  const alertTime = new Date().toLocaleTimeString();
  const contacts = db.prepare('SELECT email FROM emergency_contacts WHERE user_id = ?').all(user_id);
  
  contacts.forEach(contact => {
      if (contact.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: contact.email,
              subject: `🚨 URGENT: SOS Alert from ${user.username} - Aura Safety`,
              html: templates.sos(user.username, lat, lng, type, alertTime)
          }).catch(e => console.error("[EMAIL ERROR]", e));
      }
  });

  const updatedAlert = db.prepare("SELECT timestamp FROM alerts WHERE id = ?").get(alertId);
  res.json({ id: alertId, status: 'active', timestamp: updatedAlert.timestamp });
});

app.get('/alerts', (req, res) => {
  res.json(db.prepare("SELECT * FROM alerts WHERE status = 'active' ORDER BY timestamp DESC").all());
});

app.get('/alerts/history', (req, res) => {
  res.json(db.prepare("SELECT * FROM alerts WHERE status = 'resolved' ORDER BY timestamp DESC").all());
});

app.delete('/alerts/history/all', (req, res) => {
  db.prepare("DELETE FROM alerts WHERE status = 'resolved'").run();
  res.json({ success: true });
});
app.get('/alerts/status/:userId', (req, res) => {
  const alert = db.prepare("SELECT status FROM alerts WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1").get(req.params.userId);
  res.json(alert || { status: 'none' });
});

// Admin specific actions
app.delete(['/alerts/:id', '/alert/:id'], (req, res) => {
    console.log(`[ACCESS] Delete Alert ID: ${req.params.id}`);
    db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.post(['/alerts/:id/resolve', '/alert/:id/resolve'], (req, res) => {
    db.prepare("UPDATE alerts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

app.post(['/alerts/:id/dispatch', '/alert/:id/dispatch'], (req, res) => {
    const alert = db.prepare('SELECT user_id, username FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    db.prepare("UPDATE alerts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(alert.user_id);
    if (user && user.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter.sendMail({ 
            from: process.env.EMAIL_USER, 
            to: user.email, 
            subject: `🛡️ Response Protocol: Help Dispatched`, 
            html: templates.otp(alert.username, 'EN-ROUTE', 'emergency response request') 
        }).catch(e => {});
    }
    res.json({ success: true });
});

// --- USER/PROFILE ROUTES ---
app.get('/admin/users', (req, res) => {
  res.json(db.prepare('SELECT id, username, phone, email, role, profile_photo FROM users').all());
});

app.put('/admin/users/:id', (req, res) => {
  const { username, email, phone, role } = req.body;
  db.prepare('UPDATE users SET username = ?, email = ?, phone = ?, role = ? WHERE id = ?').run(username, email, phone, role, req.params.id);
  res.json({ success: true });
});

app.delete('/admin/users/:id', (req, res) => {
  db.prepare('DELETE FROM emergency_contacts WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM alerts WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/users/:id/contacts', (req, res) => {
  res.json(db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(req.params.id));
});

app.post('/users/:id/contacts', (req, res) => {
  const { name, phone, email, relation } = req.body;
  db.prepare('INSERT INTO emergency_contacts (user_id, name, phone, email, relation) VALUES (?, ?, ?, ?, ?)').run(req.params.id, name, phone, email, relation);
  res.json({ success: true });
});

app.delete('/users/:id/contacts/:contactId', (req, res) => {
  db.prepare('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?').run(req.params.contactId, req.params.id);
  res.json({ success: true });
});

app.post('/profile/photo', (req, res) => {
  const { user_id, profile_photo } = req.body;
  if (!user_id || !profile_photo) return res.status(400).json({ error: 'Missing data' });
  db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(profile_photo, user_id);
  res.json({ success: true });
});

app.post('/profile/update', (req, res) => {
  const { user_id, username, phone, email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  db.prepare('UPDATE users SET otp = ?, pending_profile = ? WHERE id = ?').run(otp, JSON.stringify({ username, phone, email }), user_id);
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter.sendMail({ 
          from: process.env.EMAIL_USER, 
          to: email, 
          subject: `🔐 Profile Security: Code Required`, 
          html: templates.otp(username, otp, 'profile update request') 
      }).catch(e => {});
  }
  res.json({ success: true });
});

app.post('/profile/verify', (req, res) => {
  const { user_id, otp } = req.body;
  const user = db.prepare('SELECT id, otp, pending_profile FROM users WHERE id = ?').get(user_id);
  if (user && user.otp === String(otp)) {
    const p = JSON.parse(user.pending_profile);
    db.prepare('UPDATE users SET username = ?, phone = ?, email = ?, otp = NULL, pending_profile = NULL WHERE id = ?').run(p.username, p.phone, p.email, user_id);
    res.json({ success: true, user: db.prepare('SELECT id, username, role, phone, email, profile_photo FROM users WHERE id = ?').get(user_id) });
  } else res.status(400).json({ error: 'Incorrect code' });
});

// Final handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).send(`Cannot ${req.method} ${req.url}`);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
