import {mountLayout} from '../../shared/js/layout.js';
import {signInDemo, signOut} from '../../shared/js/service.js';
import {pageUrl} from '../../shared/js/routes.js';

await mountLayout('login');

const loginForm = document.querySelector('#login-form');
const studentIdInput = document.querySelector('#student-id');
const passwordInput = document.querySelector('#password');
const loginStatus = document.querySelector('#login-status');
const browseButton = document.querySelector('#browse');


// 로그인 성공 후 메인 페이지로 이동
export function completeLogin() {
    location.href = pageUrl('main');
}


// 로그인 처리
async function enter(action) {
    try {
        loginStatus.textContent = '';

        await action();

        completeLogin();

    } catch (error) {
        loginStatus.textContent =
            error.message || '로그인 중 오류가 발생했습니다.';
    }
}


// 로그인 버튼
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value.trim();


    // 학번 입력 확인
    if (!studentId) {
        loginStatus.textContent = '학번을 입력해주세요.';
        studentIdInput.focus();

        return;
    }


    // 비밀번호 입력 확인
    if (!password) {
        loginStatus.textContent = '비밀번호를 입력해주세요.';
        passwordInput.focus();

        return;
    }


    // 추후 실제 로그인 기능으로 교체
    await enter(signInDemo);
});


// 로그인 없이 둘러보기
browseButton.addEventListener('click', () => {
    enter(signOut);
});