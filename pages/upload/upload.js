import {mountLayout} from '../../shared/js/layout.js';
import {getCurrentUser,createPhoto} from '../../shared/js/service.js';
import {parseKstInput} from '../../shared/js/time.js';
await mountLayout('upload');
const status=document.querySelector('#upload-status');
export function requestLocationSelection(){status.textContent='위치 선택은 아직 연결되지 않았어요. 담당 팀원이 지도 선택 결과를 위도·경도 입력에 연결합니다.';}
export function readUploadInput(form){
 const f=new FormData(form), imageFile=f.get('image');
 if(!imageFile?.size || imageFile.size>8*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(imageFile.type))throw new Error('8MB 이하 JPG, PNG, WEBP 사진을 선택해 주세요.');
 const captured=parseKstInput(f.get('capturedAt'));if(captured===null)throw new Error('촬영 날짜와 시간을 확인해 주세요.');
 const latitude=Number(f.get('latitude')),longitude=Number(f.get('longitude'));
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('위도·경도를 확인해 주세요.');
 return {imageFile,latitude,longitude,placeName:f.get('placeName').trim(),description:f.get('description').trim(),capturedAt:new Date(captured).toISOString()};
}
export async function submitUpload(input){if(!await getCurrentUser())throw new Error('사진 등록은 로그인 후 사용할 수 있어요.');return createPhoto(input);}
document.querySelector('#pick-location').onclick=requestLocationSelection;
document.querySelector('#upload-auth').textContent=await getCurrentUser()?'개발용 테스트 사용자로 접속 중입니다.':'현재 비로그인 상태예요. 사진 등록에는 로그인이 필요합니다.';
document.querySelector('#upload-form').onsubmit=async e=>{e.preventDefault();try{await submitUpload(readUploadInput(e.currentTarget));}catch(error){status.textContent=error.message;}};
