// 서버(Express + SQLite)에 사진·좋아요를 저장하는 어댑터. local-adapter.js와 같은 함수 목록을 제공합니다.
import {mockPhotos} from '../../data/mock-photos.js';
import {filterPhotos, sortPhotos} from './photo-query.js';
import {encodeImageFile} from './image-encode.js';

const error = (code, message) => Object.assign(new Error(message), {code});

async function api(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {'Content-Type': 'application/json'}
    });
  } catch {
    throw error('NETWORK_ERROR', '서버에 연결할 수 없어요.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* 본문 없음 */ }
  if (res.status === 401) throw error('AUTH_REQUIRED', data?.message || '로그인이 필요해요.');
  if (!res.ok || !data?.success) throw error('REQUEST_FAILED', data?.message || '요청에 실패했어요.');
  return data;
}

export function createServerAdapter({encodeImage = encodeImageFile} = {}) {
  // 샘플 사진 + 서버에 저장된 사진, 좋아요 수 합산
  async function loadAll() {
    let uploaded = [], counts = {}, mine = [];
    try {
      const [p, l] = await Promise.all([api('/api/photos'), api('/api/likes')]);
      uploaded = p.photos; counts = l.counts; mine = l.mine;
    } catch (e) { console.error(e); }
    const photos = [...mockPhotos, ...uploaded]
      .map(p => ({...p, likeCount: p.likeCount + (counts[p.id] ?? 0)}));
    return {photos, mine};
  }

  async function getCurrentUser() {
    try {
      const {user} = await api('/api/me');
      return {id: user.id, isDemo: false};
    } catch { return null; }
  }

  return {
    getCurrentUser,
    // 실제 로그인(/api/login)은 login.js에서 이미 끝난 상태라, 서버 세션의 사용자를 그대로 반환합니다.
    async signInDemo() { return getCurrentUser(); },
    async signOut() {
      try { await api('/api/logout', {method: 'POST'}); } catch { /* 이미 로그아웃 */ }
    },
    async listPhotos(query = {}) {
      const {photos} = await loadAll();
      return sortPhotos(filterPhotos(photos, query), query.order);
    },
    async getPhoto(id) {
      const {photos} = await loadAll();
      return photos.find(p => p.id === id) ?? null;
    },
    async getUserLikedPhotoIds() {
      try { return (await api('/api/likes')).mine; } catch { return []; }
    },
    async setPhotoLiked(id, liked) {
      await api(`/api/likes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({liked: Boolean(liked)})
      });
      const {photos, mine} = await loadAll();
      const photo = photos.find(p => p.id === id);
      if (!photo) throw error('PHOTO_NOT_FOUND', '사진을 찾을 수 없어요.');
      return {photo, liked: mine.includes(id)};
    },
    async createPhoto(input = {}) {
      const {imageFile, latitude, longitude} = input;
      const placeName = String(input.placeName ?? '').trim();
      const description = String(input.description ?? '').trim();
      const captured = Date.parse(input.capturedAt);
      const okCoord = (v, max) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
      if (!imageFile || !okCoord(latitude, 90) || !okCoord(longitude, 180) || !placeName || !description || !Number.isFinite(captured)) {
        throw error('INVALID_INPUT', '등록 정보를 확인해 주세요.');
      }
      if (!await getCurrentUser()) throw error('AUTH_REQUIRED', '사진 등록은 로그인 후 사용할 수 있어요.');
      const imageData = await encodeImage(imageFile);
      const {photo} = await api('/api/photos', {
        method: 'POST',
        body: JSON.stringify({imageData, latitude, longitude, placeName, description, capturedAt: new Date(captured).toISOString()})
      });
      return photo;
    },
    async listUserPhotos(userId) {
      try {
        const mineRows = (await api('/api/my/photos')).photos;
        const ids = new Set(mineRows.map(p => p.id));
        const {photos} = await loadAll();
        return {status: 'ready', userId, items: photos.filter(p => ids.has(p.id))};
      } catch (e) {
        if (e.code === 'AUTH_REQUIRED') return {status: 'ready', userId, items: []};
        throw e;
      }
    },
    async listUserLikedPhotos(userId) {
      const {photos, mine} = await loadAll();
      const ids = new Set(mine);
      return {status: 'ready', userId, items: photos.filter(p => ids.has(p.id))};
    }
  };
}