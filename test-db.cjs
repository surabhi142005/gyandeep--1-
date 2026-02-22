const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'data', 'gyandeep.db');

console.log('Opening DB at:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening DB:', err);
        process.exit(1);
    }
    console.log('Success opening DB');
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) {
            console.error('Error querying:', err);
        } else {
            console.log('Tables:', rows);
        }
        db.close();
    });
});
