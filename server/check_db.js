const sqlite = require('better-sqlite3');
const db = new sqlite('panic.db');
const rows = db.prepare("SELECT id, username, photo IS NOT NULL as has_photo FROM alerts WHERE status = 'active'").all();
console.log(JSON.stringify(rows));
