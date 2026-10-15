import express from 'express';
import session from 'express-session';
import 'dotenv/config';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(ROOT, 'storage');
const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

/* ---------- DB ---------- */
const db = new Database(path.join(STORAGE_DIR, 'data.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    place_name TEXT NOT NULL,
    description TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    uploaded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL,
    photo_id TEXT NOT NULL,
    PRIMARY KEY (user_id, photo_id)
);
`);

const toPhoto = (r) => ({
    id: r.id,
    imageUrl: `/uploads/${r.id}.jpg`,
    latitude: r.latitude,
    longitude: r.longitude,
    placeName: r.place_name,
    description: r.description,
    capturedAt: r.captured_at,
    uploadedAt: r.uploaded_at,
    likeCount: 0,
    isDemo: false
});

/* ---------- 기본 설정 ---------- */
app.set('trust proxy', 1);

if (isProd) {
    app.use((req, res, next) => {
        if (req.secure) return next();
        res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    });
}

app.use(express.json({ limit: '8mb' }));

if (isProd && !process.env.SESSION_SECRET) {
    throw new Error('배포 환경에서는 SESSION_SECRET 환경변수가 필요합니다.');
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-only-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd
    }
}));

/* ---------- 정적 파일 (필요한 폴더만 공개) ---------- */
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.use('/pages', express.static(path.join(ROOT, 'pages')));
app.use('/shared', express.static(path.join(ROOT, 'shared')));
app.use('/data', express.static(path.join(ROOT, 'data')));
app.use('/uploads', express.static(UPLOAD_DIR, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));

/* ---------- 유세인트 로그인 ---------- */
const SMARTID = 'https://smartid.ssu.ac.kr/Symtra_sso';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';

const cookiePairs = (res) => res.headers.getSetCookie().map(c => c.split(';')[0]);

function pickInput(html, name) {
    const tag = html.match(new RegExp(`<input[^>]*name=["']${name}["'][^>]*>`, 'i'))?.[0];
    return tag?.match(/value=["']([^"']*)["']/i)?.[1];
}

async function ssuLogin(id, pw) {
    const r1 = await fetch(`${SMARTID}/smln.asp`, { headers: { 'User-Agent': UA } });
    const html = await r1.text();
    const inTp = pickInput(html, 'in_tp_bit');
    const rqst = pickInput(html, 'rqst_caus_cd');
    if (inTp === undefined || rqst === undefined) {
        throw new Error('학교 로그인 페이지를 불러오지 못했습니다.');
    }

    const r2 = await fetch(`${SMARTID}/smln_pcs.asp`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: cookiePairs(r1).join('; ')
        },
        body: new URLSearchParams({
            in_tp_bit: inTp,
            rqst_caus_cd: rqst,
            userid: id,
            pwd: pw
        })
    });

    const ok = cookiePairs(r2).some(c => c.startsWith('sToken=') && c.length > 'sToken='.length);
    if (ok) return true;

    const buf = Buffer.from(await r2.arrayBuffer());
    let body;
    try {
        body = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
        body = new TextDecoder('euc-kr').decode(buf);
    }

    const msg = body.match(/alert\("([^"]*)"\)/)?.[1] || '로그인에 실패했습니다.';
    throw new Error(msg.replace(/\\n/g, ' '));
}

const requireLogin = (message) => (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ success: false, message });
    next();
};

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: '숭실 한 장 서버 정상 작동' });
});

app.post('/api/login', async (req, res) => {
    const id = String(req.body?.id ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (process.env.ALLOW_TEST_LOGIN === 'true' && id === 'test' && password === '1234') {
        req.session.user = { id: 'test', name: '테스트 사용자' };
        return res.json({ success: true, message: '로그인 성공!' });
    }

    if (!/^\d{8}$/.test(id) || !password) {
        return res.status(400).json({
            success: false,
            message: '학번(8자리)과 비밀번호를 입력해주세요.'
        });
    }

    try {
        await ssuLogin(id, password);
    } catch (e) {
        console.log('로그인 실패 원인:', e.message);
        return res.status(401).json({ success: false, message: e.message });
    }

    req.session.regenerate((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: '세션 생성 실패' });
        }
        req.session.user = { id, name: id };
        res.json({ success: true, message: '로그인 성공!' });
    });
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    res.json({ success: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: '로그아웃 실패' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: '로그아웃 완료' });
    });
});

