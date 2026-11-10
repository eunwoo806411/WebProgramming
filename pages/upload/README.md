# 사진 등록 페이지 (pages/upload)

지도에서 위치를 찍거나 숭실대 건물을 골라 사진을 올리는 페이지입니다. **이 폴더 안의 파일만 수정**하고, 공통 코드는 import해서 씁니다.

## 파일 역할
| 파일 | 역할 |
|---|---|
| `index.html` | 화면 구조. Leaflet을 `shared/assets/vendor/leaflet`에서 불러옴 |
| `upload.js` | 진입점. 로그인 확인·사진 고르기(버튼/끌어다 놓기)·지도·서비스 호출 연결 |
| `upload-input.js` | 폼 값 검증·변환 (DOM 없음, `tests/upload-input.test.mjs`로 검사) |
| `image-prepare.js` | 고른 사진이 실제로 열리는지 확인, HEIC → JPEG 변환, EXIF 촬영 시각 읽기(JPEG·HEIC 공통, 라이브러리 없이 직접 읽음) |
| `location-picker.js` | 위치 선택 지도 (클릭·핀 드래그·좌표 입력 동기화, 건물 위치 점 표시) |
| `campus-buildings.js` | 숭실대 건물 24곳의 이름·별칭·좌표(OpenStreetMap 건물 중심점)와 검색 (`tests/upload-buildings.test.mjs`) |
| `upload.css` | 이 페이지 전용 스타일 (`upload-` 접두어) |
| `vendor/` | 외부 라이브러리 (아래 참고) |

## 입력 규칙
- **사진**: JPG · PNG · WEBP · HEIC/HEIF, 원본 20MB 이하. 고르는 순간 실제로 열어 보고, 열리지 않으면 바로 안내합니다.
- **장소명** 100자, **설명** 1000자 이내 (서버 `shared/server/photo-routes.js`, 마이페이지 수정 화면과 같은 기준).
- **촬영 시각**: 기본값은 지금. 사진에 EXIF 촬영 시각이 있으면 그 값으로 채웁니다(직접 고친 뒤에는 덮어쓰지 않음). 현재보다 미래는 화면과 서버 모두 거부합니다.
- 브라우저 기본 입력 검사 대신(`novalidate`) `upload-input.js`의 한국어 안내를 보여줍니다.
- 로그인 전에는 입력칸을 잠그고 로그인 링크(`login/index.html?next=upload`)를 보여줍니다. 로그인하면 이 페이지로 돌아옵니다.

## 다른 담당자와 만나는 지점
- **사진 저장**: `shared/js/service.js`의 `createPhoto(input)`만 호출합니다. 로그인 확인도 그 안에서 한 번만 합니다.
  - 입력: `{ imageFile: File|Blob, latitude, longitude, placeName, description, capturedAt(ISO) }`
  - `imageFile`은 HEIC를 변환한 JPEG일 수 있습니다.
  - 반환된 Photo의 `id`로 메인 상세(`photoUrl(id)`)로 이동합니다.
  - `uploadedAt`·`authorId`·`likeCount`는 서버가 채웁니다.
  - 이미지는 `shared/js/image-encode.js`가 **긴 변 1600px JPEG(품질 0.8, EXIF 제거)** 로 줄여 보냅니다. 보통 300KB 안팎입니다.
- **좌표 범위**: `CONFIG.map.maxBounds`(캠퍼스 범위) 밖은 등록할 수 없습니다.
- **로그인 후 돌아오기**: `pages/login/login.js`의 `completeLogin()`이 `?next=` 값(main·upload·mypage·explore만 허용)으로 이동합니다.
- **지도 코드**: 메인의 `map.js`를 import하지 않고 별도로 만들었습니다.

## vendor 라이브러리
| 파일 | 용도 | 라이선스 |
|---|---|---|
| `heic2any.min.js` (0.0.4) | 크롬 등 HEIC를 직접 못 여는 브라우저에서 JPEG로 변환. 1.3MB라 **HEIC를 고를 때만** 불러옵니다 | MIT (`heic2any-LICENSE.md`, 내부에 libheif 포함) |
