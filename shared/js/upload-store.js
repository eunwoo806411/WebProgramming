// 등록된 사진을 브라우저(localStorage)에 보관하는 데모 저장소. 서버 연결 시 이 파일은 필요 없어집니다.
// 샘플 상태 키(soongsil-one-frame-preview-v1)와 분리해 저장해 좋아요·로그인 상태와 섞이지 않습니다.
export const UPLOADS_KEY = 'soongsil-one-frame-uploads-v1';

const storageError = () => Object.assign(
  new Error('브라우저 저장 공간이 부족하거나 사용할 수 없어 사진을 저장하지 못했어요.'), {code: 'STORAGE_UNAVAILABLE'});

const isValid = p => p && typeof p.id === 'string' && typeof p.authorId === 'string'
  && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('data:image/')
  && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
  && typeof p.placeName === 'string' && typeof p.description === 'string'
  && Number.isFinite(Date.parse(p.capturedAt)) && Number.isFinite(Date.parse(p.uploadedAt))
  && Number.isFinite(p.likeCount);

export function readUploads(storage) {
  try {
    const raw = JSON.parse(storage.getItem(UPLOADS_KEY));
    return raw?.version === 1 && Array.isArray(raw.items) ? raw.items.filter(isValid) : [];
  } catch { return []; }
}

export function appendUpload(storage, photo) {
  const items = [...readUploads(storage), photo];
  try { storage.setItem(UPLOADS_KEY, JSON.stringify({version: 1, items})); }
  catch { throw storageError(); }
}
