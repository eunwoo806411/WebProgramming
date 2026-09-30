# 사진 등록 페이지 (pages/upload)

지도에서 위치를 찍고 사진을 올리는 페이지입니다. **이 폴더 안의 파일만 수정**하고, 공통 코드는 import해서 씁니다.

## 파일 역할
| 파일 | 역할 |
|---|---|
| `index.html` | 화면 구조. Leaflet을 `shared/assets/vendor/leaflet`에서 불러옴 |
| `upload.js` | 진입점. 폼·지도·서비스 호출 연결만 담당 |
| `upload-input.js` | 폼 값 검증·변환 (DOM 없음, `tests/upload-input.test.mjs`로 검사) |
| `location-picker.js` | 위치 선택 지도 (클릭·핀 드래그·좌표 입력 동기화) |
| `upload.css` | 이 페이지 전용 스타일 (`upload-` 접두어) |

## 다른 담당자와 만나는 지점
- **사진 저장**: `shared/js/service.js`의 `createPhoto(input)`만 호출합니다. 데모에서는 이 브라우저(localStorage)에 저장됩니다.
  - 입력: `{ imageFile: File, latitude, longitude, placeName, description, capturedAt(ISO) }`
  - 반환 권장: 생성된 Photo (`id` 포함). `id`가 있으면 메인 상세(`photoUrl(id)`), 없으면 메인으로 이동합니다.
  - `uploadedAt`·`authorId`·`likeCount`는 저장 쪽(서버)이 채웁니다. 등록 페이지는 보내지 않습니다.
  - 이미지는 `shared/js/image-encode.js`가 긴 변 900px JPEG(EXIF 제거)로 줄이며, 저장은 `shared/js/upload-store.js`가 합니다. 저장 공간이 차면 `STORAGE_UNAVAILABLE` 오류를 안내합니다.
  - 다른 사용자·기기와 공유되지 않습니다. 서버 연결 시 `createPhoto`만 교체하면 이 페이지는 그대로 동작합니다.
- **좌표 범위**: `CONFIG.map.maxBounds`(캠퍼스 범위) 밖은 등록할 수 없습니다. 범위를 바꾸면 메인 지도와 함께 바뀝니다.
- **지도 코드**: 메인의 `map.js`를 import하지 않고 별도로 만들었습니다. 서로 수정해도 충돌하지 않습니다.

## 건드리지 않는 파일
`data/*`, 다른 `pages/*` 폴더. `shared/js/local-adapter.js`·`photo-ui.js`는 등록 기능을 위해 최소한만 수정했습니다(등록 사진 목록 합치기, 배지 문구).
