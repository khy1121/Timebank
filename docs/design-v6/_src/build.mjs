import fs from 'node:fs';
import path from 'node:path';
import { themes as t1 } from './themes.mjs';
import { themes as t2 } from './themes2.mjs';
const themes = [...t1, ...t2];

const OUT = 'C:/app(dev)/01-todo-interest/docs/design-v6';
const M = 'data:image/png;base64,' + fs.readFileSync('C:/app(dev)/01-todo-interest/app/assets/images/outfits/none.png').toString('base64');
fs.mkdirSync(OUT, { recursive: true });

const icons = {
  todo: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></svg>',
  rank: '<svg viewBox="0 0 24 24"><path d="M6 20V11M12 20V5M18 20v-6"/></svg>',
  group: '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 19c.6-3 3-4.5 6-4.5s5.400 1.500 6 4.500M16 14.800c2.400 0 4.200 1.200 5 3.700"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M5 9h14l-1 11H6L5 9zM9 9V7a3 3 0 016 0v2"/></svg>',
};
const tabs = (on) =>
  `<nav class="tabs">${[['todo', '할 일'], ['rank', '순위'], ['group', '그룹'], ['shop', '상점']]
    .map(([k, l]) => `<a class="${k === on ? 'on' : ''}">${icons[k]}<span>${l}</span></a>`)
    .join('')}</nav>`;
const stamp = (label, tone) => `<span class="stamp ${tone}">${label}</span>`;
const box = (n) => `<span class="boxed" aria-label="${n}">${[...n].map((c) => (c === ',' ? '<i class="cm">,</i>' : `<i class="dg">${c}</i>`)).join('')}</span>`;
const ring = (p) => `<svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="tr"/><circle cx="50" cy="50" r="42" class="pr" pathLength="100" stroke-dasharray="${p} 100"/></svg>`;
const h = { M, stamp, box, tabs, ring };

const todos = `<ul class="todos">
  <li class="todo late"><span class="check"></span><div><strong>세금 신고 자료 정리</strong><small>3일 늦음</small></div><b class="num pay">2,100</b></li>
  <li class="todo"><span class="check"></span><div><strong>보고서 초안</strong><small>오늘까지</small></div><b class="num pay">2,200</b></li>
  <li class="todo"><span class="check"></span><div><strong>헬스장 가기</strong><small>토요일까지</small></div><b class="num pay">3,300</b></li>
  <li class="todo"><span class="check"></span><div><strong>책 반납</strong><small>다음 주 화요일까지</small></div><b class="num pay">1,100</b></li>
</ul>`;
const seg = (a, b, on = 0) => `<div class="seg"><button class="${on === 0 ? 'on' : ''}">${a}</button><button class="${on === 1 ? 'on' : ''}">${b}</button></div>`;

Object.assign(h, { seg, todos });
const home = (t) => `<div class="phone">
  <div class="status">9:41</div>
  <header class="top"><h1>할 일 이자</h1><span class="wallet"><i class="coin"></i><b class="num">7,300</b><span>냥</span></span></header>
  <div class="body">${t.hero(h)}${seg('진행 중 4', '끝낸 일')}${todos}</div>
  <button class="btn primary fab">할 일 추가</button>
  ${tabs('todo')}
</div>`;

const detail = (t) => `<div class="phone">
  <div class="status">9:41</div>
  <header class="top sub"><span class="back">‹</span><span class="edit">수정</span></header>
  <div class="body">
    <div class="headline"><h2 class="title">헬스장 가기</h2><p class="due">토요일까지 <button class="pill">기한 미루기</button></p></div>
    <dl class="calc">
      <div><dt>원금</dt><dd class="num">3,000</dd></div>
      <div><dt>이자</dt><dd class="num plus">+300</dd></div>
      <div class="faint"><dt>늦으면 하루</dt><dd class="num">−300</dd></div>
      <div class="total"><dt>돌려받을 냥</dt><dd class="num">${t.boxTotal ? box('3,300') : '3,300'}</dd></div>
    </dl>
  </div>
  <div class="actions"><button class="btn primary">끝냈어요</button><button class="btn text danger">포기하기</button></div>
</div>`;

const rank = () => `<div class="phone">
  <div class="status">9:41</div>
  <header class="top"><h1>순위</h1><span class="wallet"><i class="coin"></i><b class="num">7,300</b><span>냥</span></span></header>
  <div class="body">
    ${seg('이번 주', '이번 달')}
    <p class="mine"><b class="num">12</b>명 중 <b class="num big">3</b>등</p>
    <ol class="rank">
      <li><b class="pos num">1</b><span class="who">준호</span>${stamp('부지런', 'ok')}<b class="num score">2,250</b></li>
      <li><b class="pos num">2</b><span class="who">민지</span>${stamp('성실', 'ok')}<b class="num score">1,720</b></li>
      <li class="me"><b class="pos num">3</b><span class="who">현영 (나)</span>${stamp('성실', 'ok')}<b class="num score">1,350</b></li>
      <li><b class="pos num">4</b><span class="who">서연</span>${stamp('벼락치기', 'warn')}<b class="num score">600</b></li>
      <li><b class="pos num">5</b><span class="who">도윤</span>${stamp('빚더미', 'bad')}<b class="num score neg">−1,830</b></li>
    </ol>
  </div>
  ${tabs('rank')}
</div>`;

