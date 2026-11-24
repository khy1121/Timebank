import { fetchKakaoFriends, kakaoApiMessage } from '../kakao';

function fakeFetch(pages: { status: number; body: unknown }[]) {
  const calls: string[] = [];
  const fn = (async (url: string) => {
    calls.push(url);
    const p = pages[calls.length - 1];
    return { ok: p.status < 400, json: async () => p.body } as Response;
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('카카오 친구 목록 (FR-108)', () => {
  it('다음 쪽 주소를 따라가며 회원 번호를 모은다', async () => {
    const { fn, calls } = fakeFetch([
      { status: 200, body: { elements: [{ id: 111, profile_nickname: '지우' }], after_url: 'https://kapi.kakao.com/next' } },
      { status: 200, body: { elements: [{ id: 222 }], after_url: null } },
    ]);
    const r = await fetchKakaoFriends('tok', fn);
    expect(r).toEqual({ ok: true, friends: [{ id: '111', nickname: '지우' }, { id: '222', nickname: '' }] });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBe('https://kapi.kakao.com/next');
  });

  it('카카오 오류 코드를 문구로', async () => {
    const { fn } = fakeFetch([{ status: 403, body: { code: -402, msg: 'insufficient scopes' } }]);
    expect(await fetchKakaoFriends('tok', fn)).toEqual({ ok: false, message: kakaoApiMessage(-402) });
    expect(kakaoApiMessage(-402)).toContain('동의');
    expect(kakaoApiMessage(undefined)).toBe('카카오톡 친구 목록을 받아 오지 못했어요.');
  });
});
