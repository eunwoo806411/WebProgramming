import {mountLayout} from '../../shared/js/layout.js';
import {signOut, signInDemo} from '../../shared/js/service.js';
import {pageUrl} from '../../shared/js/routes.js';

await mountLayout('login');

// 로그인 화면에서는 공통 메뉴 링크를 표시하지 않습니다.
document.querySelector('#site-header .nav')?.remove();

const loginForm = document.querySelector('#login-form');
const studentIdInput = document.querySelector('#student-id');
const passwordInput = document.querySelector('#password');
const loginStatus = document.querySelector('#login-status');
const browseButton = document.querySelector('#browse');
const loginButton = document.querySelector('#login-button');
const loginLabel = loginButton.querySelector('.btn-label');
const togglePasswordButton = document.querySelector('#toggle-password');

const LOGIN_LABEL = '숭실대 계정으로 로그인';

// 로그인 성공 후 메인 페이지로 이동
export function completeLogin() {
    location.href = pageUrl('main');
}

// 로그인 요청 중 상태 (중복 클릭 방지)
function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.classList.toggle('is-loading', isLoading);
    loginButton.setAttribute('aria-busy', String(isLoading));
    loginLabel.textContent = isLoading ? '학교 계정 확인 중…' : LOGIN_LABEL;
}

// 비밀번호 보기/숨기기
togglePasswordButton.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePasswordButton.textContent = show ? '숨기기' : '보기';
    togglePasswordButton.setAttribute('aria-pressed', String(show));
    passwordInput.focus();
});

// 입력을 다시 시작하면 이전 오류 메시지 숨기기
[studentIdInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => {
        loginStatus.textContent = '';
    });
});

// 백엔드 로그인 요청
async function signIn(studentId, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            id: studentId,
            password: password
        })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message || '로그인에 실패했습니다.'
        );
    }

    return result;
}

// 로그인 버튼
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value;

    loginStatus.textContent = '';

    if (!studentId) {
        loginStatus.textContent = '학번을 입력해주세요.';
        studentIdInput.focus();
        return;
    }

    if (!password) {
        loginStatus.textContent = '비밀번호를 입력해주세요.';
        passwordInput.focus();
        return;
    }

    setLoading(true);

    try {
        await signIn(studentId, password);

        // 화면 쪽 로그인 상태(헤더, 좋아요, 업로드 등)에 반영
        await signInDemo(studentId);

        completeLogin();
    } catch (error) {
        loginStatus.textContent =
            error.message || '로그인 중 오류가 발생했습니다.';
        passwordInput.select();
        setLoading(false);
    }
});

// 로그인 없이 둘러보기
browseButton.addEventListener('click', async () => {
    try {
        // 백엔드 로그인 세션 종료
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });

        // 화면 쪽 로그인 상태도 초기화
        await signOut();

        completeLogin();
    } catch (error) {
        loginStatus.textContent =
            error.message || '이동 중 오류가 발생했습니다.';
    }
});