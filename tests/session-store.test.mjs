import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {SQLiteSessionStore} from '../shared/server/session-store.js';

const read = (store, id) => new Promise((resolve, reject) => {
    store.get(id, (error, value) => error ? reject(error) : resolve(value));
});

test('sessions survive store recreation, expire, and are removed on logout', async () => {
    const db = new Database(':memory:');
    try {
        const first = new SQLiteSessionStore(db);
        const value = {cookie: {expires: new Date(Date.now() + 60000).toISOString()}, user: {id: 'student'}};
        first.set('login', value);
        const next = new SQLiteSessionStore(db);
        assert.deepEqual(await read(next, 'login'), value);
        next.destroy('login');
        assert.equal(await read(first, 'login'), null);
        first.set('expired', {cookie: {expires: new Date(0).toISOString()}});
        assert.equal(await read(next, 'expired'), null);
    } finally { db.close(); }
});
