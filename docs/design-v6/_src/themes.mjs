const PRETENDARD = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">';
const G = (q) => `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${q}&display=swap" rel="stylesheet">`;

export const themes = [
  // ------------------------------------------------------------------ 01
  {
    no: '01',
    key: 'passbook',
    name: '시간 통장',
    lede: '할 일 하나가 통장 한 줄이다. 걸고, 끝내고, 돌려받는 일이 날짜와 도장과 숫자로만 찍힌다.',
    source: '은행 종이 통장, 도트 프린터로 찍힌 숫자, 창구 도장',
    signature: '날짜, 적요, 도장, 냥 네 칸으로 된 통장 줄',
    never: '카드 그림자, 그라데이션, 말풍선 설명',
    fonts: PRETENDARD + G('family=DotGothic16'),
    hero: ({ stamp }) => `<div class="bookwrap"><div class="bookhead"><b>통장</b><a>전체 보기</a></div>
      <table class="book"><tbody>
        <tr><td>11.21</td><td>장보기</td><td class="st">${stamp('적립', 'ok')}</td><td class="amt num">+1,100</td></tr>
        <tr><td>11.22</td><td>방 청소</td><td class="st">${stamp('연체', 'warn')}</td><td class="amt num neg">−600</td></tr>
      </tbody><tfoot><tr><td colspan="3">잔액</td><td class="amt num">7,300</td></tr></tfoot></table></div>`,
    colors: [
      ['종이', '#EEF3EC', '화면 바탕'],
      ['통장 속지', '#FBFDF9', '통장, 입력 칸'],
      ['먹', '#22302C', '글자, 테두리'],
      ['창구 초록', '#2F6B57', '버튼, 적립 도장'],
      ['인주', '#C8372D', '연체, 빚'],
      ['동전', '#E2A93B', '냥 표시'],
      ['점선', '#C9D6CC', '줄 구분'],
    ],
    type: [
      ['찍힌 숫자', 'DotGothic16 · 숫자와 날짜에만', "font-family:'DotGothic16';font-size:40px;line-height:1.1", '7,300 &nbsp;11.22'],
      ['제목', 'Pretendard 700 · 24', 'font-weight:700;font-size:24px', '헬스장 가기'],
      ['본문', 'Pretendard 500 · 15', 'font-weight:500;font-size:15px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', 'Pretendard 500 · 12', 'font-weight:500;font-size:12px;color:var(--sub)', '3일 늦음'],
    ],
    talk: [
      ['디자이너', '이 앱의 숫자는 전부 통장 한 줄로 읽히게 합니다. 꾸밈은 도장 하나만 남기고, 도장은 늘 같은 칸에 같은 기울기로 찍습니다.'],
      ['대표', '은행 같아서 믿음이 가요. 다만 종이 통장을 써 본 적 없는 20대 초반에게는 낯설 수 있어요.'],
      ['CTO', '표 한 가지를 홈, 내역, 계산, 빚 예측에 다 씁니다. 화면이 늘어도 규칙이 흐트러지지 않아요.'],
      ['엔지니어', 'DotGothic16에는 한글이 없어서 숫자와 날짜에만 씁니다. 숫자만 남기고 잘라 내면 글꼴 파일이 아주 작아져요.'],
    ],
    impl: [
      '새 컴포넌트는 통장 줄 하나. 지금의 내역 목록, 계산 표, 빚 예측이 모두 이것으로 바뀐다.',
      '글꼴 1개 추가(DotGothic16, 숫자만). 나머지는 지금 쓰는 Pretendard 그대로.',
      '다섯 가지 중 바꿀 양이 가장 적다. 색 토큰과 목록 모양만 바꾸면 된다.',
    ],
    css: `
:root{--page:#E2EAE1;--bg:#EEF3EC;--surface:#FBFDF9;--ink:#22302C;--sub:#56645F;--mute:#8A9791;--line:#C9D6CC;--brand:#2F6B57;--ok:#2F6B57;--warn:#A8741A;--bad:#C8372D;--coin:#E2A93B;--display:'Pretendard',sans-serif;--body:'Pretendard',sans-serif}
.doc-head h1{font-weight:800}
.num{font-family:'DotGothic16','Pretendard',sans-serif;font-weight:400!important;letter-spacing:-.02em}
.bookhead{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}.bookhead a{color:var(--brand);font-weight:600}
.book{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--ink);font-size:13px}
.book td{padding:0 10px;height:44px;border-bottom:1px dashed var(--line)}
.book td:first-child{color:var(--sub);width:54px;font-family:'DotGothic16'}
.book .st{width:44px;padding:0;text-align:center}.book .amt{text-align:right;font-size:15px}
.book tfoot td{border-top:1px solid var(--ink);border-bottom:0;font-weight:700}.book tfoot .amt{font-size:20px}
.stamp{min-width:32px;height:32px;padding:0 5px;border-radius:999px;border:1.5px solid var(--tone);color:var(--tone);font-size:9px;transform:rotate(-8deg)}
.seg{gap:20px;border-bottom:1px solid var(--line)}.seg button{padding:8px 0;font-weight:600;color:var(--mute)}.seg .on{color:var(--ink);box-shadow:0 2px 0 var(--ink)}
.todo{border-bottom:1px dashed var(--line)}.check{border-radius:4px}
.btn.primary{background:var(--brand);color:#fff;border-radius:6px}.btn.secondary{border:1px solid var(--ink);border-radius:6px;background:var(--surface)}
.pill{border:1px solid var(--ink);border-radius:999px;color:var(--ink);background:var(--surface)}
.calc{background:var(--surface);border:1px solid var(--ink);padding:2px 14px}.calc div{border-bottom:1px dashed var(--line)}.calc .total{border-bottom:0;border-top:1px solid var(--ink);margin-top:-1px}
.rank li{border-bottom:1px dashed var(--line)}.rank .me{background:var(--surface);margin:0 -16px;padding-left:16px;padding-right:16px}
.tabs{border-top:1px solid var(--line);background:var(--surface)}
.chip{border:1px solid var(--line);border-radius:6px;background:var(--surface)}.chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.toast{background:var(--ink);color:#fff;border-radius:6px}.toast button{color:var(--coin)}
.field input{border-radius:6px}
.proof{background:var(--surface);border:1px solid var(--line);padding:12px}
`,
  },

  // ------------------------------------------------------------------ 02
  {
    no: '02',
    key: 'notebook',
    name: '방학 숙제 공책',
    lede: '미루기를 처음 배운 곳은 방학 숙제다. 모눈 공책에 손으로 적고, 형광펜으로 긋고, 다 하면 도장을 받는다.',
    source: '모눈 공책, 용돈 기입장, 형광펜, "참 잘했어요" 도장',
    signature: '손글씨로 적힌 할 일 제목과 형광펜 밑줄',
    never: '손글씨로 긴 설명 쓰기, 삐뚤빼뚤한 배치(기울기는 메모지 하나만)',
    fonts: G('family=Gaegu:wght@400;700&family=Nanum+Gothic:wght@400;700;800'),
    hero: ({ M, stamp }) => `<div class="memo"><img src="${M}" alt=""><div><span>잔액</span><b class="num">7,300<i>냥</i></b></div>${stamp('성실', 'ok')}<p><span>12명 중 3등</span><span>신용 2등급</span></p></div>`,
    colors: [
      ['공책', '#FCFDFE', '화면 바탕'],
      ['모눈', '#DCE7F4', '바탕 줄'],
      ['연필', '#2B2F3A', '글자, 테두리'],
      ['파란 펜', '#2456C8', '버튼, 링크'],
      ['빨간 펜', '#E0393E', '늦음, 빚'],
      ['형광펜', '#FFE55C', '고른 것, 내 줄'],
      ['초록 도장', '#1F8A4C', '적립, 통과'],
    ],
    type: [
      ['손글씨', 'Gaegu 700 · 제목과 숫자', "font-family:'Gaegu';font-weight:700;font-size:44px;line-height:1.1", '헬스장 가기 7,300냥'],
      ['할 일 제목', 'Gaegu 700 · 20', "font-family:'Gaegu';font-weight:700;font-size:22px", '세금 신고 자료 정리'],
      ['본문', '나눔고딕 400 · 14', 'font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', '나눔고딕 700 · 12', 'font-weight:700;font-size:12px;color:var(--sub)', '3일 늦음'],
    ],
    talk: [
      ['디자이너', '할 일 제목은 사용자가 직접 쓴 글이니까 손글씨가 어울립니다. 앱이 하는 말은 고딕으로 두어 둘을 구분합니다.'],
      ['대표', '제일 귀엽고 캡처해서 올리고 싶어요. 그런데 돈을 건다는 긴장감이 약해질까 걱정돼요.'],
      ['CTO', '손글씨 글꼴은 작은 크기에서 읽기 어렵습니다. 20 아래로는 쓰지 않는다는 규칙이 꼭 필요해요.'],
      ['엔지니어', '모눈 바탕은 작은 그림 한 장을 깔면 되고, 메모지 기울기는 회전 한 줄이면 됩니다. 구현은 쉬워요.'],
    ],
    impl: [
      '글꼴 2개 추가(Gaegu, 나눔고딕). Pretendard는 뺀다.',
      '모눈 바탕 그림 1장, 메모지와 테이프는 도형으로 그린다.',
      '상점 배경과 옷이 공책 위에서 어색하지 않은지 따로 맞춰 봐야 한다.',
    ],
    css: `
:root{--page:#EDF2F8;--bg:#FCFDFE;--surface:#fff;--ink:#2B2F3A;--sub:#5C6373;--mute:#9AA1AE;--line:#C9D6E8;--grid:#E3ECF6;--brand:#2456C8;--ok:#1F8A4C;--warn:#B86E00;--bad:#E0393E;--coin:#FFD84D;--hl:#FFE55C;--display:'Gaegu',cursive;--body:'Nanum Gothic',sans-serif}
.doc-head h1{font-weight:700}
.phone,.kit-body{background-color:var(--bg);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:18px 18px}
.num{font-family:'Gaegu',cursive;font-weight:700;font-size:1.3em;line-height:1}
.top h1,.title,.todo strong,.btn,.seg button,.who{font-family:'Gaegu',cursive;font-weight:700}
.top h1{font-size:26px}.title{font-size:36px;line-height:1.1}
.memo{background:var(--hl);padding:16px 14px 12px;transform:rotate(-1.2deg);box-shadow:2px 3px 0 rgba(43,47,58,.18);position:relative;display:grid;grid-template-columns:52px 1fr auto;gap:4px 10px;align-items:center;margin-top:6px}
.memo::before{content:'';position:absolute;top:-9px;left:50%;width:64px;height:18px;margin-left:-32px;background:rgba(110,160,230,.55);transform:rotate(2deg)}
.memo img{width:52px;height:52px}.memo span{font-size:12px;font-weight:700}.memo b{display:block;font-size:34px}.memo b i{font-style:normal;font-size:20px;margin-left:2px}
.memo p{grid-column:1/-1;display:flex;gap:14px;border-top:1.5px dashed var(--ink);padding-top:8px;margin-top:4px}
.stamp{min-width:40px;height:40px;padding:0 7px;border-radius:999px;border:2px solid var(--tone);outline:1px solid var(--tone);outline-offset:2px;color:var(--tone);font-family:'Gaegu',cursive;font-size:15px;transform:rotate(-6deg);margin:3px}
.seg{gap:18px}.seg button{font-size:20px;color:var(--mute);padding:0 2px}.seg .on{color:var(--ink);background:linear-gradient(transparent 55%,var(--hl) 55%)}
.todo{border-bottom:1.5px solid var(--line);padding:10px 0}.todo strong{font-size:21px;line-height:1.15}
.todo.late strong{text-decoration:underline wavy var(--bad);text-underline-offset:4px}
.check{border:2px solid var(--ink);border-radius:60% 40% 55% 45%/45% 55% 40% 60%;background:#fff}
.pay{font-size:24px}
.btn{font-size:21px}
.btn.primary{background:var(--brand);color:#fff;border:2px solid var(--ink);border-radius:14px 18px 12px 20px/18px 12px 20px 14px;box-shadow:2px 3px 0 var(--ink)}
.btn.secondary{background:#fff;border:2px solid var(--ink);border-radius:18px 12px 20px 14px/12px 20px 14px 18px}
.pill{border:1.5px dashed var(--ink);border-radius:999px;background:#fff;color:var(--ink)}
.calc{background:#fff;border:2px solid var(--ink);padding:4px 14px;border-radius:4px}.calc div{border-bottom:1.5px solid var(--line)}.calc .total{border-bottom:0}
.calc .total dd{font-size:38px;border-bottom:4px double var(--ink)}
.mine .big{font-size:56px}
.rank li{border-bottom:1.5px solid var(--line)}.who{font-size:20px}.rank .me .who{background:linear-gradient(transparent 50%,var(--hl) 50%);justify-self:start}
.tabs{border-top:2px solid var(--ink);background:#fff}.tabs a{font-weight:700}.tabs a.on{color:var(--ink);background:var(--hl)}
.chip{border:1.5px solid var(--ink);border-radius:14px 10px 16px 12px/10px 16px 12px 14px;background:#fff}.chip.on{background:var(--hl)}
.toast{background:var(--ink);color:#fff;border-radius:4px}.toast button{color:var(--hl)}
.field input{border:0;border-bottom:2px solid var(--ink);background:transparent;font-family:'Gaegu',cursive;font-weight:700;font-size:22px;padding:0 2px}
.proof{background:#fff;border:2px solid var(--ink);padding:12px}.bal{font-size:56px}
`,
  },

  // ------------------------------------------------------------------ 03
  {
    no: '03',
    key: 'banknote',
    name: '냥 지폐',
    lede: '냥은 화폐다. 그러니 진짜 돈처럼 찍는다. 잔액은 한 장의 지폐이고, 새싹 동전이 그 초상이다.',
    source: '지폐의 물결무늬, 일련번호, 명조 숫자, 붉은 낙관',
    signature: '물결무늬가 깔린 지폐 한 장과 네모난 붉은 도장',
    never: '무늬를 지폐와 증서 밖에 쓰기, 명조로 긴 문장 쓰기',
    fonts: PRETENDARD + G('family=Hahmlet:wght@500;700;800'),
    hero: ({ M, stamp }) => `<div class="bill"><span class="serial">가 0003124 나</span><div class="oval"><img src="${M}" alt=""></div><div class="amt"><span>잔액</span><b class="num">7,300</b><i>냥</i></div><p><span>12명 중 3등</span><span>신용 2등급</span>${stamp('성실', 'ok')}</p></div>`,
    colors: [
      ['지폐 바탕', '#F1F2F6', '화면 바탕'],
      ['속지', '#FAFAFC', '지폐, 증서'],
      ['쪽빛 잉크', '#1B2350', '글자, 테두리, 버튼'],
      ['낙관', '#B8322A', '늦음, 빚 도장'],
      ['청록 잉크', '#1F6B55', '적립 도장'],
      ['금박', '#C9A24B', '냥, 내 줄'],
      ['가는 줄', '#C5C9DB', '구분선'],
    ],
    type: [
      ['액면 숫자', 'Hahmlet 800 · 숫자와 제목', "font-family:'Hahmlet';font-weight:800;font-size:48px;line-height:1.1", '7,300'],
      ['제목', 'Hahmlet 700 · 26', "font-family:'Hahmlet';font-weight:700;font-size:26px", '헬스장 가기'],
      ['본문', 'Pretendard 500 · 14', 'font-weight:500;font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', 'Pretendard 500 · 12', 'font-weight:500;font-size:12px;color:var(--sub)', '가 0003124 나'],
    ],
    talk: [
      ['디자이너', '냥에 실물이 생기면 잃는 것도 버는 것도 무게가 달라집니다. 무늬는 지폐와 증서 두 곳에만 쓰고 나머지는 비웁니다.'],
      ['대표', '제일 고급스럽고, 스티커나 굿즈로 만들기 좋아요. 다만 조금 어른스럽고 무겁지 않을까요.'],
      ['CTO', '장식이 많은 방향이라 규칙이 느슨하면 금방 지저분해집니다. 화면마다 무늬는 한 군데라는 선을 지켜야 해요.'],
      ['엔지니어', '물결무늬는 벡터 그림 타일 한 장으로 깔 수 있어요. 명조 글꼴은 굵기 세 개만 넣으면 됩니다.'],
    ],
    impl: [
      '글꼴 1개 추가(Hahmlet, 굵기 3개). 본문은 Pretendard 그대로.',
      '물결무늬 타일 1장, 지폐와 증서 컴포넌트 2개.',
      '마스코트를 타원 초상으로 쓰는 그림이 따로 필요하다(단색 선화면 더 어울린다).',
    ],
    css: `
:root{--page:#E4E7EF;--bg:#F1F2F6;--surface:#FAFAFC;--ink:#1B2350;--sub:#4F567A;--mute:#8D92AC;--line:#C5C9DB;--brand:#1F2A6B;--ok:#1F6B55;--warn:#96650F;--bad:#B8322A;--coin:#C9A24B;--display:'Hahmlet',serif;--body:'Pretendard',sans-serif;
--wave:repeating-radial-gradient(circle at 0 50%,transparent 0 7px,rgba(31,42,107,.11) 7px 8px),repeating-radial-gradient(circle at 100% 50%,transparent 0 7px,rgba(31,42,107,.11) 7px 8px)}
.doc-head h1{font-weight:800}
.num,.top h1,.title{font-family:'Hahmlet',serif;font-weight:700;font-variant-numeric:tabular-nums}
.bill{position:relative;background:var(--wave),var(--surface);border:1px solid var(--ink);outline:1px solid var(--ink);outline-offset:-5px;padding:20px 16px 14px;display:grid;grid-template-columns:64px 1fr;gap:10px 12px;align-items:center}
.serial{position:absolute;top:9px;right:12px;font-size:10px;letter-spacing:.08em;color:var(--bad);font-family:'Hahmlet',serif}
.oval{width:64px;height:80px;border-radius:50%;border:1px solid var(--ink);background:var(--bg);display:grid;place-items:center;box-shadow:0 0 0 3px var(--surface),0 0 0 4px var(--ink)}
.oval img{width:56px}
.bill .amt span{display:block;font-size:12px;color:var(--sub)}.bill .amt b{font-size:44px;line-height:1;font-weight:800}.bill .amt i{font-style:normal;font-family:'Hahmlet',serif;margin-left:4px}
.bill p{grid-column:1/-1;display:flex;align-items:center;gap:14px;font-size:13px;border-top:1px solid var(--ink);padding-top:10px}.bill p .stamp{margin-left:auto}
.stamp{min-width:30px;height:30px;padding:0 6px;background:var(--tone);color:#fff;font-family:'Hahmlet',serif;font-size:11px;border-radius:3px;box-shadow:inset 0 0 0 1.5px var(--tone),inset 0 0 0 2.5px rgba(255,255,255,.75)}
.seg{gap:0;border:1px solid var(--ink)}.seg button{flex:1;padding:9px;font-weight:600}.seg .on{background:var(--ink);color:#fff}
.todo{border-bottom:1px solid var(--line)}.pay{font-size:18px}
.check{border-width:1px;box-shadow:inset 0 0 0 3px var(--bg),inset 0 0 0 4px var(--line)}
.btn{font-family:'Hahmlet',serif;letter-spacing:.04em;border-radius:2px}
.btn.primary{background:var(--brand);color:#fff;box-shadow:inset 0 0 0 3px var(--brand),inset 0 0 0 4px rgba(255,255,255,.5)}
.btn.secondary{border:1px solid var(--ink);box-shadow:inset 0 0 0 3px var(--bg),inset 0 0 0 4px var(--ink)}
.btn.text{font-family:'Pretendard',sans-serif;letter-spacing:0}
.pill{border:1px solid var(--ink);border-radius:2px;color:var(--ink)}
.title{font-size:28px}
.calc{background:var(--wave),var(--surface);border:1px solid var(--ink);outline:1px solid var(--ink);outline-offset:-5px;padding:12px 18px}.calc div{border-bottom:1px dotted var(--mute)}.calc .total{border-bottom:0}.calc .total dd{font-size:36px;font-weight:800}
.mine .big{font-size:52px;font-weight:800}
.rank li{border-bottom:1px solid var(--line)}.rank .me{background:rgba(201,162,75,.16);box-shadow:inset 3px 0 0 var(--coin);margin:0 -16px;padding-left:16px;padding-right:16px}
.tabs{border-top:3px double var(--ink);background:var(--surface)}.tabs a.on{color:var(--ink);font-weight:700}
.chip{border:1px solid var(--ink);border-radius:2px}.chip.on{background:var(--ink);color:#fff}
.toast{background:var(--ink);color:#fff;border-radius:2px}.toast button{color:var(--coin)}
.field input{border-color:var(--ink);border-radius:2px}
.proof{background:var(--surface);border:1px solid var(--ink);padding:12px}.bal{font-size:48px;font-weight:800}
`,
  },

  // ------------------------------------------------------------------ 04
  {
    no: '04',
    key: 'arcade',
    name: '오락실 저금통',
    lede: '냥은 점수고 할 일은 판이다. 굵은 테두리와 도트 글자로, 끝낼 때마다 동전 소리가 날 것 같은 화면.',
    source: '휴대용 게임기, 오락실 점수판, 도트 글꼴',
    signature: '검은 굵은 테두리, 딱 떨어지는 그림자, 한글 도트 글꼴',
    never: '둥근 모서리, 흐린 그림자, 그라데이션',
    fonts: PRETENDARD + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css">',
    hero: ({ M, stamp }) => `<div class="hud"><div class="face"><img src="${M}" alt=""></div><div class="hudr"><span>냥</span><b class="num">7,300</b><div class="xp"><i></i></div><small>신용 2등급</small></div><p><span>12명 중 3등</span>${stamp('성실', 'ok')}</p></div>`,
    colors: [
      ['화면', '#EEF1FF', '화면 바탕'],
      ['흰 판', '#FFFFFF', '목록, 대화 상자'],
      ['검정 테두리', '#14142B', '글자, 모든 테두리와 그림자'],
      ['게임기 파랑', '#2B4BFF', '점수판, 고른 탭'],
      ['동전 노랑', '#FFC83D', '큰 버튼, 냥'],
      ['빨강', '#F03E3E', '늦음, 빚'],
      ['초록', '#12995A', '적립, 통과'],
    ],
    type: [
      ['점수', 'Galmuri11 Bold · 36', "font-family:'Galmuri11';font-weight:700;font-size:36px;line-height:1.2", '7,300냥'],
      ['제목', 'Galmuri11 Bold · 24', "font-family:'Galmuri11';font-weight:700;font-size:24px", '헬스장 가기'],
      ['할 일 제목', 'Galmuri14 · 15', "font-family:'Galmuri14';font-size:15px", '세금 신고 자료 정리'],
      ['작은 글자', 'Galmuri11 · 12', "font-family:'Galmuri11';font-size:12px;color:var(--sub)", '3일 늦음'],
    ],
    talk: [
      ['디자이너', '도트는 괜찮다는 의견을 끝까지 밀어 본 방향입니다. 상점, 옷장, 순위가 이미 게임이라 앱 전체가 한 세계가 됩니다.'],
      ['대표', '계속 쓰게 만드는 재미는 이게 제일 커 보여요. 진지하게 할 일을 관리하려는 사람에게 유치해 보일 위험은 있어요.'],
      ['CTO', '테두리와 딱 떨어지는 그림자뿐이라 만들기는 가장 쉽고 가볍습니다.'],
      ['엔지니어', '도트 글꼴은 정해진 크기의 배수에서만 또렷해서 글자 크기가 12, 15, 24, 36 네 단계로 묶입니다. 지금 마스코트는 매끈한 그림이라 도트판을 새로 그려야 어울려요.'],
    ],
    impl: [
      '글꼴 2개 추가(Galmuri11, Galmuri14, 둘 다 OFL). 글자 크기는 네 단계만 쓴다.',
      '마스코트와 옷 7벌, 배경 4장을 도트로 다시 그려야 한다. 다섯 가지 중 그림 작업이 가장 많다.',
      '화면 코드는 테두리 두께와 그림자 값만 바꾸면 되어 가장 적다.',
    ],
    css: `
:root{--page:#DDE3FF;--bg:#EEF1FF;--surface:#fff;--ink:#14142B;--sub:#4A4A68;--mute:#8C8CA6;--line:#14142B;--brand:#2B4BFF;--ok:#12995A;--warn:#FFC83D;--bad:#F03E3E;--coin:#FFC83D;--display:'Galmuri11',sans-serif;--body:'Pretendard',sans-serif}
.doc-head h1{font-weight:700;letter-spacing:0;font-size:clamp(36px,8vw,84px)}section>h2{font-weight:700;font-size:24px}
.sw i,.kit-body,.phone{border:3px solid var(--ink);outline:0}.phone,.kit-body{box-shadow:6px 6px 0 var(--ink)}
.phone,.kit-body{font-family:'Galmuri11',sans-serif;font-size:12px;-webkit-font-smoothing:none}
.status{font-size:12px}.top h1{font-size:24px;font-weight:700}
.num{font-weight:700}.wallet{font-size:12px}.coin{border-width:2px;border-radius:0}
.todo strong,.who,.btn,.toast span{font-family:'Galmuri14',sans-serif;font-size:15px;font-weight:400}
.todo small,.tabs a,.note,.field span{font-size:12px}
.hud{background:var(--brand);color:#fff;border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink);padding:12px;display:grid;grid-template-columns:68px 1fr;gap:10px 12px}
.face{background:#fff;border:3px solid var(--ink);display:grid;place-items:center;height:68px}.face img{width:56px}
.hudr{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:4px 8px}.hudr b{font-size:36px;line-height:1;color:var(--coin);text-shadow:2px 2px 0 var(--ink)}
.xp{grid-column:1/-1;height:12px;border:2px solid var(--ink);background:#fff}.xp i{display:block;height:100%;width:72%;background:repeating-linear-gradient(90deg,var(--coin) 0 8px,#fff 8px 10px)}
.hudr small{grid-column:1/-1}
.hud p{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;border-top:3px solid var(--ink);margin:0 -12px -12px;padding:8px 12px;background:var(--ink)}
.stamp{height:22px;padding:0 6px;background:var(--tone);color:#fff;border:2px solid var(--ink);font-size:12px;font-weight:400}.stamp.warn{color:var(--ink)}.stamp.wait{background:#fff;color:var(--sub)}
.hud .stamp{border-color:#fff}
.seg{gap:10px}.seg button{flex:1;padding:8px;border:3px solid var(--ink);background:#fff;box-shadow:3px 3px 0 var(--ink)}.seg .on{background:var(--coin);box-shadow:none;transform:translate(3px,3px)}
.todos,.rank{border:3px solid var(--ink);background:#fff;box-shadow:4px 4px 0 var(--ink)}
.todo,.rank li{padding:10px 12px;border-bottom:3px solid var(--ink)}.todo:last-child,.rank li:last-child{border-bottom:0}
.todo.late{background:#FFE1E1}.check{border:3px solid var(--ink);border-radius:0;background:#fff}
.pay{font-size:24px;line-height:1}
.btn{border:3px solid var(--ink)}.btn.primary{background:var(--coin);box-shadow:4px 4px 0 var(--ink)}.btn.secondary{background:#fff;box-shadow:4px 4px 0 var(--ink)}.btn.text{border:0}
.fab{margin-bottom:18px}.actions{gap:12px}
.pill{border:2px solid var(--ink);background:#fff;color:var(--ink);box-shadow:2px 2px 0 var(--ink);font-size:12px;font-weight:400}
.title{font-size:24px;font-weight:700}.due{font-size:12px}
.calc{background:#fff;border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink)}.calc div{padding:10px 12px;border-bottom:3px solid var(--ink)}.calc .total{border-bottom:0;background:var(--ink);color:#fff}.calc .total dd{font-size:36px;color:var(--coin)}
.mine .big{font-size:36px}.rank .me{background:#FFF0BF}.score{font-size:12px}
.tabs{border-top:3px solid var(--ink);background:#fff}.tabs a{color:var(--sub)}.tabs a.on{background:var(--brand);color:#fff}
.chip{border:3px solid var(--ink);background:#fff;font-size:12px;font-weight:400}.chip.on{background:var(--coin)}
.toast{background:var(--ink);color:#fff}.toast button{color:var(--coin);font-weight:400}
.field input{border:3px solid var(--ink)}
.proof{background:#fff;border:3px solid var(--ink);padding:10px;box-shadow:4px 4px 0 var(--ink)}.proof .photo{border:3px solid var(--ink)}.bal{font-size:36px}
`,
  },

  // ------------------------------------------------------------------ 05
  {
    no: '05',
    key: 'giro',
    name: '지로 고지서',
    lede: '미루면 날아오는 것은 고지서다. 분홍 줄, 칸마다 한 자씩 들어간 숫자, 크고 검은 글자로 "이만큼 걸려 있다"를 정면으로 보여 준다.',
    source: '지로 용지의 분홍 줄과 숫자 칸, 납부 도장, 절취선',
    signature: '한 칸에 한 자씩 들어간 금액',
    never: '둥근 모서리, 분홍을 면으로 넓게 칠하기, 색 세 가지 넘기기',
    boxTotal: true,
    fonts: G('family=Black+Han+Sans&family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans+KR:wght@400;500;600;700'),
    hero: ({ box }) => `<div class="form"><div class="cell wide"><label>잔액</label><div class="row">${box('7,300')}<em>냥</em></div></div><div class="cell"><label>걸어 둔 냥</label><b class="num">3,000</b></div><div class="cell"><label>순위</label><b class="num">3<small>/12</small></b></div><div class="cell"><label>신용</label><b class="num">2<small>등급</small></b></div></div><div class="cut"></div>`,
    colors: [
      ['용지', '#FFFFFF', '화면 바탕'],
      ['검정', '#000000', '글자, 큰 버튼'],
      ['지로 분홍', '#E8486B', '줄, 칸 테두리, 이름표'],
      ['분홍 바탕', '#FDEDF1', '금액 칸'],
      ['수납 도장 파랑', '#1C4FD8', '적립, 통과'],
      ['연체 빨강', '#E0202A', '늦음, 빚'],
      ['형광 노랑', '#FFD400', '알림 단추'],
    ],
    type: [
      ['큰 글자', '검은고딕 · 제목과 금액', "font-family:'Black Han Sans';font-size:56px;line-height:1.05", '헬스장 가기'],
      ['칸 숫자', 'IBM Plex Mono 600 · 26', "font-family:'IBM Plex Mono';font-weight:600;font-size:26px;letter-spacing:.3em", '7,300'],
      ['본문', 'IBM Plex Sans KR 500 · 14', 'font-weight:500;font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['칸 이름', 'IBM Plex Sans KR 500 · 10', 'font-weight:500;font-size:11px;color:#E8486B', '걸어 둔 냥'],
    ],
    talk: [
      ['디자이너', '"미루면 돈을 버린다"를 가장 곧바로 그린 방향입니다. 누구나 한 번은 받아 본 종이라 설명 없이도 뜻이 통합니다.'],
      ['대표', '앱 이름과 제일 잘 맞고 한 번 보면 안 잊혀요. 다만 매일 여는 앱이 고지서 같으면 스트레스일 수 있어요. 끝냈을 때는 확실히 기분 좋아야 해요.'],
      ['CTO', '칸 숫자 컴포넌트 하나가 정체성 전부예요. 화면 낭독기에는 칸이 아니라 한 덩어리 숫자로 읽히게 해야 합니다.'],
      ['엔지니어', '칸 너비가 고정이라 여섯 자리가 넘는 금액은 칸을 줄이거나 줄을 바꿔야 해요. 색이 검정과 분홍 둘뿐이라 토큰은 가장 단순합니다.'],
    ],
    impl: [
      '글꼴 3개 추가(검은고딕, IBM Plex Sans KR, IBM Plex Mono 숫자만).',
      '칸 숫자, 서식 칸, 절취선 컴포넌트 3개. 마스코트는 도장 속 그림처럼 한 가지 색으로 쓴다.',
      '끝냈을 때 "수납" 도장이 찍히는 움직임 하나에 공을 들여야 한다.',
    ],
    css: `
:root{--page:#F1F1F1;--bg:#fff;--surface:#fff;--ink:#000;--sub:#555;--mute:#999;--line:#F3A9B8;--pink:#E8486B;--tint:#FDEDF1;--brand:#000;--ok:#1C4FD8;--warn:#A85F00;--bad:#E0202A;--coin:#FFD400;--display:'Black Han Sans',sans-serif;--body:'IBM Plex Sans KR',sans-serif}
.doc-head h1{font-weight:400;letter-spacing:0}section>h2{font-weight:400;font-size:34px}
.num,.top h1,.title{font-family:'Black Han Sans',sans-serif;font-weight:400!important}
.top h1{font-size:24px}.wallet .num{font-size:18px}
.form{border:1.5px solid var(--pink);display:grid;grid-template-columns:repeat(3,1fr)}
.cell{padding:5px 8px 8px;border-right:1px solid var(--pink);min-width:0}.cell:last-child{border-right:0}
.cell label{display:block;font-size:10px;color:var(--pink);font-weight:500;margin-bottom:2px}
.cell b{font-size:24px;line-height:1.1}.cell b small{font-size:13px;font-family:'IBM Plex Sans KR';font-weight:600;margin-left:2px}
.cell.wide{grid-column:1/-1;border-right:0;border-bottom:1px solid var(--pink);background:var(--tint);padding-bottom:10px}
.cell .row{display:flex;align-items:flex-end;gap:8px}.cell em{font-style:normal;font-weight:700}
.dg{width:32px;height:42px;border:1px solid var(--pink);background:#fff;display:grid;place-items:center;font:600 26px/1 'IBM Plex Mono',monospace;margin-right:-1px;color:#000}
.cm{width:12px;text-align:center;font:600 22px/1 'IBM Plex Mono',monospace;color:#000}
.cut{border-top:1.5px dashed var(--pink);margin:0 -16px;position:relative;height:0}
.cut::before{content:'✂';position:absolute;left:14px;top:-11px;color:var(--pink);background:#fff;font-size:14px;line-height:1;padding:0 4px}
.stamp{height:24px;padding:0 7px;border:2px solid var(--tone);color:var(--tone);font-weight:700;font-size:12px;transform:rotate(-4deg);border-radius:2px;outline:1px solid var(--tone);outline-offset:1.5px;margin:3px}
.seg{gap:18px}.seg button{display:flex;gap:7px;align-items:center;font-weight:600}
.seg button::before{content:'';width:16px;height:16px;border:1.5px solid var(--pink);background:#fff}.seg .on::before{background:#000;border-color:#000;box-shadow:inset 0 0 0 3px #fff}
.todo{border-bottom:1px solid var(--line)}.todo:first-child{border-top:1px solid var(--line)}.todo strong{font-size:16px}
.todo.late small{background:var(--bad);color:#fff;padding:1px 6px;font-weight:700}
.check{border:1.5px solid var(--pink);border-radius:0}.pay{font-size:24px;line-height:1}
.btn{border-radius:0}.btn.primary{background:#000;color:#fff;font-family:'Black Han Sans',sans-serif;font-weight:400;font-size:20px;min-height:56px}
.btn.secondary{border:1.5px solid #000}.edit{color:#000;text-decoration:underline}
.pill{border:1.5px solid #000;color:#000}
.title{font-size:40px;line-height:1.08}
.calc{border:1.5px solid var(--pink)}.calc div{padding:9px 10px;border-bottom:1px solid var(--pink)}.calc dt{color:var(--pink);font-size:12px;font-weight:500}.calc dd{font-size:20px}
.calc .faint dd{color:var(--mute)}.calc .total{border-bottom:0;background:var(--tint);align-items:center}.calc .total dd{font-size:0}
.mine .big{font-size:88px;line-height:.9}.mine{display:flex;align-items:flex-end;gap:4px}.mine b:first-child{font-size:20px}
.rank li{border-bottom:1px solid var(--line)}.rank .pos{font-size:20px}.rank .me{background:var(--tint);margin:0 -16px;padding-left:16px;padding-right:16px}.score{font-size:18px}
.tabs{border-top:1.5px solid #000}.tabs a{border-right:1px solid var(--line);color:var(--sub)}.tabs a:last-child{border-right:0}.tabs a.on{background:#000;color:#fff}
.chip{border:1px solid var(--pink)}.chip.on{background:#000;border-color:#000;color:#fff}
.toast{background:#000;color:#fff}.toast button{color:var(--coin)}
.field span{color:var(--pink);font-size:11px}.field input{border:1px solid var(--pink);background:var(--tint)}
.proof{border:1.5px solid var(--pink);padding:12px}.bal{font-size:0}.balance{align-items:flex-end}
`,
  },
];
