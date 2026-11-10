# 숭실 한 장

숭실대학교의 풍경과 일상을 **사진 · 지도 · 시간**으로 남기고 둘러보는 팀 프로젝트입니다.
캠퍼스 지도 위에 사진을 남기고, 기간을 바꿔 가며 "같은 장소, 다른 시간"을 발견할 수 있습니다.

- **웹사이트**: https://soongsil-one-frame.onrender.com
- 화면은 일반 HTML/CSS/JavaScript(ES modules)로 만들었고 프레임워크·빌드 과정이 없습니다.
- **PC 전용**(최소 폭 1100px) 화면입니다.

> GitHub Pages(`eunwoo806411.github.io/WebProgramming`)에는 서버가 없어서 로그인·사진 기능이 동작하지 않습니다. 위 Render 주소(https://soongsil-one-frame.onrender.com)를 사용하세요.

## 구조

```text
브라우저 (HTML / CSS / JavaScript)
   │  우리 사이트의 /api/... 요청
   ▼
Node.js 22 + Express 5 서버  (Render)
   ├─ PostgreSQL ─▶ Supabase DB       사진 정보 · 좋아요 · 닉네임 · 로그인 세션
   ├─ Storage API ─▶ Supabase Storage  사진 파일(JPEG)
   └─ 로그인 확인 ─▶ 숭실대 통합로그인(Smart ID)
```

- 브라우저는 DB에 직접 접근하지 않습니다. 모든 데이터는 서버 API를 거칩니다.
- 학교 비밀번호는 학교 로그인 확인에만 쓰고 저장하지 않습니다.
- 공개 사진 API에는 작성자 학번이 포함되지 않습니다.
- 외부 저장소 설정이 없으면(로컬 개발) SQLite와 `storage/` 폴더를 대신 사용합니다.

## 페이지와 담당 파일

| 페이지 | 파일 | 기능 |
|---|---|---|
| 로그인 | `pages/login/*` | 학번·비밀번호로 학교 계정 확인, 로그인 없이 둘러보기. `?next=`로 로그인 후 원래 페이지 복귀 |
| 지도에서 발견하기 (메인) | `pages/main/*` | 캠퍼스 지도의 사진 묶음, 기간 필터(기본 최근 3일), 지도 범위별 목록 10장씩 더 보기, 상세·좋아요 |
| 사진 남기기 | `pages/upload/*` | 사진 고르기(끌어다 놓기·HEIC 지원), 지도 핀 또는 건물로 위치 선택, 촬영 시각 자동 입력. 자세한 내용은 [`pages/upload/README.md`](pages/upload/README.md) |
| 마이페이지 | `pages/mypage/*` | 프로필·등급, 발자취 지도, 활동 기록, 내 사진 수정·삭제, 좋아요한 사진, 닉네임 변경, 통계 |
| 전체 사진 | `pages/explore/*` | 최신순·인기순 24장씩 더 보기, 상세 창 |
| 공통 화면 | `shared/css/common.css`, `shared/js/*` | 메뉴·경로·상세 창·시간 처리·서버 통신. **수정 전 팀원과 조율** |
| 서버 | `server.js`, `shared/server/*` | 로그인·세션, 사진 API, DB·Storage 연결 |
| DB 스키마 | `supabase/migrations/*.sql` | Supabase에 번호 순서대로 적용 |
| 샘플 | `data/mock-photos.js` | 로컬 개발용 예시 사진 12장 (배포에서는 넣지 않음) |

페이지는 `shared/js/service.js`만 통해 데이터에 접근합니다. 공통 코드를 페이지 안에 복사하지 말고 import하세요.

## 로컬에서 실행

Node.js **22.12 이상 23 미만**이 필요합니다.

```sh
npm ci
npm start
```

브라우저에서 http://localhost:3000 을 엽니다. `file://`이나 Python 정적 서버로는 로그인·사진 기능이 동작하지 않습니다.

- 외부 저장소 환경변수가 없으면 `storage/`의 SQLite와 사진 폴더를 씁니다. 실제 배포 데이터와 연결되지 않습니다.
- 예시 사진 12장이 한 번 추가됩니다. 날짜가 2026년 9월이라 기본 "최근 3일"에는 안 보이니 **전체** 버튼을 누르세요.
- 학교 계정 없이 테스트하려면 `.env`에 `ALLOW_TEST_LOGIN=true`를 넣고 학번 `test`, 비밀번호 `1234`로 로그인합니다. **이 테스트 로그인은 배포 환경(`NODE_ENV=production`)에서는 항상 막혀 있습니다.**

`.env.example`을 복사해 `.env`를 만들면 됩니다. `.env`는 Git에 올리지 마세요.

## 배포 (Render + Supabase)

1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/migrations/`의 SQL을 **번호 순서대로** 실행합니다. (`photos` 버킷도 함께 만들어집니다)
2. Render에서 이 저장소의 `main` 브랜치로 Web Service를 만듭니다. Build `npm ci`, Start `npm start`, Health Check `/api/health`.
3. Render 환경변수를 설정합니다.

| 변수 | 값 |
|---|---|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | 긴 임의 문자열 (Render의 Generate 사용) |
| `DATABASE_URL` | Supabase **Connect → Session pooler** 주소. 비밀번호 특수문자는 URL 인코딩 |
| `DATABASE_SSL_CA` | Supabase **Project Settings → Database → SSL Configuration**에서 받은 인증서 내용 전체 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 Secret 키 |
| `SUPABASE_STORAGE_BUCKET` | `photos` |
| `SEED_DEMO_PHOTOS` | `false` |

- 배포 모드에서는 DB·Storage·세션 설정이 하나라도 빠지면 서버가 시작을 멈춥니다.
- **Secret 키, DB 주소, `.env`는 GitHub·단체방·공유 문서에 올리지 마세요.**
- Render 무료 서버는 15분 동안 접속이 없으면 잠들고, 다음 접속 때 깨어나는 데 30초~1분 걸립니다. 데이터는 Supabase에 있어서 사라지지 않습니다.

자세한 설정과 API는 [메인페이지 백엔드 안내](docs/main-backend.md), [백엔드 인수인계](docs/team-backend-handover.md)를 참고하세요.

## 데이터

```js
// 공개 API가 돌려주는 사진
{
  id: 'upload-...',
  imageUrl: 'https://...supabase.co/storage/v1/object/public/photos/upload-....jpg',
  latitude: 37.4964, longitude: 126.95705,
  placeName: '중앙 잔디광장',          // 100자 이내
  description: '봄 수업 사이, 잠깐의 산책.', // 1000자 이내
  capturedAt: '2026-04-08T05:23:00.000Z',  // 촬영 시각 (사용자 입력·사진 정보, UTC 저장)
  uploadedAt: '2026-09-22T00:00:00.000Z',  // 업로드 시각 (서버가 기록)
  likeCount: 128, liked: false, isDemo: false
}
```

- 화면의 입력·표시는 한국 시간(KST), 저장은 UTC ISO 문자열입니다.
- 메인 기간 필터와 최신순 정렬은 **업로드 시각** 기준입니다. (`shared/js/config.js`의 `timeField`)
- 사진은 브라우저에서 긴 변 1600px JPEG로 줄여 올리며, 원본과 EXIF(위치 등)는 저장하지 않습니다.

## 주요 API

| 요청 | 설명 |
|---|---|
| `POST /api/login`, `POST /api/logout` | 학교 계정 로그인·로그아웃 |
| `GET /api/me`, `PATCH /api/me` | 내 프로필 조회·닉네임 변경 (2~12자) |
| `GET /api/photos/extent` | 전체 사진의 업로드 시각 범위 |
| `GET /api/map/photos` | 기간·지도 범위 안의 지도용 사진 |
| `GET /api/photos`, `POST /api/photos/search` | 목록 (기간·지도 범위·정렬·커서), 선택한 묶음 목록 |
| `GET /api/photos/:id` | 사진 상세 |
| `POST /api/photos` | 사진 등록 (로그인 필요) |
| `PATCH /api/photos/:id`, `DELETE /api/photos/:id` | 내 사진 수정·삭제 |
| `PUT /api/likes/:id` | 좋아요 등록·취소 (`{liked:true/false}`) |
| `GET /api/my/photos`, `GET /api/my/likes` | 내 사진, 내가 좋아요한 사진 |
| `GET /api/health` | 서버 상태 확인 |

## 지도

[Leaflet 1.9.4](https://leafletjs.com/)와 [OpenStreetMap 표준 타일](https://operations.osmfoundation.org/policies/tiles/)을 사용하며 API 키가 필요 없습니다.

- 지도 오른쪽 아래의 OpenStreetMap 출처 표시를 가리지 마세요.
- 타일을 대량으로 미리 받거나 반복 다운로드하는 기능·검사를 추가하지 마세요.
- 캠퍼스 범위·중심·확대 단계는 `shared/js/config.js`에서 관리합니다.
- 같은 좌표의 사진은 하나로 묶고, 축소하면 가까운 묶음을 다시 합칩니다.

## 테스트

```sh
npm test
```

테스트는 실제 Supabase와 분리된 임시 저장소에서 실행되며 실제 사진을 바꾸지 않습니다.

## 팀 협업

```sh
git switch main
git pull
git switch -c feature/upload        # 담당 기능 브랜치
# 수정 → npm test → 로컬 확인
git add pages/upload
git commit -m "feat: ..."
git push -u origin feature/upload   # GitHub에서 PR → 리뷰 후 main에 병합
```

- `main`에 합쳐지면 Render가 자동으로 다시 배포합니다. Render는 조장 계정에만 있으니 배포 오류는 조장이 로그를 공유합니다.
- `shared/`, `data/`, 서버 API 규격을 바꿀 때는 팀원과 먼저 조율하세요.
- 다른 사람의 미완성 파일이 같이 커밋되지 않도록 `git status`로 확인하세요.
