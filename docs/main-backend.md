# 메인페이지 백엔드 연결

## 작업 범위
기존 학교 로그인/Express 세션을 그대로 사용한다. 사진 데이터·좋아요·세션과 사진 파일을 별도 저장소로 분리했다. 학교 이메일 인증이나 로그인 방식 변경은 이번 작업에 포함하지 않았다.

## 로컬 실행 (Supabase 계정 불필요)
Node 22.12 이상 23 미만에서 `npm ci`, `npm start` 후 http://localhost:3000 접속.
SQLite와 파일은 `storage/`에 저장한다. 예시 사진은 한 번만 추가한다. 전체 기간 버튼으로 예시 사진을 볼 수 있다. 예시 날짜가 현재보다 오래되었으므로 기본 최근 3일에는 안 보일 수 있다.
학교 계정 없이 쓰기 동작만 테스트하려면 로컬 `.env`에 `ALLOW_TEST_LOGIN=true` 설정. 학번 `test`, 비밀번호 `1234`. 배포 환경에서는 이 로그인을 허용하지 않는다. 실제 학교 자격증명으로 자동 테스트하지 않는다.

## Supabase 생성 뒤 필요한 설정
1. 무료 프로젝트를 만든다. SQL Editor에서 `supabase/migrations/202611060001_main_photos.sql` 적용. 운영 데이터가 이미 있는 프로젝트는 같은 이름 테이블과 자료형이 맞는지 먼저 확인한다.
2. 프로젝트 Connect 메뉴의 **Session pooler** PostgreSQL URI를 `DATABASE_URL`에 설정. Render의 네트워크 환경에 맞는 pooler 주소를 사용한다. TLS 검증은 끄지 않는다. 필요한 경우 Supabase의 서버 CA를 `DATABASE_SSL_CA`에 설정한다.
3. `SUPABASE_URL`, 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=photos` 설정. `photos`는 공개 사진용 버킷이다. 서버 키와 DB URI는 브라우저 코드나 GitHub에 넣지 않는다.
4. Render 환경변수에 동일 값과 고정 `SESSION_SECRET` 설정. `NODE_ENV=production`에서는 외부 저장소가 없거나 설정이 일부만 있으면 실행을 거부한다. 로그인 세션도 외부 DB에 저장하므로 같은 secret과 DB를 유지해야 재시작 뒤 로그인 유지가 가능하다.
5. 업로드 → 메인 조회 → 상세 → 좋아요 → 서버 재시작 → 새로고침을 실제 프로젝트에서 확인한다. 이번 검증은 로컬 저장소 기준이며 원격 저장 유지 검증은 아직 남아 있다.

외부 DB를 사용할 때 예시 사진은 기본으로 넣지 않는다. 필요하면 개발용 프로젝트에만 `SEED_DEMO_PHOTOS=true`로 시작한다. 기존 SQLite 사진/좋아요와 파일은 자동으로 클라우드에 이관하지 않는다. 기존 자료가 있다면 백업 후 팀과 이관 일정을 합의한다.

## 담당자 사이의 데이터 계약
- 사진: `id`, `imageUrl`, `latitude`, `longitude`, `placeName`, `description`, `capturedAt`, `uploadedAt`, `likeCount`, `isDemo`, `liked`.
- 시각은 서버가 UTC ISO로 저장. 메인 시간 기준은 `uploadedAt`.
- 작성자 학번은 공개 사진 API에 포함하지 않음. 쓰기는 세션 사용자로 귀속.
- 업로드 담당도 기존 POST `/api/photos`를 사용하면 같은 저장소로 저장됨. 업로드 화면의 위치 선택 방식·이미지 압축은 유지.
- DB/사진 저장소는 팀 공통이다. 페이지별 DB를 따로 만들지 않는다.

## HTTP API
- GET `/api/photos/extent`: 전체 데이터 시작/끝 업로드 시각. 기본 기간·슬라이더 설정용.
- GET `/api/map/photos?start=...&end=...&south=...&west=...&north=...&east=...`: 지도 사진. `photos,total,periodTotal,truncated`. 10장 제한 없음. 최대 5,000개 이후 `truncated=true`; 더 확대하도록 안내.
- GET `/api/photos?...&limit=10&cursor=...`: 최신순 목록. `photos,total,nextCursor`. 기간·경계 양 끝 포함. 같은 업로드 시각은 ID 내림차순으로 정렬.
- POST `/api/photos/search`, JSON `{query:"start=...&ids=id1%2Cid2&limit=10"}`: 선택 묶음 목록. 최대 5,000개 ID를 긴 URL 대신 JSON으로 전송. ID 목록이 있으면 지도 경계보다 우선하며 기간은 유지.
- GET `/api/photos/:id`: 단일 상세. 없음 404.
- PUT `/api/likes/:id`, JSON `{liked:true}` 또는 `{liked:false}`: 세션 필요. 문자열은 거부. 중복 등록/취소는 멱등. `photo,liked` 반환.
- POST `/api/photos`: 세션 필요. 기존 등록 입력 형식 유지. 이미지 저장 후 메타데이터 실패 시 저장 파일을 정리.
- GET `/api/my/photos`, `/api/my/likes`: 세션 사용자의 목록. 동일 커서 규칙.

날짜는 ISO 시각만 허용한다. 날짜 UI는 날짜 범위를 시각으로 변환해 보낸다. 범위 누락/역전, 중복 파라미터, 잘못된 커서는 400. 클라우드 연결 오류를 예시 사진 응답으로 숨기지 않는다. 전체 사진·마이페이지는 페이지를 반복 조회하여 기존 인터페이스를 유지한다.

## 확인 한계
SQLite HTTP 동작과 파일/세션 재시작 보존, PostgreSQL 스키마/쿼리, Storage 요청 계약을 테스트한다. 실제 Supabase 프로젝트의 인증·네트워크·버킷 설정, 실제 학교 로그인, Render 재시작 후 보존은 프로젝트를 연결한 뒤 확인해야 한다.