/* ---------- 사진 ---------- */
// 전체 사진 (작성자 학번은 내려주지 않음)
app.get('/api/photos', (req, res) => {
    const rows = db.prepare('SELECT * FROM photos ORDER BY uploaded_at ASC').all();
    res.json({ success: true, photos: rows.map(toPhoto) });
});

// 내가 올린 사진
app.get('/api/my/photos', requireLogin('로그인이 필요합니다.'), (req, res) => {
    const rows = db.prepare('SELECT * FROM photos WHERE author_id = ? ORDER BY uploaded_at DESC')
        .all(req.session.user.id);
    res.json({ success: true, photos: rows.map(toPhoto) });
});

const JPEG_PREFIX = 'data:image/jpeg;base64,';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

app.post('/api/photos', requireLogin('사진 등록은 로그인 후 사용할 수 있어요.'), (req, res) => {
    const b = req.body ?? {};
    const bad = (message) => res.status(400).json({ success: false, message });

    const okCoord = (v, max) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
    const placeName = String(b.placeName ?? '').trim().slice(0, 100);
    const description = String(b.description ?? '').trim().slice(0, 1000);
    const captured = Date.parse(b.capturedAt);

    if (!okCoord(b.latitude, 90) || !okCoord(b.longitude, 180) || !placeName || !description || !Number.isFinite(captured)) {
        return bad('등록 정보를 확인해 주세요.');
    }
    if (typeof b.imageData !== 'string' || !b.imageData.startsWith(JPEG_PREFIX)) {
        return bad('사진 형식이 올바르지 않아요.');
    }

    const buf = Buffer.from(b.imageData.slice(JPEG_PREFIX.length), 'base64');
    if (buf.length < 4 || buf.length > MAX_IMAGE_BYTES || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
        return bad('사진 파일이 올바르지 않거나 너무 커요.');
    }

    const id = `upload-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const filePath = path.join(UPLOAD_DIR, `${id}.jpg`);

    try {
        fs.writeFileSync(filePath, buf);
        db.prepare(`INSERT INTO photos
            (id, author_id, latitude, longitude, place_name, description, captured_at, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, req.session.user.id, b.latitude, b.longitude, placeName, description,
                new Date(captured).toISOString(), new Date().toISOString());
    } catch (e) {
        console.error('사진 저장 실패:', e);
        fs.rmSync(filePath, { force: true });
        return res.status(500).json({ success: false, message: '사진 저장에 실패했어요.' });
    }

    const row = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    res.json({ success: true, photo: toPhoto(row) });
});

/* ---------- 좋아요 ---------- */
// 사진별 좋아요 수 + (로그인 시) 내가 누른 사진 id 목록
app.get('/api/likes', (req, res) => {
    const counts = {};
    for (const r of db.prepare('SELECT photo_id, COUNT(*) AS c FROM likes GROUP BY photo_id').all()) {
        counts[r.photo_id] = r.c;
    }
    const mine = req.session.user
        ? db.prepare('SELECT photo_id FROM likes WHERE user_id = ?').all(req.session.user.id).map(r => r.photo_id)
        : [];
    res.json({ success: true, counts, mine });
});

app.put('/api/likes/:photoId', requireLogin('좋아요는 로그인 후 사용할 수 있어요.'), (req, res) => {
    const { photoId } = req.params;
    const known = /^demo-\d{1,3}$/.test(photoId)
        || db.prepare('SELECT 1 FROM photos WHERE id = ?').get(photoId);
    if (!known) {
        return res.status(404).json({ success: false, message: '사진을 찾을 수 없어요.' });
    }

    if (req.body?.liked) {
        db.prepare('INSERT OR IGNORE INTO likes (user_id, photo_id) VALUES (?, ?)')
            .run(req.session.user.id, photoId);
    } else {
        db.prepare('DELETE FROM likes WHERE user_id = ? AND photo_id = ?')
            .run(req.session.user.id, photoId);
    }
    res.json({ success: true });
});

/* ---------- 에러 처리 (항상 JSON으로 응답) ---------- */
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: '존재하지 않는 API입니다.' });
});

app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: status === 413 ? '사진 용량이 너무 커요.' : '서버 오류가 발생했어요.'
    });
});

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});