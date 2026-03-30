const sqlite = require('better-sqlite3');
const path = require('path');

const db = new sqlite(path.join(__dirname, 'panic.db'));

// Users - added phone and email
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    phone TEXT,
    email TEXT,
    verified BOOLEAN DEFAULT 0
  )
`);

// Emergency Contacts
db.exec(`
  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relation TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Alerts - added type and audio_url
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT,
    type TEXT DEFAULT 'general',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    audio_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

try {
  db.exec("ALTER TABLE alerts ADD COLUMN resolved_at DATETIME;");
  console.log("Database schema updated: mathematical metrics added.");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE alerts ADD COLUMN photo TEXT;");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE users ADD COLUMN otp TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN pending_profile TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN profile_photo TEXT;");
} catch (e) {}

// Mark all pre-existing users (before OTP system) as already verified
try {
  db.exec("UPDATE users SET verified = 1 WHERE verified IS NULL OR verified = 0;");
} catch (e) {}

// Seed Default Administrator
try {
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('Aura Safety');
  if (!admin) {
    db.prepare('INSERT INTO users (username, password, role, phone, email, verified) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Aura Safety', 'AuraSafety@2026', 'admin', 'N/A', 'panic.alert.system.2026@gmail.com');
    console.log("🚀 Default Administrator 'Aura Safety' Seeded!");
  }
} catch (e) {
  console.error("Critical: Could not seed admin", e);
}

console.log("Database schema updated with profiles, history, and emergency types.");

module.exports = db;
