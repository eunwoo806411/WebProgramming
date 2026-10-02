import {mountLayout} from '../../shared/js/layout.js';
import {photoUrl} from '../../shared/js/routes.js';
import {createPhotoCard} from '../../shared/js/photo-ui.js';
import {listPhotos} from '../../shared/js/service.js';

await mountLayout('explore');

let order = 'latest';


// 현재 정렬 방식 반환
export function getExploreQuery() {
    return {order};
}


// 사진 클릭 시 상세 페이지로 이동
export function openPhoto(id) {
    location.href = photoUrl(id);
}


// 사진 목록 화면에 표시
export function renderExplorePhotos(photos) {
    const grid = document.querySelector('#explore-grid');
    const status = document.querySelector('#explore-status');

    grid.replaceChildren(
        ...photos.map(photo =>
            createPhotoCard(
                photo,
                () => openPhoto(photo.id)
            )
        )
    );

    if (photos.length === 0) {
        status.hidden = false;
        status.textContent = '아직 등록된 사진이 없어요.';
    } else {
        status.hidden = true;
        status.textContent = '';
    }
}


// 최신순 / 인기순 선택
function selectOrder(value) {
    order = value;

    for (const type of ['latest', 'popular']) {
        document
            .querySelector(`#${type}`)
            .setAttribute(
                'aria-pressed',
                String(type === order)
            );
    }

    const description =
        document.querySelector('#sort-description');

    if (order === 'latest') {
        description.textContent =
            '업로드 시각이 최근인 사진부터 표시합니다.';
    } else {
        description.textContent =
            '좋아요가 많은 사진부터 표시합니다.';
    }
}


// 사진 불러오기
async function loadPhotos() {
    const status = document.querySelector('#explore-status');

    try {
        status.hidden = false;
        status.textContent = '사진을 불러오는 중이에요.';

        const photos =
            await listPhotos(getExploreQuery());

        renderExplorePhotos(photos);

    } catch (error) {
        console.error(error);

        status.hidden = false;
        status.textContent =
            '사진을 불러오지 못했습니다.';
    }
}


// 최신순 버튼
document
    .querySelector('#latest')
    .addEventListener('click', async () => {
        selectOrder('latest');
        await loadPhotos();
    });


// 인기순 버튼
document
    .querySelector('#popular')
    .addEventListener('click', async () => {
        selectOrder('popular');
        await loadPhotos();
    });


// 처음 페이지를 열면 최신순으로 표시
selectOrder('latest');
await loadPhotos();