# Main backend implementation plan

Goal: Server-backed map, paginated sidebar, detail and likes, with external persistence configurable without changing the login provider.
Spec: ../specs/2026-11-06-main-backend-design.md
Method: implement inline, preserve original dirty checkout; no shared-branch push or deployment.

1. Add repository/query validation tests (time bounds, viewport, IDs, cursor, exact count, private fields). Watch failure; implement common parameterized SQL repository with SQLite and PostgreSQL connections.
2. Add HTTP tests (anonymous read/write separation, 50 markers versus 10 rows, detail, likes and restart). Extract app factory and retain existing auth; add cloud/local storage and session stores. Test storage cleanup on metadata failure and fail-closed production config.
3. Add frontend fetch adapter and main request-coordination tests (stale requests cannot replace current data). Replace all-photo preload with server period/map/list/detail requests. Preserve existing time and map behavior.
4. Add Supabase schema/environment/setup instructions and local test login instructions. Run full suite and browser flows. Document that live Supabase/Render verification awaits account configuration.

Review focus: invalid/duplicate query values; equal timestamps at pagination boundaries; selected cluster vs viewport; stale network responses after dragging; lost remote connection must not silently return mock data; no credential exposure or deployment fallback.

## 완료 및 검증 (2026-11-06)
- 1–4 코드·스키마·설정 안내 작성 완료. 사용자 요청에 따라 Supabase 생성/연결과 배포는 보류.
- Node 22.23.4 전체 테스트 49/49 통과. 실제 로컬 HTTP, SQLite 재시작 보존, PGlite PostgreSQL 마이그레이션/쿼리, 공식 Storage SDK 요청 계약, jsdom HTML/API 연결 포함.
- 별도 코드 검토에서 확인한 세션 touch로 인한 로그아웃 취소 문제를 UPDATE로 수정하고 회귀 테스트 추가. 지도만 조회 실패할 때 독립적인 재시도 버튼 추가 및 HTML 테스트로 확인.
- 브라우저 연결 도구 불가로 실제 브라우저 화면·Leaflet 상호작용은 검증하지 못함. 실제 Supabase/Render/학교 로그인 검증은 연결 뒤 필요.
- 원본 작업 디렉터리의 미커밋 변경은 보존. 기능 브랜치만 로컬 보관하며 push/merge/deploy하지 않음.
