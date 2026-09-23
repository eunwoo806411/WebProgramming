# 숭실 한 장

숭실대학교의 풍경과 일상을 사진·지도·시간으로 탐색하는 팀 프로젝트입니다. 일반 HTML/CSS/JavaScript ES modules를 사용하며 프런트엔드 프레임워크와 빌드 과정은 없습니다.

현재는 메인 기능과 팀원별 페이지 기본 구조가 구현된 **PC 전용(최소 폭 1100px)** 프로젝트입니다. 모바일 전용 배치는 제외했습니다.

[웹사이트 보기](https://eunwoo806411.github.io/WebProgramming/)

## 실행

```sh
cd WebProgramming
python3 -m http.server 8001 --bind 127.0.0.1
```

브라우저에서 http://127.0.0.1:8001 을 여세요. 루트는 로그인 화면으로 이동합니다. `file://`로 직접 열지 마세요. 종료는 서버 터미널에서 Ctrl+C입니다. 이미 8001 서버가 켜져 있으면 중복 실행하지 않습니다.

- **로그인 없이 데모로 둘러보기**: 지도·사진 상세·시간 필터 사용 가능, 좋아요는 로그인 안내.
- **개발용 테스트 로그인**: 실제 인증 없이 좋아요 확인. `shared/js/config.js`의 `demoLoginEnabled`를 false로 바꾸면 버튼이 숨겨집니다. 실제 인증을 연결할 때 데모 함수도 교체하세요.
- 학번·비밀번호는 입력받거나 저장·전송하지 않습니다.
- 인터넷은 OpenStreetMap 배경 지도와 외부 샘플 사진을 불러올 때 필요합니다.
- 이 서버는 내 컴퓨터에서만 접속됩니다. 팀원에게 자동 공유되지 않습니다.

## 구현 범위와 담당 파일

| 담당 | 수정할 파일 | 현재 상태 / 후속 작업 |
|---|---|---|
| 로그인 | `pages/login/index.html`, `login.css`, `login.js` | 기본 입력 영역과 데모 입장. 실제 인증 서버 연결 필요 |
| 사진 등록 | `pages/upload/index.html`, `upload.css`, `upload.js` | 입력 폼과 데이터 추출. 위치 선택·파일 업로드 연결 필요 |
| 메인 | `pages/main/index.html`, `main.css`, `main.js`, `map.js`, `clusters.js`, `time-controls.js` | 실제 지도, 썸네일 묶음, 상세, 좋아요, 시간 필터 구현 |
| 마이페이지 | `pages/mypage/index.html`, `mypage.css`, `mypage.js` | 탭·목록 영역·사용자 ID 기반 조회 연결 지점. 조회 구현 필요 |
| 전체 사진 | `pages/explore/index.html`, `explore.css`, `explore.js` | 정렬 선택·카드 영역·상세 연결 지점. 목록 조회 연결 필요 |
| 공통 | `shared/css/common.css`, `shared/js/*` | 메뉴·경로·데이터·사용자·상세 UI. 수정 전 담당자 간 조율 |
| 샘플 | `data/mock-photos.js` | 동일 좌표·가까운 좌표 등을 포함한 12개 데모 기록 |
| 자원 | `shared/assets/` | 이미지 대체 화면, Leaflet 1.9.4와 라이선스 |
| 검증 | `tests/core.test.mjs`, `tests/map-harness.html` | 핵심 자동 검사, 타일 없는 지도 검사 화면 |
| 문서 | `docs/` | 로컬 검증 결과 |

각 페이지에는 전용 HTML/CSS/JS가 함께 있습니다. 공통 코드를 페이지 안에 복사하지 말고 import하세요. `package.json`은 Node 검사와 ES module 선언에만 사용되며 웹 실행에 npm 설치는 필요하지 않습니다.

## 데이터 구조

```js
const photo = {
  id: 'demo-01',
  authorId: 'sample-user-1', // 내부 사용자 구분용. 공개 UI에 표시하지 않음
  imageUrl: 'https://example.com/photo.jpg',
  latitude: 37.4964,
  longitude: 126.95705,
  placeName: '중앙 잔디광장',
  description: '봄 수업 사이, 잠깐의 산책.',
  capturedAt: '2026-04-08T14:23:00+09:00',
  uploadedAt: '2026-09-22T09:00:00+09:00',
  likeCount: 128,
  isDemo: true
};
const user = { id: 'demo-user', isDemo: true };
```

촬영 시각과 업로드 시각은 서로 다른 필드입니다. 실제 서버에서는 업로드 완료 시각을 서버가 부여해야 합니다. 공개 화면에 계정 정보를 표시하지 않지만 프런트엔드 mock 파일 자체는 누구나 읽을 수 있습니다. 실제 익명 서비스에서는 서버가 공개 응답에서 작성자 내부 정보도 제외해야 합니다.

샘플 이미지·장소·날짜는 실제 숭실대 촬영 기록이 아닙니다. 외부 예시 이미지는 기존 데모의 Unsplash URL을 사용하며 화면에 DEMO로 표시합니다. 이미지를 불러오지 못하면 대체 이미지가 표시됩니다. 업로드 샘플 기간은 한국 시간 2026-09-22 09:00:00 ~ 2026-09-24 18:00:00입니다.

## 공통 함수

페이지는 `shared/js/service.js`만 통해 데이터에 접근합니다. 반환값은 모두 Promise입니다.

| 함수 | 반환 / 동작 |
|---|---|
| `getCurrentUser()` | User 또는 null |
| `signInDemo()` | 고정 개발용 User로 입장 |
| `signOut()` | 데모 세션 종료. 좋아요 기록은 보존 |
| `listPhotos({start,end,field,order})` | 필터·정렬된 Photo[]. 인자 생략 가능 |
| `getPhoto(id)` | Photo 또는 null |
| `getUserLikedPhotoIds(userId)` | 사용자별 좋아요 사진 ID 배열 |
| `setPhotoLiked(photoId, liked)` | `{photo, liked}`. 로그인 필요, 중복 증가 방지 |
| `createPhoto(input)` | 현재 `NOT_IMPLEMENTED` 오류. 서버 저장 연결 지점 |
| `listUserPhotos(userId)` | 현재 `{status:'not-connected',userId,items:[]}` |
| `listUserLikedPhotos(userId)` | 현재 `{status:'not-connected',userId,items:[]}` |

```js
import { listPhotos, getCurrentUser, setPhotoLiked } from '../../shared/js/service.js';
const photos = await listPhotos({ order: 'latest' });
const user = await getCurrentUser();
if (user && photos.length) await setPhotoLiked(photos[0].id, true);
```

`start`·`end`는 Unix 밀리초입니다. 데이터 오류 코드는 `AUTH_REQUIRED`, `PHOTO_NOT_FOUND`, `STORAGE_UNAVAILABLE`, `NOT_IMPLEMENTED`입니다. 저장에 실패하면 성공으로 표시하지 않습니다.

좋아요 여부는 사진과 분리해 사용자 ID별로 저장합니다. 표시 좋아요 수는 샘플 기본 수에 해당 브라우저의 사용자별 데모 좋아요를 합산합니다. 저장 키는 `soongsil-one-frame-preview-v1`입니다. 페이지 파일은 localStorage를 직접 사용하지 않습니다. 서버 연결 시 `service.js`와 어댑터를 교체하면 됩니다.

**브라우저 저장 데이터는 사용자 사이에 공유되지 않습니다.** 다른 기기·브라우저·주소(localhost와 127.0.0.1 포함)·포트는 별도 저장소이며, 브라우저 데이터를 지우면 기록이 사라집니다.

### 등록·조회 연결 지점

`upload.js`의 `readUploadInput(form)`은 다음 값을 만듭니다.

```js
{ imageFile, latitude, longitude, placeName, description, capturedAt }
```

`requestLocationSelection()`에서 선택 결과를 위도·경도 입력에 연결하고 `submitUpload(input)`에서 공통 등록 함수를 호출하세요. 파일 선택은 서버 업로드가 아닙니다. 현재 등록 버튼은 성공 메시지 대신 미연결 안내를 보여줍니다.

`mypage.js`의 `loadMyPhotos(tab)`은 현재 사용자 ID를 조회 함수로 전달합니다. 담당자는 공통 조회 결과를 `{status:'ready', items: Photo[]}`로 반환하도록 연결하면 됩니다. 미로그인·미연결·연결 후 빈 결과는 서로 구분됩니다.

`explore.js`의 `getExploreQuery()`는 현재 정렬 상태를 반환하고 `renderExplorePhotos(photos)`는 연결 후 목록을 표시합니다. 정렬 버튼에서 조회 함수를 호출하도록 연결하세요.

## 페이지 이동과 사진 상세

`shared/js/layout.js`의 `mountLayout(pageName)`으로 공통 메뉴를 붙입니다. `routes.js`의 `pageUrl(name)`과 `photoUrl(id)`를 사용하면 GitHub Pages처럼 하위 폴더에 배포해도 경로를 유지합니다.

```js
import { photoUrl } from '../../shared/js/routes.js';
location.href = photoUrl('demo-01'); // 메인 ?photo=demo-01 상세 보기
```

메인의 상세 모달은 `shared/js/photo-ui.js`에서 관리합니다. 다른 페이지는 해당 URL로 연결하면 됩니다.

## 시간 필터와 정렬

- 기준은 `CONFIG.timeField = 'uploadedAt'` 한 곳에서 정합니다. 추후 `'capturedAt'`으로 교체할 수 있습니다.
- 화면 입력·표시는 한국 시간(KST), 저장값은 시간대가 있는 ISO 문자열입니다.
- 필터는 `start <= 사진 시각 <= end`로 양쪽 경계를 포함합니다.
- 날짜·시간 입력과 시작·끝 슬라이더는 초 단위로 연동됩니다.
- 역순·빈 입력은 오류와 빈 결과를 표시합니다. 유효하지만 해당 사진이 없으면 별도 안내가 나옵니다.
- 전체 기간은 데이터의 최소·최대 시각으로 돌아갑니다.
- 최신순: `uploadedAt` 내림차순.
- 인기순: `likeCount` 내림차순 → `uploadedAt` 내림차순. 모두 같으면 ID로 안정 정렬합니다.

## 지도

[Leaflet 1.9.4](https://leafletjs.com/download.html)와 [OpenStreetMap 표준 타일](https://operations.osmfoundation.org/policies/tiles/)을 사용합니다. API 키와 비밀 키가 필요 없습니다. Leaflet의 JS/CSS/LICENSE는 `shared/assets/vendor/leaflet`에 포함했습니다. 갱신할 때 세 파일을 함께 교체하세요.

- 지도 우측 아래의 OpenStreetMap 기여자 출처 표시를 가리지 마세요.
- 표준 브라우저 캐시와 Referer를 유지합니다. 타일 대량 다운로드·미리 받기·오프라인 다운로드를 추가하지 마세요.
- 공용 타일은 가용성이 보장되지 않습니다. 공개 운영 시 트래픽과 최신 정책을 검토하고 필요하면 별도 공급자로 바꾸세요.
- 공급자 URL·최대 확대·중심 좌표는 `shared/js/config.js`에서 관리합니다.
- 동일 좌표 사진을 먼저 묶고, 축소 상태에서 가까운 좌표 그룹을 화면 거리로 다시 묶습니다.
- 최대 확대 21에서는 서로 다른 좌표 그룹을 분리합니다. 배경 타일은 최대 19를 확대 표시하므로 추가 세부 지도가 생기지는 않습니다.
- 같은 좌표의 사진은 최대 확대에서도 유지되며 클릭하면 목록을 표시합니다. 개수는 시간 필터 통과 사진만 계산합니다.

## 검증

Node 20.19 이상 또는 22.12 이상에서:

```sh
node --test tests/*.test.mjs
```

브라우저 군집 확인: http://127.0.0.1:8001/tests/map-harness.html

검사용 화면은 배경 타일을 요청하지 않으며 실제 메인 코드로 확대·축소와 시간 필터를 확인합니다. 공개 타일을 반복 다운로드하는 자동 검사는 하지 마세요. 확인 결과는 `docs/verification.md`를 참고하세요.

## 팀 협업

저장소를 처음 받는 팀원은 `git clone https://github.com/eunwoo806411/WebProgramming.git`으로 내려받으세요.

팀 저장소에서의 작업 예시:

```sh
git switch main
git pull
git switch -c feature/main-map
# 담당 페이지 수정 및 로컬 실행·검사
git add pages/main
git commit -m "feat: implement main photo map"
git push -u origin feature/main-map
```

실제 기본 브랜치명이 다르면 그 이름을 사용하세요. 팀원별로 `feature/login`, `feature/upload`, `feature/mypage`, `feature/explore` 등 담당 브랜치에서 작업하고 PR로 리뷰 후 합칩니다. **shared, data 및 공통 함수 규격을 변경할 때는 팀원과 먼저 조율하세요.** 다른 페이지의 미완성 변경을 함께 커밋하지 않도록 파일을 확인합니다.

실제 운영에는 인증·세션 검증, 사진 파일 저장, 서버 사용자별 조회·좋아요, 권한 확인, 업로드 시각 부여, 공개 데이터에서 작성자 정보 제거가 필요합니다. 이번 구현에는 이 서버들이 포함되지 않습니다.
