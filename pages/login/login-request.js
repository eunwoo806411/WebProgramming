export async function signIn(id, password, {fetchImpl = fetch, timeoutMs = 25000} = {}) {
    const controller = new AbortController();
    const timeoutError = () => new Error('로그인 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const deadline = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(timeoutError()), {once: true});
    });
    const request = async () => {
        let response;
        try {
            response = await fetchImpl('/api/login', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                credentials: 'same-origin', signal: controller.signal,
                body: JSON.stringify({id, password})
            });
        } catch { throw new Error('로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
        let result;
        try { result = await response.json(); }
        catch { throw new Error('로그인 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
        if (!response.ok || !result?.success) throw new Error(result?.message || '로그인에 실패했습니다.');
        const session = await fetchImpl('/api/me', {credentials: 'same-origin', signal: controller.signal});
        const current = await session.json();
        if (!session.ok || !current.success || current.user?.id !== id) {
            throw new Error('로그인 상태를 확인하지 못했어요. 쿠키 설정을 확인하고 다시 시도해 주세요.');
        }
        return current.user;
    };
    try { return await Promise.race([request(), deadline]); }
    catch (error) { if (controller.signal.aborted) throw timeoutError(); throw error; }
    finally { clearTimeout(timer); }
}
