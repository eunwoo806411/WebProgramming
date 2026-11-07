import session from 'express-session';

// Share the existing SQLite database and persistent storage volume.
export class SQLiteSessionStore extends session.Store {
    constructor(db) {
        super();
        db.exec(`CREATE TABLE IF NOT EXISTS sessions (
            sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL
        )`);
        this.read = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
        this.write = db.prepare('INSERT OR REPLACE INTO sessions (sid, data, expires) VALUES (?, ?, ?)');
        this.remove = db.prepare('DELETE FROM sessions WHERE sid = ?');
        this.prune = db.prepare('DELETE FROM sessions WHERE expires <= ?');
    }

    get(sid, callback) {
        try {
            const row = this.read.get(sid);
            if (!row) return callback(null, null);
            if (row.expires <= Date.now()) {
                this.remove.run(sid);
                return callback(null, null);
            }
            callback(null, JSON.parse(row.data));
        } catch (error) { callback(error); }
    }

    set(sid, value, callback = () => {}) {
        try {
            const expires = value.cookie?.expires
                ? new Date(value.cookie.expires).getTime()
                : Date.now() + 7 * 24 * 60 * 60 * 1000;
            this.prune.run(Date.now());
            this.write.run(sid, JSON.stringify(value), expires);
            callback(null);
        } catch (error) { callback(error); }
    }

    touch(sid, value, callback) { this.set(sid, value, callback); }

    destroy(sid, callback = () => {}) {
        try { this.remove.run(sid); callback(null); }
        catch (error) { callback(error); }
    }
}
