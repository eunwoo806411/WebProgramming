// 사진 등록에서 "건물로 위치 선택"에 쓰는 숭실대학교 건물 목록입니다.
// 좌표는 OpenStreetMap(© OpenStreetMap contributors, ODbL)에 등록된 각 건물 외곽선의 중심점입니다.
// 모두 CONFIG.map.maxBounds(캠퍼스 범위) 안에 있어야 합니다. 건물을 추가·수정하면 tests/upload-buildings.test.mjs로 확인하세요.
// aliases: 검색창에서 함께 찾을 수 있는 다른 이름·줄임말
export const CAMPUS_BUILDINGS = Object.freeze([
  {id: 'baird', name: '베어드홀', latitude: 37.496358, longitude: 126.955923, aliases: ['본관']},
  {id: 'sungdeok', name: '숭덕경상관', latitude: 37.496934, longitude: 126.954907, aliases: ['경상관']},
  {id: 'culture', name: '문화관', latitude: 37.496440, longitude: 126.954378},
  {id: 'ahn-eaktai', name: '안익태기념관', latitude: 37.495795, longitude: 126.955010, aliases: ['안익태']},
  {id: 'hyungnam', name: '형남공학관', latitude: 37.495876, longitude: 126.955655, aliases: ['공학관', '형남']},
  {id: 'education', name: '교육관', latitude: 37.497817, longitude: 126.956834},
  {id: 'baekma', name: '백마관', latitude: 37.497837, longitude: 126.956151},
  {id: 'hankyungjik', name: '한경직기념관', latitude: 37.495690, longitude: 126.957589, aliases: ['한경직']},
  {id: 'sinyang', name: '신양관', latitude: 37.496497, longitude: 126.958259, aliases: ['생활문화관']},
  {id: 'venture', name: '벤처중소기업센터', latitude: 37.497572, longitude: 126.957413, aliases: ['벤처관']},
  {id: 'jilli', name: '진리관', latitude: 37.497170, longitude: 126.957388},
  {id: 'cho-mansik', name: '조만식기념관', latitude: 37.497075, longitude: 126.957954, aliases: ['조만식']},
  {id: 'museum', name: '한국기독교박물관', latitude: 37.495632, longitude: 126.957018, aliases: ['박물관']},
  {id: 'library', name: '중앙도서관', latitude: 37.496281, longitude: 126.958612, aliases: ['도서관']},
  {id: 'research', name: '연구관', latitude: 37.496264, longitude: 126.959223},
  {id: 'changsin', name: '창신관', latitude: 37.495904, longitude: 126.959926},
  {id: 'global-brain', name: '글로벌브레인홀', latitude: 37.495703, longitude: 126.960475, aliases: ['글브']},
  {id: 'residence', name: '레지던스홀', latitude: 37.495191, longitude: 126.960171, aliases: ['기숙사', '레지던스']},
  {id: 'computing', name: '전산관', latitude: 37.495463, longitude: 126.959489},
  {id: 'mirae', name: '미래관', latitude: 37.495620, longitude: 126.958496},
  {id: 'info-science', name: '정보과학관', latitude: 37.494571, longitude: 126.959700, aliases: ['정과관', '정보관']},
  {id: 'westminster', name: '웨스트민스터홀', latitude: 37.496788, longitude: 126.958428, aliases: ['웨스트민스터']},
  {id: 'changui', name: '창의관', latitude: 37.494652, longitude: 126.959111, aliases: ['정주영창업센터']},
  {id: 'student-union', name: '학생회관', latitude: 37.497086, longitude: 126.957081, aliases: ['학관']}
].map(b => Object.freeze({aliases: [], ...b})).sort((a, b) => a.name.localeCompare(b.name, 'ko')));

const normalize = text => String(text ?? '').replace(/\s+/g, '').toLowerCase();

// 이름·별칭에 검색어가 들어간 건물을 가나다순으로 돌려줍니다. 빈 검색어는 전체 목록입니다.
export function searchBuildings(query, buildings = CAMPUS_BUILDINGS) {
  const q = normalize(query);
  if (!q) return [...buildings];
  return buildings.filter(b => [b.name, ...b.aliases].some(name => normalize(name).includes(q)));
}

export const findBuilding = (id, buildings = CAMPUS_BUILDINGS) => buildings.find(b => b.id === id) ?? null;
