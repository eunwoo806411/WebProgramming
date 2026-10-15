import {getCurrentUser,signOut} from './service.js';
import {pageUrl} from './routes.js';
import {el,notice} from './dom.js';
// 마이페이지 메뉴에 마우스를 올리면 펼쳐지는 하위 메뉴 (#해시로 마이페이지 안 화면으로 이동)
const MYPAGE_MENU=[['account','내 정보 확인'],['my-photos','내 사진 관리'],['liked','좋아요한 사진'],['stats','내 통계']];
export async function mountLayout(activePage){
 const header=document.querySelector('#site-header');header.replaceChildren();
 const brand=el('a','brand');brand.href=pageUrl('main');brand.setAttribute('aria-label','숭실 한 장 홈');
 const logo=el('span','brand-mark','▣'), title=el('span','','숭실 한 장');title.append(el('small','','SOONGSIL, ONE FRAME'));brand.append(logo,title);
 const nav=el('nav','nav');nav.setAttribute('aria-label','공통 메뉴');
 for(const [key,label] of [['main','지도에서 발견하기'],['upload','사진 남기기'],['mypage','마이페이지'],['explore','전체 사진']]){
 const link=el('a','',label);link.href=pageUrl(key);if(key===activePage)link.setAttribute('aria-current','page');
 if(key==='mypage'){nav.append(mountMypageMenu(link));continue;}
 nav.append(link);}
 const actions=el('div','header-actions');const user=await getCurrentUser();
 if(user){actions.append(el('span','badge','테스트 로그인'));const b=el('button','text-button','로그아웃');b.onclick=async()=>{try{await signOut();location.href=pageUrl('login');}catch(e){notice(e.message);}};actions.append(b);}
 else{const a=el('a','button secondary small','로그인');a.href=pageUrl('login');actions.append(a);}
 header.append(brand,nav,actions);
 const footer=document.querySelector('#site-footer');footer.replaceChildren(el('strong','','숭실 한 장'),el('span','','우리의 시간을 담는 지도.'),el('small','','학생 프로젝트 데모 · 공식 서비스가 아닙니다. 기록은 이 브라우저에만 저장됩니다.'));
}
function mountMypageMenu(link){
 const item=el('div','nav-item');link.setAttribute('aria-haspopup','true');
 const sub=el('div','nav-sub');sub.setAttribute('aria-label','마이페이지 메뉴');
 for(const [hash,label] of MYPAGE_MENU){
  const a=el('a','',label);a.href=`${pageUrl('mypage')}#${hash}`;
  // 같은 페이지 안에서 이동할 때 메뉴가 열린 채로 남지 않도록 포커스를 풀어줌
  a.addEventListener('click',()=>{a.blur();item.classList.add('closed');});
  sub.append(a);
 }
 item.addEventListener('mouseleave',()=>item.classList.remove('closed'));
 item.addEventListener('keydown',e=>{if(e.key==='Escape'){item.classList.add('closed');link.focus();}});
 item.addEventListener('focusin',()=>item.classList.remove('closed'));
 item.append(link,sub);return item;
}