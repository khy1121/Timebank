import fs from 'node:fs';
import { themes as t1 } from './themes.mjs';
import { themes as t2 } from './themes2.mjs';
const themes = [...t1, ...t2];

const OUT = 'C:/app(dev)/01-todo-interest/docs/design-v6/index.html';
const look = {
  passbook: "background:#EEF3EC;color:#22302C;border:1px solid #22302C;--f:'Pretendard';--w:800",
  notebook: "background:#FFE55C;color:#2B2F3A;border:2px solid #2B2F3A;--f:'Gaegu';--w:700",
  banknote: "background:#1B2350;color:#FAFAFC;border:1px solid #1B2350;outline:1px solid #C9A24B;outline-offset:-6px;--f:'Hahmlet';--w:800",
  arcade: "background:#2B4BFF;color:#fff;border:3px solid #14142B;box-shadow:6px 6px 0 #14142B;--f:'Galmuri11';--w:700",
  giro: "background:#fff;color:#000;border:1.5px solid #E8486B;--f:'Black Han Sans';--w:400",
  clay: "background:#FF7A45;color:#fff;border-radius:28px;box-shadow:inset 0 -8px 0 rgba(58,42,30,.18),inset 0 4px 0 rgba(255,255,255,.4);--f:'Jua';--w:400",
  blackcard: "background:linear-gradient(125deg,#2E2E2E,#111 45%,#2A2A2A 55%,#0F0F0F);color:#D4AF6A;border-radius:16px;--f:'Pretendard';--w:200",
  chat: "background:#DCE6F2;color:#1B2430;border-radius:4px 28px 28px 28px;--f:'Pretendard';--w:800",
  glass: "background:radial-gradient(60% 60% at 10% 10%,#FFD9A0 0,transparent 65%),radial-gradient(60% 60% at 95% 20%,#FF9EB5 0,transparent 65%),radial-gradient(80% 70% at 55% 100%,#9AD0FF 0,transparent 65%),#F6F2FF;color:#1D1B2E;border-radius:28px;--f:'Pretendard';--w:800",
  clock: "background:#E9E9E6;color:#111;border-bottom:6px solid #FF5A1F;--f:'Inter Tight','Pretendard';--w:300",
};
const cost = {
  passbook: ['적금이라는 구조와 가장 잘 맞음', '1개 (숫자만)', '없음', '가장 적음', '익숙해서 심심할 수 있음'],
  notebook: ['미루기의 기억과 맞음, 돈의 무게는 약함', '2개', '모눈 바탕 1장', '보통', '손글씨가 작으면 읽기 어려움'],
  banknote: ['냥이라는 화폐에 무게를 줌', '1개', '무늬 타일, 초상 그림', '보통', '장식이 번지면 금방 지저분해짐'],
  arcade: ['상점, 옷장, 순위와 한 세계가 됨', '2개', '마스코트와 옷을 도트로 (나중에 해도 됨)', '적음', '진지한 사용자에게 유치할 수 있음'],
  giro: ['"미루면 돈을 버린다"와 가장 곧바로 맞음', '3개', '없음', '보통', '매일 보기에 스트레스일 수 있음'],
  clay: ['마스코트, 옷장, 상점이 주인공이 됨', '2개', '없음 (지금 마스코트 그대로)', '보통, 홈 구조가 바뀜', '할 일 목록이 아래로 밀림'],
  blackcard: ['신용등급을 자랑거리로 만듦', '1개 (숫자만)', '없음', '보통, 색 전부', '마스코트가 설 자리가 없음'],
  chat: ['알림과 앱이 같은 말투로 이어짐', '없음', '없음', '가장 많음, 홈을 새로 만듦', '할 일이 많으면 대화가 길어짐'],
  glass: ['요즘 앱처럼 보임, 앱만의 생각은 약함', '1개 (숫자만)', '하늘 바탕 1장', '보통', '느린 기기에서 흐림 효과가 버벅임'],
  clock: ['돈이 아니라 시간을 그린 유일한 방향', '2개', '없음', '보통', '귀여움이 없어 상점과 따로 놂'],
};

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>v6 시안 열 가지 · 할 일 이자</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gaegu:wght@700&family=Hahmlet:wght@800&family=Inter+Tight:wght@300&family=Jua&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{font-family:'Pretendard',sans-serif;background:#F6F6F4;color:#1A1A1A;line-height:1.6;word-break:keep-all;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:56px 20px 96px}
h1{font-size:clamp(34px,6vw,60px);line-height:1.1;font-weight:800;letter-spacing:-.02em}
.lede{font-size:19px;max-width:36em;margin-top:18px}
h2{font-size:26px;margin:72px 0 20px;font-weight:800}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px}
.tile{display:block;text-decoration:none;color:inherit}
.tile .face{height:150px;display:flex;align-items:flex-end;padding:18px 22px}
.tile .face b{font-family:var(--f);font-weight:var(--w);font-size:38px;line-height:1.05}
.tile p{margin-top:14px}.tile small{display:block;color:#666;margin-top:6px;font-size:14px}
.tile span{display:inline-block;margin-top:10px;font-weight:700;text-decoration:underline;text-underline-offset:4px}
.drop{border-top:1px solid #CCC;padding-top:16px;max-width:44em}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:760px;font-size:15px}
th,td{text-align:left;padding:12px 14px 12px 0;border-top:1px solid #CCC;vertical-align:top}
th{font-size:13px;color:#666;font-weight:600}
.talk{display:grid;gap:18px;max-width:46em}
.talk b{display:block;font-size:14px;color:#666}
.pick{background:#1A1A1A;color:#fff;padding:28px;margin-top:20px;max-width:46em}
.pick b{font-size:22px;display:block;margin-bottom:8px}
ul{padding-left:20px;max-width:46em}li{margin:6px 0}
</style>
</head>
<body>
<div class="wrap">
  <h1>할 일 이자, 새 얼굴 열 가지</h1>
  <p class="lede">같은 화면 세 장(홈, 할 일 상세, 순위)과 같은 컴포넌트를 열 가지 방식으로 그렸습니다. 기능은 모두 같습니다. 01부터 05까지는 종이와 도트에서 출발했고, 06부터 10까지는 화면 짜임부터 서로 다르게 잡았습니다.</p>

  <h2>열 가지 방향</h2>
  <div class="tiles">
    ${themes
      .map(
        (t) => `<a class="tile" href="${t.no}-${t.key}.html"><div class="face" style="${look[t.key]}"><b>${t.name}</b></div><p>${t.lede}</p><small>${t.source}</small><span>${t.no} 열어 보기</span></a>`,
      )
      .join('\n    ')}
  </div>

  <h2>회의에서 떨어진 방향</h2>
  <p class="drop"><b>말랑한 핀테크.</b> 둥근 흰 카드, 파란 버튼, 옅은 그림자로 깔끔하게 다듬는 방향이었습니다. 대표가 "지금 화면을 조금 고친 것과 무엇이 다르냐"고 물었고, 디자이너도 어느 앱에 붙여도 되는 얼굴이라고 답해 그리지 않았습니다.</p>

  <h2>한눈에 견주기</h2>
  <div class="scroll"><table>
    <tr><th>방향</th><th>앱의 생각과 맞는 정도</th><th>새 글꼴</th><th>새 그림</th><th>코드 바꿀 양</th><th>가장 큰 위험</th></tr>
    ${themes.map((t) => `<tr><td><b>${t.no} ${t.name}</b></td>${cost[t.key].map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n    ')}
  </table></div>

  <h2>회의 요약</h2>
  <div class="talk">
    <div><b>대표</b>처음 다섯은 통장, 지폐, 고지서가 모두 종이라 서로 닮았다는 말을 들었어요. 그래서 뒤의 다섯은 장난감, 카드, 대화방, 위젯, 시계처럼 물건부터 다르게 골랐습니다. 계속 열게 만드는 힘은 오락실과 말랑 저금통, 한 번 보고 기억나는 힘은 탁상시계와 지로 고지서가 커요.</div>
    <div><b>CTO</b>어느 쪽이든 "이 방향의 한 가지"를 컴포넌트 하나로 묶을 수 있어야 합니다. 통장 줄, 칸 숫자, 굵은 테두리는 그게 되고, 지폐 무늬와 손글씨는 규칙을 더 단단히 써야 해요.</div>
    <div><b>엔지니어</b>코드로는 오락실, 통장, 탁상시계가 가볍고 독촉 문자가 가장 무겁습니다. 오락실은 그림을 도트로 다시 그리는 일이 따로 있는데, 처음에는 지금 마스코트를 액자 칸에 넣어 쓰고 나중에 바꿔도 됩니다.</div>
    <div><b>디자이너</b>21st.dev 컴포넌트를 훑어보니 요즘 흐름은 굴러가는 숫자, 미끄러지는 탭, 유리 효과였습니다. 숫자가 굴러 올라가는 움직임과 변화량 표시는 다섯 방향 모두에 넣었고, 유리와 빛 효과는 어느 방향에도 쓰지 않았습니다.</div>
  </div>

  <div class="pick"><b>에이전시 추천 세 가지</b>재미와 계속 쓰는 힘을 원하면 04 오락실 저금통, 세련되고 오래 가는 얼굴을 원하면 10 탁상시계, 마스코트와 상점을 앞세우려면 06 말랑 저금통을 권합니다. 셋은 서로 가장 멀리 떨어져 있어 고르기도 쉽습니다.</div>

  <h2>고른 다음 할 일</h2>
  <ul>
    <li>피그마 "화면 v6" 쪽에 색, 글자, 컴포넌트를 먼저 만든다.</li>
    <li>v4의 화면 30장을 기능별 여섯 묶음(시작, 할 일, 순위, 그룹, 상점, 설정)으로 같은 기능 그대로 다시 그린다.</li>
    <li>확정되면 앱 코드의 색 토큰과 컴포넌트를 바꾼다.</li>
  </ul>
</div>
</body>
</html>`;
fs.writeFileSync(OUT, html);
console.log('index ok');
