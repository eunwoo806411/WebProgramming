const SMARTID = 'https://smartid.ssu.ac.kr/Symtra_sso';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
const failure = (code, status, message) => Object.assign(new Error(message), {code, status});
const unavailable = () => failure('AUTH_SERVICE_UNAVAILABLE', 502, '학교 로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
const timeout = () => failure('AUTH_TIMEOUT', 504, '학교 로그인 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
const cookiePairs = response => response.headers.getSetCookie().map(value => value.split(';')[0]);

function pickInput(html, name) {
    const tag = html.match(new RegExp(`<input[^>]*name=["']${name}["'][^>]*>`, 'i'))?.[0];
    return tag?.match(/value=["']([^"']*)["']/i)?.[1];
}

export function loginErrorResponse(error) {
    if (['AUTH_REJECTED', 'AUTH_TIMEOUT', 'AUTH_SERVICE_UNAVAILABLE'].includes(error?.code)) {
        return {status: error.status, code: error.code, message: error.message};
    }
    const safe = unavailable();
    return {status: safe.status, code: safe.code, message: safe.message};
}

export async function ssuLogin(id, password, {fetchImpl = fetch, timeoutMs = 15000} = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // The deadline also covers response bodies and a stalled upstream connection.
    const deadline = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(timeout()), {once: true});
    });
    const authenticate = async () => {
        const page = await fetchImpl(`${SMARTID}/smln.asp`, {
            headers: {'User-Agent': UA}, signal: controller.signal
        });
        if (!page.ok) throw unavailable();
        const html = await page.text();
        const inTp = pickInput(html, 'in_tp_bit');
        const rqst = pickInput(html, 'rqst_caus_cd');
        if (inTp === undefined || rqst === undefined) throw unavailable();
        const response = await fetchImpl(`${SMARTID}/smln_pcs.asp`, {
            method: 'POST', redirect: 'manual', signal: controller.signal,
            headers: {'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookiePairs(page).join('; ')},
            body: new URLSearchParams({in_tp_bit: inTp, rqst_caus_cd: rqst, userid: id, pwd: password})
        });
        if (response.status >= 400) throw unavailable();
        if (cookiePairs(response).some(cookie => /^sToken=.+/.test(cookie))) return true;
        const bytes = await response.arrayBuffer();
        let body;
        try { body = new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
        catch { body = new TextDecoder('euc-kr').decode(bytes); }
        // An explicit rejection is different from an unexpected SSO response.
        const message = body.match(/alert\(["']([^"']*)["']\)/)?.[1];
        if (!message) throw unavailable();
        throw failure('AUTH_REJECTED', 401, message.replace(/\\n/g, ' '));
    };
    try { return await Promise.race([authenticate(), deadline]); }
    catch (error) {
        if (controller.signal.aborted) throw timeout();
        if (['AUTH_REJECTED', 'AUTH_SERVICE_UNAVAILABLE'].includes(error?.code)) throw error;
        throw unavailable();
    } finally { clearTimeout(timer); }
}
