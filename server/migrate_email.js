const db = require('better-sqlite3')('panic.db'); try { db.exec('ALTER TABLE emergency_contacts ADD COLUMN email TEXT'); console.log('added email'); } catch(e){ console.log('email exists'); }
