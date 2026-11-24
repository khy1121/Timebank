const PRETENDARD = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">';
const G = (q) => `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${q}&display=swap" rel="stylesheet">`;
const top = (title, right) => `<div class="status">9:41</div><header class="top"><h1>${title}</h1>${right}</header>`;
const gear = '<span class="gear">설정</span>';
const wallet = '<span class="wallet"><i class="coin"></i><b class="num">7,300</b><span>냥</span></span>';
const head = `<div class="status">9:41</div><header class="top sub"><span class="back">‹</span><span class="edit">수정</span></header>`;
const headline = `<div class="headline"><h2 class="title">헬스장 가기</h2><p class="due">토요일까지 <button class="pill">기한 미루기</button></p></div>`;

export const themes = [
  // ------------------------------------------------------------------ 06
  {
    no: '06',
    key: 'clay',
    name: '말랑 저금통',
    lede: '마스코트가 화면의 주인이다. 새싹 동전이 언덕 위에 서 있고, 할 일은 손가락으로 꾹 누르고 싶은 말랑한 덩어리다.',
    source: '찰흙 장난감, 젤리, 다마고치처럼 키우는 화면',
    signature: '화면 위쪽 절반을 차지한 마스코트와 아래가 도톰한 버튼',
    never: '얇은 선, 각진 모서리, 회색',
    fonts: G('family=Gowun+Dodum&family=Jua'),
    home: ({ M, seg, todos, tabs }) => `<div class="phone">${top('할 일 이자', gear)}
      <div class="body"><div class="stage"><span class="bub l"><b class="num">3</b>등</span><span class="bub r"><b class="num">2</b>등급</span><img src="${M}" alt=""><div><span class="jar"><i class="coin"></i><b class="num">7,300</b>냥</span></div></div>
      <div class="sheet">${seg('진행 중 4', '끝낸 일')}${todos}</div></div>
      <button class="btn primary fab">할 일 추가</button>${tabs('todo')}</div>`,
    rank: ({ M, seg, stamp, tabs }) => `<div class="phone">${top('순위', wallet)}
      <div class="body">${seg('이번 주', '이번 달')}
      <div class="podium"><div class="p2"><img src="${M}" alt=""><b>민지</b><i class="num">1,720</i><span>2</span></div><div class="p1"><img src="${M}" alt=""><b>준호</b><i class="num">2,250</i><span>1</span></div><div class="p3"><img src="${M}" alt=""><b>현영 (나)</b><i class="num">1,350</i><span>3</span></div></div>
      <ol class="rank"><li><b class="pos num">4</b><span class="who">서연</span>${stamp('벼락치기', 'warn')}<b class="num score">600</b></li><li><b class="pos num">5</b><span class="who">도윤</span>${stamp('빚더미', 'bad')}<b class="num score neg">−1,830</b></li></ol></div>${tabs('rank')}</div>`,
    colors: [
      ['하늘', '#D6EEFF', '화면 위쪽'],
      ['언덕', '#8FE0B5', '마스코트가 선 곳, 적립'],
      ['흰 반죽', '#FFFFFF', '할 일 판'],
      ['귤 젤리', '#FF7A45', '큰 버튼, 고른 탭'],
      ['버터', '#FFD45C', '냥'],
      ['딸기', '#F0524F', '늦음, 빚'],
      ['코코아', '#3A2A1E', '글자'],
    ],
    type: [
      ['둥근 제목', 'Jua · 제목, 숫자, 버튼', "font-family:'Jua';font-size:44px;line-height:1.1", '7,300냥 헬스장 가기'],
      ['할 일 제목', 'Jua · 17', "font-family:'Jua';font-size:17px", '세금 신고 자료 정리'],
      ['본문', '고운돋움 · 14', 'font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', '고운돋움 · 12', 'font-size:12px;color:var(--sub)', '3일 늦음'],
    ],
    talk: [
      ['디자이너', '옷장과 상점이 있으니 마스코트를 홈의 주인공으로 올렸습니다. 산 옷이 매일 보이면 냥을 모을 이유가 생깁니다.'],
      ['대표', '가장 친근하고 어린 사용자에게 잘 맞을 거예요. 할 일 목록이 화면 아래로 밀려 한눈에 덜 보이는 건 아쉬워요.'],
      ['CTO', '도톰한 그림자는 안쪽 그림자 두 겹인데, 안드로이드에서 그대로 안 나올 수 있어 확인이 필요합니다.'],
      ['엔지니어', '안쪽 그림자는 그림 한 장을 늘려 쓰는 방식으로 바꾸면 양쪽에서 같게 나옵니다. 아래 탭을 띄우는 것은 쉽습니다.'],
    ],
    impl: ['글꼴 2개 추가(Jua, 고운돋움).', '홈 구조가 바뀐다. 마스코트 무대와 그 아래로 올라오는 판.', '도톰한 버튼 그림자를 기기 두 종류에서 맞추는 일이 가장 손이 간다.'],
    css: `
:root{--page:#BFE3FF;--bg:#D6EEFF;--surface:#fff;--ink:#3A2A1E;--sub:#7A6657;--mute:#B5A596;--line:#EADDCF;--brand:#FF7A45;--ok:#22B585;--warn:#E39A00;--bad:#F0524F;--coin:#FFD45C;--display:'Jua',sans-serif;--body:'Gowun Dodum',sans-serif;--clay:inset 0 -5px 0 rgba(58,42,30,.14),inset 0 3px 0 rgba(255,255,255,.6)}
.doc-head h1{font-weight:400}section>h2{font-weight:400}
.num,.top h1,.title,.btn,.todo strong,.who,.seg button,.stamp,.chip,.pill{font-family:'Jua',sans-serif;font-weight:400}
.top h1{font-size:22px}.gear{font-size:13px;color:var(--sub)}
.body{padding-bottom:92px}
.stage{margin:0 -16px;padding:0 16px 52px;text-align:center;position:relative;overflow:hidden}
.stage::after{content:'';position:absolute;left:-25%;right:-25%;bottom:-86px;height:170px;border-radius:50%;background:#8FE0B5}
.stage img{width:128px;position:relative;z-index:1;display:block;margin:0 auto -6px}
.jar{position:relative;z-index:2;display:inline-flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:6px 20px;font-size:15px;box-shadow:var(--clay),0 6px 0 rgba(58,42,30,.12)}.jar b{font-size:30px;line-height:1.2}
.bub{position:absolute;top:22px;width:60px;height:60px;border-radius:50%;display:grid;place-content:center;box-shadow:var(--clay);font-family:'Jua';font-size:13px;line-height:1.05;z-index:1}.bub b{font-size:22px}
.bub.l{left:20px;background:var(--coin)}.bub.r{right:20px;background:#fff}
.sheet{background:#fff;border-radius:32px 32px 0 0;margin:-44px -16px -92px;padding:20px 16px 150px;position:relative;z-index:2;flex:1;display:flex;flex-direction:column;gap:14px}
.seg{background:#F4EADF;border-radius:999px;padding:4px;gap:0}.seg button{flex:1;padding:8px;border-radius:999px;color:var(--sub)}.seg .on{background:#fff;color:var(--ink);box-shadow:0 3px 0 rgba(58,42,30,.14)}
.todo{background:#FFF6EA;border-radius:22px;padding:12px 14px;margin-bottom:10px;box-shadow:inset 0 -4px 0 rgba(58,42,30,.08);grid-template-columns:30px 1fr auto}.todo strong{font-size:17px}
.todo.late{background:#FFE4E0}
.check{width:28px;height:28px;border:0;background:#fff;box-shadow:var(--clay),0 2px 0 rgba(58,42,30,.15)}
.pay{background:var(--coin);border-radius:999px;padding:5px 11px 7px;font-size:15px;box-shadow:var(--clay)}.todo.late .pay{background:var(--bad);color:#fff}
.btn{border-radius:999px;font-size:18px}
.btn.primary{background:var(--brand);color:#fff;box-shadow:var(--clay),0 6px 0 #D45A2A}.btn.secondary{background:#fff;box-shadow:var(--clay),0 6px 0 #E3D5C6}
.fab{position:absolute;right:0;bottom:84px;z-index:3;min-height:52px;padding:0 22px}
.actions{gap:12px;padding-bottom:24px}
.tabs{position:absolute;left:16px;right:16px;bottom:14px;z-index:3;background:var(--ink);border-radius:999px;padding:6px}.tabs a{color:#CDBBAA;border-radius:999px;padding:6px 0 7px}.tabs a.on{background:var(--brand);color:#fff}
.tabwrap{margin:0;position:relative;height:64px}.tabwrap .tabs{left:0;right:0;bottom:0}
.pill{background:#fff;border-radius:999px;color:var(--ink);box-shadow:var(--clay),0 3px 0 rgba(58,42,30,.12)}
.title{font-size:30px}
.calc div{background:#fff;border-radius:18px;padding:12px 16px;margin-bottom:8px;box-shadow:inset 0 -4px 0 rgba(58,42,30,.08)}.calc .total{background:var(--coin);box-shadow:var(--clay)}.calc .total dd{font-size:34px}
.podium{display:grid;grid-template-columns:repeat(3,1fr);align-items:end;gap:8px;text-align:center}.podium img{width:54px;display:block;margin:0 auto}
.podium b{font-family:'Jua';font-weight:400;font-size:14px;display:block}.podium i{font-style:normal;font-size:13px;color:var(--sub)}
.podium span{display:grid;place-items:center;font-family:'Jua';font-size:26px;border-radius:18px 18px 6px 6px;margin-top:6px;box-shadow:var(--clay);color:#fff}
.p1 span{height:92px;background:var(--brand)}.p2 span{height:68px;background:#6DC7F2}.p3 span{height:50px;background:var(--ok)}.p3 b{background:var(--coin);border-radius:999px;padding:1px 6px}
.rank li{background:#fff;border-radius:18px;padding:10px 14px;margin-bottom:8px;box-shadow:inset 0 -4px 0 rgba(58,42,30,.08)}
.stamp{height:24px;padding:0 10px 2px;border-radius:999px;background:var(--tone);color:#fff;font-size:12px;box-shadow:var(--clay)}
.chip{background:#fff;border-radius:999px;box-shadow:var(--clay),0 3px 0 rgba(58,42,30,.12)}.chip.on{background:var(--coin)}
.toast{background:var(--ink);color:#fff;border-radius:20px}.toast button{color:var(--coin)}
.field input{border:0;border-radius:18px;box-shadow:inset 0 3px 0 rgba(58,42,30,.1)}
.proof{background:#fff;border-radius:24px;padding:14px;box-shadow:inset 0 -5px 0 rgba(58,42,30,.08)}.proof .photo{border-radius:16px}.bal{font-size:44px}
`,
  },

  // ------------------------------------------------------------------ 07
  {
    no: '07',
    key: 'blackcard',
    name: '블랙 카드',
    lede: '시간을 아끼는 사람만 갖는 카드. 검은 화면에 금색 숫자 하나, 나머지는 가늘고 조용하다.',
    source: '프리미엄 신용카드, 금박, 호텔 멤버십',
    signature: '금색 숫자가 박힌 검은 카드 한 장',
    never: '금색을 두 군데 넘게 쓰기, 굵은 글자, 밝은 면',
    fonts: PRETENDARD + G('family=Michroma'),
    home: ({ seg, todos, tabs }) => `<div class="phone">${top('할 일 이자', gear)}
      <div class="body"><div class="card"><div class="cardtop"><i class="ic"></i><span>2등급</span></div><b class="num">7,300<i>냥</i></b><div class="cardfoot"><span>현영</span><span>12명 중 3등</span></div></div>
      ${seg('진행 중 4', '끝낸 일')}${todos}</div>
      <button class="btn secondary fab">할 일 추가</button>${tabs('todo')}</div>`,
    colors: [
      ['검정', '#000000', '화면 바탕'],
      ['카드 면', '#1A1A1A', '카드, 입력 칸'],
      ['금박', '#D4AF6A', '숫자, 고른 것'],
      ['상아', '#F2EFE8', '글자'],
      ['재', '#9B978E', '작은 글자'],
      ['경고 빨강', '#FF5A4F', '늦음, 빚'],
      ['가는 줄', '#2A2A2A', '구분선'],
    ],
    type: [
      ['카드 숫자', 'Michroma · 숫자에만', "font-family:'Michroma';font-size:40px;line-height:1.2;color:#D4AF6A", '7,300'],
      ['제목', 'Pretendard 300 · 28', 'font-weight:300;font-size:28px', '헬스장 가기'],
      ['본문', 'Pretendard 400 · 14', 'font-weight:400;font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', 'Pretendard 400 · 12, 자간 넓게', 'font-size:12px;letter-spacing:.08em;color:var(--sub)', '12명 중 3등'],
    ],
    talk: [
      ['디자이너', '장난스러운 앱이 일부러 진지한 얼굴을 하면 그 차이가 재미가 됩니다. 신용등급이 오르면 카드 색이 바뀌는 보상도 붙일 수 있어요.'],
      ['대표', '어른스럽고 자랑하고 싶은 화면이에요. 마스코트가 설 자리가 거의 없는 게 마음에 걸려요.'],
      ['CTO', '어두운 화면 하나만 만들면 밝은 화면을 원하는 사람에게 줄 것이 없습니다. 밝은 판도 같이 정해야 해요.'],
      ['엔지니어', '카드의 비스듬한 빛은 색 번짐 한 겹으로 됩니다. 가는 글자는 작은 크기에서 흐려 보여 14 아래로는 보통 굵기를 써야 해요.'],
    ],
    impl: ['글꼴 1개 추가(Michroma, 숫자만).', '색 토큰이 전부 어두운 쪽으로 바뀐다. 상점 그림과 마스코트의 바탕도 다시 봐야 한다.', '등급마다 카드 색을 바꾸는 규칙을 따로 정한다.'],
    css: `
:root{--page:#0E0E0E;--bg:#000;--surface:#1A1A1A;--ink:#F2EFE8;--sub:#9B978E;--mute:#6B6860;--line:#2A2A2A;--brand:#D4AF6A;--ok:#7BD88F;--warn:#E8B45A;--bad:#FF5A4F;--coin:#D4AF6A;--display:'Pretendard',sans-serif;--body:'Pretendard',sans-serif}
.doc-head h1{font-weight:200;letter-spacing:.01em}section>h2{font-weight:300}
.phone,.kit-body{font-weight:400}
.num{font-family:'Michroma','Pretendard',sans-serif;font-weight:400;letter-spacing:.02em}
.top h1{font-weight:300;font-size:17px;letter-spacing:.14em}.gear{font-size:12px;color:var(--sub);letter-spacing:.08em}
.wallet{color:var(--brand);font-size:12px}.coin{border-color:var(--brand);background:none}
.card{aspect-ratio:1.586;border-radius:16px;padding:18px 20px;background:linear-gradient(125deg,#2E2E2E 0%,#171717 42%,#2A2A2A 52%,#0F0F0F 100%);border:1px solid #3A3A3A;display:flex;flex-direction:column;justify-content:space-between}
.cardtop,.cardfoot{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.1em;color:var(--sub)}
.ic{width:38px;height:28px;border-radius:6px;background:linear-gradient(135deg,#E9CF96,#A98443);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),inset 13px 0 0 -12px rgba(0,0,0,.3),inset -13px 0 0 -12px rgba(0,0,0,.3)}
.card b{font-size:36px;line-height:1;background:linear-gradient(180deg,#F0DBA8,#B8924D);-webkit-background-clip:text;background-clip:text;color:transparent}.card b i{font-style:normal;font-family:'Pretendard';font-size:14px;font-weight:300;margin-left:8px;color:var(--sub);-webkit-text-fill-color:var(--sub)}
.seg{gap:22px;margin-top:6px}.seg button{font-size:12px;letter-spacing:.1em;color:var(--mute);padding-bottom:6px}.seg .on{color:var(--brand);box-shadow:0 1px 0 var(--brand)}
.todo{border-bottom:1px solid var(--line);padding:14px 0;grid-template-columns:18px 1fr auto}.todo strong{font-weight:400;font-size:15px}
.check{width:16px;height:16px;border:1px solid var(--brand)}.pay{font-size:13px;color:var(--brand)}
.todo.late .check{border-color:var(--bad)}
.btn{border-radius:999px;font-weight:500;letter-spacing:.06em}
.btn.primary{background:linear-gradient(180deg,#E3C587,#B8924D);color:#000}.btn.secondary{border:1px solid var(--brand);color:var(--brand)}
.edit{font-weight:400}.pill{border:1px solid var(--line);border-radius:999px;color:var(--ink);font-weight:400}
.title{font-weight:300;font-size:30px}
.calc div{border-bottom:1px solid var(--line);padding:14px 0}.calc dd{font-size:13px}.calc dt{color:var(--sub)}.calc .total{border-bottom:0}.calc .total dd{font-size:32px;color:var(--brand)}
.mine{color:var(--sub);letter-spacing:.06em}.mine .big{font-size:44px;color:var(--brand)}
.rank li{border-bottom:1px solid var(--line);padding:14px 0}.rank .me{border:1px solid var(--brand);border-radius:12px;margin:6px -10px;padding:14px 10px}.score{font-size:12px}.pos{font-size:11px;color:var(--sub)}
.stamp{height:22px;padding:0 9px;border:1px solid var(--tone);color:var(--tone);border-radius:999px;font-size:11px;font-weight:400;letter-spacing:.06em}
.tabs{border-top:1px solid var(--line)}.tabs a.on{color:var(--brand)}.tabs svg{stroke-width:1.2}
.chip{border:1px solid var(--line);border-radius:999px;font-weight:400}.chip.on{border-color:var(--brand);color:var(--brand)}
.toast{background:var(--surface);border:1px solid var(--line);border-radius:12px}.toast button{color:var(--brand)}
.field input{border-color:var(--line);border-radius:12px;color:var(--ink)}
.proof{background:var(--surface);border-radius:16px;padding:14px}.proof .photo{border-radius:10px;background:repeating-linear-gradient(135deg,#333 0 1px,transparent 1px 9px),#222}.bal{font-size:36px;color:var(--brand)}
`,
  },

  // ------------------------------------------------------------------ 08
  {
    no: '08',
    key: 'chat',
    name: '독촉 문자',
    lede: '은행이 문자를 보낸다. 할 일은 말풍선으로 오고, 끝냈다고 답하면 냥이 들어온다. 새 할 일은 메시지를 쓰듯 적는다.',
    source: '메신저 대화방, 은행 알림 문자, 빠른 답장 단추',
    signature: '말풍선 안에 든 할 일과 그 아래 답장 단추',
    never: '은행이 길게 말하기(말풍선 하나에 한 줄), 이모지 남발',
    fonts: PRETENDARD,
    home: ({ M, tabs }) => `<div class="phone"><div class="status">9:41</div><header class="top room"><img src="${M}" alt=""><div><h1>냥 은행</h1><small>잔액 <b class="num">7,300</b>냥</small></div>${gear}</header>
      <div class="body thread"><p class="day">11월 24일 화요일</p>
      <div class="msg"><p class="bubble">늦은 일이 하나 있어요.</p></div>
      <div class="msg"><div class="bubble task late"><strong>세금 신고 자료 정리</strong><small>3일 늦음</small><b class="num pay">2,100</b><div class="acts"><button>끝냈어요</button><button>미루기</button></div></div></div>
      <div class="msg"><div class="bubble task"><strong>보고서 초안</strong><small>오늘까지</small><b class="num pay">2,200</b><div class="acts"><button>끝냈어요</button><button>미루기</button></div></div></div>
      <div class="msg me"><p class="bubble">장보기 끝냈어요</p></div>
      <div class="msg"><p class="bubble"><i class="coin"></i> <b class="num plus">+1,100</b>냥 넣었어요.</p></div>
      <div class="quick"><button class="chip on">진행 중 4</button><button class="chip">끝낸 일</button><button class="chip">통장</button></div></div>
      <div class="composer"><b>+</b><span>할 일 적기</span><em>보내기</em></div>${tabs('todo')}</div>`,
    rank: ({ M, seg, tabs }) => `<div class="phone">${top('순위', wallet)}
      <div class="body">${seg('이번 주', '이번 달')}
      <ol class="rank people">${[
        ['1', '준호', '부지런', 'ok', '2,250', ''],
        ['2', '민지', '성실', 'ok', '1,720', ''],
        ['3', '현영 (나)', '성실', 'ok', '1,350', 'me'],
        ['4', '서연', '벼락치기', 'warn', '600', ''],
        ['5', '도윤', '빚더미', 'bad', '−1,830', ''],
      ]
        .map(([p, n, s, t, sc, me]) => `<li class="${me}"><b class="pos num">${p}</b><img src="${M}" alt=""><div><span class="who">${n}</span><small class="st ${t}">${s}</small></div><b class="num score ${sc.startsWith('−') ? 'neg' : ''}">${sc}</b></li>`)
        .join('')}</ol></div>${tabs('rank')}</div>`,
    colors: [
      ['대화방', '#DCE6F2', '화면 바탕'],
      ['은행 말풍선', '#FFFFFF', '받은 말'],
      ['내 말풍선', '#1B2430', '보낸 말'],
      ['귤색', '#FF6B35', '답장 단추, 고른 것'],
      ['입금 초록', '#1E9E61', '들어온 냥'],
      ['독촉 빨강', '#E5383B', '늦음, 빚'],
      ['동전', '#FFC83D', '냥 표시'],
    ],
    type: [
      ['숫자', 'Pretendard 800 · 표 숫자', 'font-weight:800;font-size:40px;line-height:1.1;font-variant-numeric:tabular-nums', '7,300'],
      ['제목', 'Pretendard 700 · 24', 'font-weight:700;font-size:24px', '헬스장 가기'],
      ['말풍선', 'Pretendard 500 · 15', 'font-weight:500;font-size:15px', '늦은 일이 하나 있어요.'],
      ['작은 글자', 'Pretendard 500 · 12', 'font-weight:500;font-size:12px;color:var(--sub)', '11월 24일 화요일'],
    ],
    talk: [
      ['디자이너', '화면을 배울 필요가 없습니다. 누구나 대화방은 쓸 줄 아니까요. 할 일을 적는 일이 메시지 보내기와 같아집니다.'],
      ['대표', '알림과 앱 화면이 같은 말투로 이어지는 게 좋아요. 할 일이 열 개를 넘으면 대화가 너무 길어지지 않을까요.'],
      ['CTO', '목록을 대화로 바꾸면 정렬과 수정이 어려워집니다. 대화는 오늘 것만 보여 주고, 전체 목록은 "진행 중" 단추 뒤에 따로 둬야 해요.'],
      ['엔지니어', '홈이 목록에서 대화로 바뀌니 다섯 가지 중 코드를 가장 많이 새로 씁니다. 글꼴과 그림은 지금 것을 그대로 씁니다.'],
    ],
    impl: ['글꼴 추가 없음. 지금의 Pretendard와 마스코트 그대로.', '홈 화면 구조를 새로 만든다(대화, 답장 단추, 입력 줄). 코드가 가장 많이 바뀐다.', '은행이 하는 말을 상황별로 한 줄씩 정해 두어야 한다.'],
    css: `
:root{--page:#C6D4E6;--bg:#DCE6F2;--surface:#fff;--ink:#1B2430;--sub:#5B6776;--mute:#93A0B0;--line:#C3CFDD;--brand:#FF6B35;--ok:#1E9E61;--warn:#B56A00;--bad:#E5383B;--coin:#FFC83D;--display:'Pretendard',sans-serif;--body:'Pretendard',sans-serif}
.doc-head h1{font-weight:800}
.num{font-variant-numeric:tabular-nums;font-weight:800}
.room{background:#fff;justify-content:flex-start;gap:10px;padding-bottom:10px}.room img{width:40px;height:40px;border-radius:50%;background:var(--bg)}.room h1{font-size:16px}.room small{font-size:12px;color:var(--sub)}.room .gear{margin-left:auto}
.gear{font-size:13px;color:var(--sub)}
.thread{gap:8px;padding-top:12px}.day{align-self:center;font-size:11px;color:var(--sub);background:rgba(255,255,255,.6);border-radius:999px;padding:3px 10px;margin-bottom:4px}
.msg{display:flex}.msg.me{justify-content:flex-end}
.bubble{background:#fff;border-radius:4px 18px 18px 18px;padding:10px 14px;max-width:86%;font-weight:500}
.msg.me .bubble{background:var(--ink);color:#fff;border-radius:18px 4px 18px 18px}
.task{display:grid;grid-template-columns:1fr auto;gap:0 14px;width:86%;align-items:center}.task strong{font-weight:700}.task small{grid-column:1;color:var(--sub);font-size:12px}
.task .pay{grid-column:2;grid-row:1/3;font-size:20px}.task.late{box-shadow:inset 3px 0 0 var(--bad)}.task.late small,.task.late .pay{color:var(--bad)}
.acts{grid-column:1/-1;display:flex;gap:8px;margin-top:10px}.acts button{flex:1;padding:8px;border-radius:10px;font-weight:700;font-size:13px;background:#F1F4F8}.acts button:first-child{background:var(--brand);color:#fff}
.quick{display:flex;gap:6px;margin-top:auto;padding-top:8px}
.composer{display:flex;align-items:center;gap:10px;background:#fff;padding:8px 12px;border-top:1px solid var(--line)}.composer b{width:32px;height:32px;border-radius:50%;background:#F1F4F8;display:grid;place-items:center;font-size:20px;font-weight:500}
.composer span{flex:1;background:#F1F4F8;border-radius:999px;padding:8px 14px;color:var(--mute)}.composer em{font-style:normal;font-weight:700;color:var(--brand);font-size:13px}
.seg{background:rgba(255,255,255,.55);border-radius:12px;padding:3px;gap:0}.seg button{flex:1;padding:7px;border-radius:10px;font-weight:600;color:var(--sub)}.seg .on{background:#fff;color:var(--ink)}
.todo{background:#fff;border-radius:4px 18px 18px 18px;padding:12px 14px;margin-bottom:8px}
.btn{border-radius:14px}.btn.primary{background:var(--brand);color:#fff}.btn.secondary{background:#fff}
.pill{background:#fff;border-radius:999px;color:var(--ink)}
.calc{background:#fff;border-radius:4px 18px 18px 18px;padding:6px 16px}.calc div{border-bottom:1px solid #EEF1F5}.calc .total{border-bottom:0}
.people li{grid-template-columns:16px 40px 1fr auto;background:#fff;border-radius:16px;padding:10px 14px;margin-bottom:8px}.people img{width:40px;height:40px;border-radius:50%;background:var(--bg)}
.people .who{display:block;font-weight:700}.people .st{font-size:12px}.st.ok{color:var(--ok)}.st.warn{color:var(--warn)}.st.bad{color:var(--bad)}
.people .me{background:var(--ink);color:#fff}.people .me .st{color:#8FE3B5}.pos{color:var(--mute);font-size:12px}
.stamp{font-size:11px;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,var(--tone) 14%,#fff);color:var(--tone)}
.tabs{background:#fff;border-top:1px solid var(--line)}
.chip{background:#fff;border-radius:999px;padding:7px 13px}.chip.on{background:var(--brand);color:#fff}
.toast{background:var(--ink);color:#fff;border-radius:14px}.toast button{color:var(--coin)}
.field input{border:0;border-radius:14px}
.proof{background:#fff;border-radius:4px 18px 18px 18px;padding:12px}.proof .photo{border-radius:12px}
`,
  },

  // ------------------------------------------------------------------ 09
  {
    no: '09',
    key: 'glass',
    name: '유리 위젯',
    lede: '해 뜰 무렵 하늘 위에 반투명한 타일을 얹었다. 잔액, 신용, 순위, 할 일이 저마다 한 칸씩 차지하는 위젯 판이다.',
    source: '휴대폰 홈 화면 위젯, 21st.dev의 벤토 그리드와 유리 효과, 진행 고리',
    signature: '두 줄로 짜인 반투명 타일과 둥근 진행 고리',
    never: '타일 안에 타일 넣기, 유리 위에 작은 회색 글자',
    fonts: PRETENDARD + G('family=Outfit:wght@400;600;700'),
    home: ({ seg, tabs, ring }) => `<div class="phone">${top('할 일 이자', gear)}
      <div class="body"><div class="bento">
        <div class="g wide"><small>잔액</small><div class="balt"><b class="num">7,300</b><span>냥</span><em class="num">+1,100</em></div><svg class="spark" viewBox="0 0 280 40" preserveAspectRatio="none"><path d="M0 30 L40 26 L80 32 L120 20 L160 24 L200 12 L240 16 L280 4"/></svg></div>
        <div class="g mini">${ring(72)}<div><small>신용</small><b>2등급</b></div></div>
        <div class="g mini"><b class="num big">3</b><div><small>이번 주</small><b>12명 중</b></div></div>
      </div>${seg('진행 중 4', '끝낸 일')}
      <div class="bento">${[
        ['세금 신고 자료 정리', '3일 늦음', '2,100', 'late'],
        ['보고서 초안', '오늘까지', '2,200', ''],
        ['헬스장 가기', '토요일까지', '3,300', ''],
        ['책 반납', '다음 주 화요일까지', '1,100', ''],
      ]
        .map(([a, b, c, l]) => `<div class="g tt ${l}"><span class="check"></span><strong>${a}</strong><small>${b}</small><b class="num pay">${c}</b></div>`)
        .join('')}</div></div>
      <button class="btn primary fab">할 일 추가</button>${tabs('todo')}</div>`,
    detail: ({ ring }) => `<div class="phone">${head}<div class="body">${headline}
      <div class="g dialbox">${ring(57)}<div class="in"><b class="num">3,300</b><small>돌려받을 냥</small></div></div>
      <dl class="calc g"><div><dt>원금</dt><dd class="num">3,000</dd></div><div><dt>이자</dt><dd class="num plus">+300</dd></div><div class="faint"><dt>늦으면 하루</dt><dd class="num">−300</dd></div></dl></div>
      <div class="actions"><button class="btn primary">끝냈어요</button><button class="btn text danger">포기하기</button></div></div>`,
    colors: [
      ['살구', '#FFD9A0', '하늘 번짐'],
      ['장미', '#FF9EB5', '하늘 번짐, 늦은 타일'],
      ['하늘', '#9AD0FF', '하늘 번짐'],
      ['유리', 'rgba(255,255,255,.5)', '타일'],
      ['밤색 먹', '#1D1B2E', '글자, 큰 버튼'],
      ['풀빛', '#12996B', '적립, 진행 고리'],
      ['다홍', '#E5484D', '늦음, 빚'],
    ],
    type: [
      ['큰 숫자', 'Outfit 700 · 숫자에만', "font-family:'Outfit';font-weight:700;font-size:48px;line-height:1.1", '7,300'],
      ['제목', 'Pretendard 700 · 24', 'font-weight:700;font-size:24px', '헬스장 가기'],
      ['본문', 'Pretendard 500 · 14', 'font-weight:500;font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', 'Pretendard 600 · 12', 'font-weight:600;font-size:12px;color:var(--sub)', '3일 늦음'],
    ],
    talk: [
      ['디자이너', '참고하라고 주신 21st.dev에서 가장 많이 보인 흐름을 그대로 가져온 방향입니다. 지금 가장 "요즘 앱" 같아 보입니다.'],
      ['대표', '예쁘고 스크린샷이 잘 나와요. 그런데 다른 앱들과 구별되는 점이 색 말고는 약해요.'],
      ['CTO', '흐림 효과는 안드로이드 중저가 기기에서 느립니다. 흐림을 끄고 반투명 흰색만 써도 괜찮은지 봐야 해요.'],
      ['엔지니어', '흐림은 expo-blur로 되지만 타일이 많으면 버벅입니다. 바탕 그림 위에 흰색 반투명 면만 두는 쪽으로 하면 가볍습니다.'],
    ],
    impl: ['글꼴 1개 추가(Outfit, 숫자만).', '하늘 바탕 그림 1장, 타일과 진행 고리 컴포넌트 2개.', '흐림 효과는 느린 기기에서 끄는 길을 같이 만든다.'],
    css: `
:root{--page:#F3EEF6;--bg:#F6F2FF;--surface:rgba(255,255,255,.7);--ink:#1D1B2E;--sub:#55516B;--mute:#8D89A3;--line:rgba(255,255,255,.8);--brand:#1D1B2E;--ok:#12996B;--warn:#B36B00;--bad:#E5484D;--coin:#FFB534;--display:'Pretendard',sans-serif;--body:'Pretendard',sans-serif;
--sky:radial-gradient(60% 45% at 10% 8%,#FFD9A0 0,transparent 65%),radial-gradient(55% 40% at 95% 22%,#FF9EB5 0,transparent 65%),radial-gradient(80% 55% at 55% 100%,#9AD0FF 0,transparent 65%),#F6F2FF}
.doc-head h1{font-weight:800}
.phone,.kit-body{background:var(--sky);outline:0;border-radius:28px}.kit-body{border-radius:24px}
.sw i{border-color:#DDD6E6;border-radius:16px}
.num{font-family:'Outfit','Pretendard',sans-serif;font-weight:700}
.gear{font-size:13px;color:var(--sub);font-weight:600}
.body{padding-bottom:156px}
.g{background:rgba(255,255,255,.5);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(255,255,255,.8);border-radius:24px;padding:14px 16px;box-shadow:0 8px 24px rgba(40,30,80,.07)}
.bento{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wide{grid-column:1/-1;position:relative;overflow:hidden}
.g small{font-size:12px;font-weight:600;color:var(--sub)}
.balt{display:flex;align-items:baseline;gap:6px}.balt b{font-size:44px;line-height:1.1}.balt em{font-style:normal;margin-left:auto;background:#fff;border-radius:999px;padding:3px 10px;font-size:13px;color:var(--ok)}
.spark{display:block;width:100%;height:34px;margin-top:4px}.spark path{fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mini{display:flex;align-items:center;gap:10px}.mini b{display:block;font-size:15px}.mini .big{font-size:44px;line-height:1}
.ring{width:48px;height:48px;transform:rotate(-90deg);flex:none}.ring circle{fill:none;stroke-width:10}.ring .tr{stroke:rgba(255,255,255,.9)}.ring .pr{stroke:var(--ok);stroke-linecap:round}
.seg{background:rgba(255,255,255,.45);border-radius:999px;padding:4px;gap:0}.seg button{flex:1;padding:7px;border-radius:999px;font-weight:600;color:var(--sub)}.seg .on{background:#fff;color:var(--ink)}
.tt{display:flex;flex-direction:column;gap:2px;min-height:112px;position:relative;padding-right:40px}.tt strong{font-weight:700;line-height:1.3}.tt .pay{margin-top:auto;font-size:22px}
.tt .check{position:absolute;top:12px;right:12px;width:24px;height:24px;background:rgba(255,255,255,.8);border:1.5px solid var(--ink)}
.tt.late{background:rgba(255,158,181,.45)}.tt.late small,.tt.late .pay{color:#B4232C}
.btn{border-radius:999px}.btn.primary{background:var(--ink);color:#fff}.btn.secondary{background:rgba(255,255,255,.7);border:1px solid #fff}
.fab{position:absolute;left:0;right:0;bottom:84px;z-index:3}
.tabs{position:absolute;left:16px;right:16px;bottom:14px;z-index:3;background:rgba(255,255,255,.6);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid #fff;border-radius:999px;padding:5px;box-shadow:0 8px 24px rgba(40,30,80,.1)}
.tabs a{border-radius:999px;padding:6px 0 7px;color:var(--sub)}.tabs a.on{background:var(--ink);color:#fff}
.tabwrap{margin:0;position:relative;height:64px}.tabwrap .tabs{left:0;right:0;bottom:0}
.pill{background:rgba(255,255,255,.7);border:1px solid #fff;border-radius:999px;color:var(--ink)}
.dialbox{position:relative;display:grid;place-items:center;padding:22px}.dialbox .ring{width:190px;height:190px}.dialbox .ring circle{stroke-width:7}
.in{position:absolute;text-align:center}.in b{display:block;font-size:40px;line-height:1.1}
.calc.g{padding:6px 16px}.calc div{border-bottom:1px solid rgba(255,255,255,.9)}.calc div:last-child{border-bottom:0}
.actions{padding-bottom:24px}
.mine .big{font-size:52px}
.rank li{background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.8);border-radius:18px;padding:11px 14px;margin-bottom:8px}.rank .me{background:#fff}
.stamp{padding:3px 10px 3px 8px;border-radius:999px;background:rgba(255,255,255,.75);font-size:11px;font-weight:600;gap:5px;grid-auto-flow:column}.stamp::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--tone)}
.chip{background:rgba(255,255,255,.6);border:1px solid #fff;border-radius:999px}.chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.toast{background:var(--ink);color:#fff;border-radius:18px}.toast button{color:#FFD9A0}
.field input{border:1px solid #fff;border-radius:16px;background:rgba(255,255,255,.7)}
.proof{background:rgba(255,255,255,.55);border:1px solid #fff;border-radius:24px;padding:14px}.proof .photo{border-radius:16px}.bal{font-size:48px}
`,
  },

  // ------------------------------------------------------------------ 10
  {
    no: '10',
    key: 'clock',
    name: '탁상시계',
    lede: '시간이 돈이라면 화면의 주인은 시계다. 가장 가까운 마감까지 남은 시간이 가장 크게 보이고, 주황색 단추 하나만 눈에 띈다.',
    source: '옛 탁상시계와 계산기의 회색 몸통, 검은 눈금, 주황색 둥근 단추',
    signature: '크게 흐르는 남은 시간과 주황색 둥근 단추 하나',
    never: '주황을 한 화면에 두 번 넘게 쓰기, 그림자, 장식 그림',
    fonts: G('family=Inter+Tight:wght@300;500;700&family=Noto+Sans+KR:wght@400;500;700'),
    home: ({ seg, todos, tabs }) => `<div class="phone">${top('할 일 이자', '<span class="wallet"><b class="num">7,300</b><span>냥</span></span>')}
      <div class="body"><div class="next"><small>보고서 초안, 오늘 자정까지</small><b class="num">14:22<i>:07</i></b><div class="meter"><i></i></div><p><span>놓치면 하루 <b class="num">−200</b></span><span>12명 중 3등</span><span>2등급</span></p></div>
      ${seg('진행 중 4', '끝낸 일')}${todos}</div>
      <button class="btn primary fab" aria-label="할 일 추가">할 일 추가</button>${tabs('todo')}</div>`,
    detail: () => `<div class="phone">${head}<div class="body">${headline}
      <div class="dial"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="tk" pathLength="120" stroke-dasharray="0.5 9.5"/><circle cx="50" cy="50" r="38" class="tr"/><circle cx="50" cy="50" r="38" class="pr" pathLength="100" stroke-dasharray="57 100"/></svg><div class="in"><b class="num">4</b><small>일 남음</small></div></div>
      <dl class="calc"><div><dt>원금</dt><dd class="num">3,000</dd></div><div><dt>이자</dt><dd class="num">+300</dd></div><div class="faint"><dt>늦으면 하루</dt><dd class="num">−300</dd></div><div class="total"><dt>돌려받을 냥</dt><dd class="num">3,300</dd></div></dl></div>
      <div class="keys"><button class="key">포기</button><button class="key">미루기</button><button class="key go">끝냈어요</button></div></div>`,
    rank: ({ seg, stamp, tabs }) => `<div class="phone">${top('순위', '<span class="wallet"><b class="num">7,300</b><span>냥</span></span>')}
      <div class="body">${seg('이번 주', '이번 달')}<p class="mine"><b class="num big">3</b><span>등, 12명 중</span></p>
      <ol class="rank bars">${[
        ['1', '준호', '부지런', 'ok', '2,250', 100, ''],
        ['2', '민지', '성실', 'ok', '1,720', 76, ''],
        ['3', '현영 (나)', '성실', 'ok', '1,350', 60, 'me'],
        ['4', '서연', '벼락치기', 'warn', '600', 27, ''],
        ['5', '도윤', '빚더미', 'bad', '−1,830', 81, 'debt'],
      ]
        .map(([p, n, s, t, sc, w, c]) => `<li class="${c}"><b class="pos num">${p}</b><div><span class="who">${n}</span>${stamp(s, t)}</div><b class="num score">${sc}</b><span class="bar"><i style="width:${w}%"></i></span></li>`)
        .join('')}</ol></div>${tabs('rank')}</div>`,
    colors: [
      ['몸통 회색', '#E9E9E6', '화면 바탕'],
      ['밝은 면', '#F6F6F3', '입력 칸'],
      ['검정', '#111111', '글자, 눈금, 줄'],
      ['단추 주황', '#FF5A1F', '끝냈어요 단추, 늦음'],
      ['단추 회색', '#D3D3CE', '나머지 단추'],
      ['표시등 초록', '#1F7A3A', '적립 표시'],
      ['흐린 글자', '#8E8E88', '초, 덜 중요한 숫자'],
    ],
    type: [
      ['시간', 'Inter Tight 300 · 72', "font-family:'Inter Tight';font-weight:300;font-size:72px;line-height:1;letter-spacing:-.03em", '14:22:07'],
      ['숫자', 'Inter Tight 500 · 20', "font-family:'Inter Tight';font-weight:500;font-size:20px", '3,300'],
      ['본문', 'Noto Sans KR 500 · 14', 'font-weight:500;font-size:14px', '토요일까지 끝내면 3,300냥을 돌려받아요.'],
      ['작은 글자', 'Noto Sans KR 400 · 12', 'font-size:12px;color:var(--sub)', '보고서 초안, 오늘 자정까지'],
    ],
    talk: [
      ['디자이너', '다른 방향은 모두 돈을 그렸고, 이것만 시간을 그렸습니다. 남은 시간이 줄어드는 것을 보는 것만으로 미루기가 불편해집니다.'],
      ['대표', '가장 세련되고 오래 봐도 질리지 않을 것 같아요. 귀여움이 없어서 마스코트와 상점이 붕 뜰 수 있어요.'],
      ['CTO', '초 단위로 숫자가 바뀌니 화면이 계속 다시 그려집니다. 그 숫자만 따로 떼어 그리면 문제없어요.'],
      ['엔지니어', '색이 회색, 검정, 주황 셋이라 토큰이 가장 단순합니다. 눈금과 고리는 벡터 그림 컴포넌트 하나로 됩니다.'],
    ],
    impl: ['글꼴 2개 추가(Inter Tight 숫자, Noto Sans KR).', '남은 시간 표시, 눈금 고리, 둥근 단추 컴포넌트 3개.', '마스코트는 순위와 상점, 끝냈을 때에만 나온다. 홈에는 없다.'],
    css: `
:root{--page:#DADAD6;--bg:#E9E9E6;--surface:#F6F6F3;--ink:#111;--sub:#55554F;--mute:#8E8E88;--line:#111;--brand:#FF5A1F;--ok:#1F7A3A;--warn:#B36B00;--bad:#FF5A1F;--coin:#111;--display:'Inter Tight','Noto Sans KR',sans-serif;--body:'Noto Sans KR',sans-serif}
.doc-head h1{font-weight:300;letter-spacing:-.03em}section>h2{font-weight:500}
.facts,.type-row,.impl li{border-color:#111}.sw i{border:0}
.num{font-family:'Inter Tight',sans-serif;font-weight:500;font-variant-numeric:tabular-nums}
.top h1{font-size:15px;font-weight:500}.wallet{font-weight:500}.wallet .num{font-size:18px}
.next small{font-size:12px;color:var(--sub)}.next>b{display:block;font-size:76px;line-height:1;font-weight:300;letter-spacing:-.03em;margin:2px 0 10px -3px}.next>b i{font-style:normal;color:var(--mute)}
.meter{height:14px;background:repeating-linear-gradient(90deg,#111 0 1px,transparent 1px 12px);position:relative;border-bottom:1px solid #111}.meter i{position:absolute;left:0;bottom:-1px;height:3px;width:40%;background:var(--brand)}
.next p{display:flex;justify-content:space-between;font-size:12px;margin-top:8px}
.seg{gap:20px;border-bottom:1px solid #111}.seg button{padding:8px 0;color:var(--mute);font-weight:500}.seg .on{color:#111;box-shadow:0 2px 0 #111}
.todos{margin-top:-16px}.todo{border-bottom:1px solid #111;padding:13px 0}.todo strong{font-weight:500}.pay{font-size:20px;font-weight:500}
.check{border:1.5px solid #111;background:conic-gradient(#111 calc(var(--p,0)*1%),transparent 0)}
.todo:nth-child(1) .check{background:var(--brand);border-color:var(--brand)}.todo:nth-child(2) .check{--p:88}.todo:nth-child(3) .check{--p:40}.todo:nth-child(4) .check{--p:12}
.btn{border-radius:999px;font-weight:500}.btn.primary{background:var(--brand);color:#fff}.btn.secondary{background:#D3D3CE}
.fab{position:absolute;right:0;bottom:66px;width:60px!important;min-height:60px;padding:0;font-size:0}.fab::before{content:'+';font-size:34px;font-weight:300;line-height:1;font-family:'Inter Tight'}
.tabs{border-top:1px solid #111}.tabs svg{display:none}.tabs a{font-size:13px;padding:14px 0 16px;color:var(--mute)}.tabs a.on{color:#111;font-weight:700}.tabs a.on span::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--brand);margin-right:5px;vertical-align:2px}
.edit{color:#111;font-weight:500}.pill{border:1px solid #111;border-radius:999px;color:#111;font-weight:500}
.title{font-weight:500;font-size:26px}
.dial{position:relative;display:grid;place-items:center;padding:4px 0}.dial svg{width:200px;height:200px;transform:rotate(-90deg)}
.dial circle{fill:none}.tk{stroke:#111;stroke-width:5}.tr{stroke:#D3D3CE;stroke-width:3}.dial .pr{stroke:var(--brand);stroke-width:3}
.in{position:absolute;text-align:center}.in b{display:block;font-size:72px;line-height:.95;font-weight:300}.in small{font-size:12px;color:var(--sub)}
.calc{border-top:2px solid #111}.calc div{border-bottom:1px solid #111;padding:9px 0}.calc dt{font-size:13px}.calc dd{font-weight:500}.calc .total dd{font-size:30px;font-weight:500}.plus{color:#111}
.keys{display:flex;justify-content:space-between;align-items:flex-end;padding:8px 20px 24px}
.key{width:68px;height:68px;border-radius:50%;background:#D3D3CE;font-size:13px;font-weight:500}.key.go{width:92px;height:92px;background:var(--brand);color:#fff;font-size:15px;font-weight:700}
.mine{display:flex;align-items:baseline;gap:6px;color:var(--sub)}.mine .big{font-size:76px;font-weight:300;color:#111;letter-spacing:-.03em}
.bars li{grid-template-columns:16px 1fr auto;border-bottom:1px solid #111;gap:4px 10px;padding:10px 0}.bars li>div{display:flex;align-items:center;gap:10px}
.bar{grid-column:2/-1;height:4px;background:#D3D3CE}.bar i{display:block;height:100%;background:#111}.bars .debt .bar i{background:var(--brand)}.bars .debt .score{color:var(--brand)}.bars .me .who{font-weight:700}
.stamp{font-size:11px;font-weight:500;color:var(--sub);gap:5px;grid-auto-flow:column}.stamp::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--tone)}
.chip{border:1px solid #111;border-radius:999px;font-weight:500}.chip.on{background:#111;color:#fff}
.toast{background:#111;color:#fff}.toast button{color:var(--brand)}
.field input{border:0;border-bottom:1px solid #111;background:transparent;padding:0}
.proof{background:var(--surface);padding:14px}.bal{font-size:64px;font-weight:300;letter-spacing:-.03em}.delta{color:#111}
`,
  },
];
