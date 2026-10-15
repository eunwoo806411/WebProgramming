import {mountLayout} from '../../shared/js/layout.js';
import {getCurrentUser, signOut} from '../../shared/js/service.js';
import {pageUrl} from '../../shared/js/routes.js';

await mountLayout('login');
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
let busy = false;

export function completeLogin() {
    location.href = pageUrl('main');
}

// 로그인과 둘러보기가 동시에 실행되지 않도록 함께 잠급니다.
function setBusy(value, signingIn = false) {
    busy = value;
    loginButton.disabled = value;
    browseButton.disabled = value;
    studentIdInput.disabled = value;
    passwordInput.disabled = value;
    togglePasswordButton.disabled = value;
    loginButton.classList.toggle('is-loading', value && signingIn);
    loginButton.setAttribute('aria-busy', String(value && signingIn));
    browseButton.setAttribute('aria-busy', String(value && !signingIn));
    loginLabel.textContent = value && signingIn ? '학교 계정 확인 중…' : LOGIN_LABEL;
}

togglePasswordButton.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePasswordButton.textContent = show ? '숨기기' : '보기';
    togglePasswordButton.setAttribute('aria-pressed', String(show));
    passwordInput.focus();
});

[studentIdInput, passwordInput].forEach(input => {
    input.addEventListener('input', () => { loginStatus.textContent = ''; });
});

async function signIn(id, password) {
    let response;
    try {
        response = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify({id, password})
        });
    } catch {
        throw new Error('서버에 연결할 수 없어요. 서버 실행 상태를 확인해 주세요.');
    }
    let result;
    try { result = await response.json(); }
    catch { throw new Error('서버 응답이 올바르지 않아요. Node 서버 주소로 접속했는지 확인해 주세요.'); }
    if (!response.ok || !result?.success) {
        throw new Error(result?.message || '로그인에 실패했습니다.');
    }
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value;
    loginStatus.textContent = '';
    if (!studentId) {
        loginStatus.textContent = '학번을 입력해 주세요.';
        studentIdInput.focus();
        return;
    }
    if (!password) {
        loginStatus.textContent = '비밀번호를 입력해 주세요.';
        passwordInput.focus();
        return;
    }
    setBusy(true, true);
    let failed = false;
    try {
        await signIn(studentId, password);
        // 성공 응답뿐 아니라 실제 세션이 유지되는지도 확인합니다.
        const user = await getCurrentUser();
        if (!user || user.id !== studentId) {
            throw new Error('로그인 상태를 확인하지 못했어요. 쿠키 설정을 확인하고 다시 시도해 주세요.');
        }
        passwordInput.value = '';
        completeLogin();
    } catch (error) {
        failed = true;
        loginStatus.textContent = error.message || '로그인 중 오류가 발생했습니다.';
    } finally {
        setBusy(false);
        if (failed) passwordInput.select();
    }
});

browseButton.addEventListener('click', async event => {
    event.preventDefault();
    if (busy) return;
    loginStatus.textContent = '';
    setBusy(true);
    try {
        // 한 번만 요청하며, 실패하면 이동하지 않습니다.
        await signOut();
        passwordInput.value = '';
        completeLogin();
    } catch (error) {
        loginStatus.textContent = error.message || '로그아웃하지 못해 이동하지 않았어요.';
    } finally {
        setBusy(false);
    }
});
