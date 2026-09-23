import {getCurrentUser,signOut} from './service.js';
import {pageUrl} from './routes.js';
import {el,notice} from './dom.js';
export async function mountLayout(activePage){
 const header=document.querySelector('#site-header');header.replaceChildren();
 const brand=el('a','brand');brand.href=pageUrl('main');brand.setAttribute('aria-label','숭실 한 장 홈');
 const logo=el('span','brand-mark','▣'), title=el('span','','숭실 한 장');title.append(el('small','','SOONGSIL, ONE FRAME'));brand.append(logo,title);
 const nav=el('nav','nav');nav.setAttribute('aria-label','공통 메뉴');
 for(const [key,label] of [['main','지도에서 발견하기'],['upload','사진 남기기'],['mypage','마이페이지'],['explore','전체 사진']]){
 const link=el('a','',label);link.href=pageUrl(key);if(key===activePage)link.setAttribute('aria-current','page');nav.append(link);}
 const actions=el('div','header-actions');const user=await getCurrentUser();
 if(user){actions.append(el('span','badge','테스트 로그인'));const b=el('button','text-button','로그아웃');b.onclick=async()=>{try{await signOut();location.href=pageUrl('login');}catch(e){notice(e.message);}};actions.append(b);}
 else{const a=el('a','button secondary small','로그인');a.href=pageUrl('login');actions.append(a);}
 header.append(brand,nav,actions);
 const footer=document.querySelector('#site-footer');footer.replaceChildren(el('strong','','숭실 한 장'),el('span','','우리의 시간을 담는 지도.'),el('small','','학생 프로젝트 데모 · 공식 서비스가 아닙니다. 기록은 이 브라우저에만 저장됩니다.'));
}