const kit = (t) => {
  const items = [
    ['버튼', `<button class="btn primary">끝냈어요</button><button class="btn secondary">기한 미루기</button><button class="btn text danger">포기하기</button>`],
    ['고르기', `${seg('진행 중 4', '끝낸 일')}<div class="chips"><button class="chip">1일</button><button class="chip on">2일</button><button class="chip">3일</button><button class="chip">7일</button></div>`],
    ['입력', `<label class="field"><span>무슨 일인가요?</span><input value="헬스장 가기"></label><label class="field"><span>걸 냥</span><input class="num" value="3,000"></label>`],
    ['도장', `<div class="stamps">${stamp('적립', 'ok')}${stamp('연체', 'warn')}${stamp('포기', 'bad')}${stamp('대기', 'wait')}</div><div class="stamps">${stamp('부지런', 'ok')}${stamp('성실', 'ok')}${stamp('벼락치기', 'warn')}${stamp('빚더미', 'bad')}</div>`],
    ['잔액과 변화', `<div class="balance"><b class="num bal">${t.boxTotal ? box('7,300') : '7,300'}</b><span class="unit">냥</span><span class="delta num">+300</span></div><p class="note">끝내면 숫자가 한 자리씩 굴러 올라가고, 변화량이 옆에 2초 동안 남는다.</p>`],
    ['알림', `<div class="toast"><span>빚이 있어서 상점을 쓸 수 없어요</span><button>빚 보기</button></div>`],
    ['인증 카드', `<article class="proof"><header><img src="${M}" alt=""><b>준호</b><small>어제</small>${stamp('통과', 'ok')}</header><div class="photo"></div><p><strong>보고서 초안 끝내기</strong></p><footer><button class="chip on">인정 2</button><button class="chip">의심 0</button><span class="num plus">+150</span></footer></article>`],
    ['아래 탭', `<div class="tabwrap">${tabs('todo')}</div>`],
  ];
  return items.map(([n, html]) => `<div class="kit-item"><h3>${n}</h3><div class="kit-body">${html}</div></div>`).join('');
};

const base = fs.readFileSync(new URL('./base.css', import.meta.url), 'utf8');

for (const t of themes) {
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.no} ${t.name} · 할 일 이자 v6 시안</title>
${t.fonts}
<style>
${base}
${t.css}
</style>
</head>
<body class="t-${t.key}">
<div class="wrap">
  <header class="doc-head">
    <p class="crumb"><a href="index.html">v6 시안 다섯 가지</a> / ${t.no}</p>
    <h1>${t.name}</h1>
    <p class="lede">${t.lede}</p>
    <dl class="facts">
      <div><dt>어디서 왔나</dt><dd>${t.source}</dd></div>
      <div><dt>하나만 기억한다면</dt><dd>${t.signature}</dd></div>
      <div><dt>안 하는 것</dt><dd>${t.never}</dd></div>
    </dl>
  </header>

  <section>
    <h2>화면</h2>
    <div class="screens">${t.home ? t.home(h) : home(t)}${t.detail ? t.detail(h) : detail(t)}${t.rank ? t.rank(h) : rank(t)}</div>
  </section>

  <section>
    <h2>색</h2>
    <div class="swatches">${t.colors.map(([n, v, use]) => `<div class="sw"><i style="background:${v}"></i><b>${n}</b><code>${v}</code><small>${use}</small></div>`).join('')}</div>
  </section>

  <section>
    <h2>글자</h2>
    <div class="types">${t.type.map(([role, spec, cls, sample]) => `<div class="type-row"><div><b>${role}</b><small>${spec}</small></div><div style="${cls}">${sample}</div></div>`).join('')}</div>
  </section>

  <section>
    <h2>컴포넌트</h2>
    <div class="kit phone-scope">${kit(t)}</div>
  </section>

  <section>
    <h2>회의에서 나온 말</h2>
    <div class="talk">${t.talk.map(([who, say]) => `<div><b>${who}</b><p>${say}</p></div>`).join('')}</div>
  </section>

  <section>
    <h2>앱에 옮길 때</h2>
    <ul class="impl">${t.impl.map((x) => `<li>${x}</li>`).join('')}</ul>
  </section>
</div>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT, `${t.no}-${t.key}.html`), html);
}
console.log('built', themes.map((t) => t.key).join(', '));
