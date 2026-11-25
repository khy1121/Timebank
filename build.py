"""
할일통장 공개 페이지(지원·개인정보 처리방침)를 만든다.

처리방침 본문은 앱 안 처리방침(app/src/domain/privacy.ts)에서 그대로 읽어 온다.
앱 처리방침을 고치면 이 스크립트를 다시 돌려 site/privacy.html을 새로 만든다.

    python site/build.py

만든 파일은 gh-pages 브랜치에 올린다(README.md 참고).
"""

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
PRIVACY_TS = ROOT / 'app' / 'src' / 'domain' / 'privacy.ts'
SETTINGS_TS = ROOT / 'app' / 'src' / 'domain' / 'settings.ts'

APP = '할일통장'


def read_privacy():
    src = PRIVACY_TS.read_text(encoding='utf-8')
    date = re.search(r"PRIVACY_EFFECTIVE_DATE = '([^']+)'", src).group(1)
    body = src[src.index('PRIVACY_SECTIONS'):]
    sections = []
    for m in re.finditer(r"title: '([^']+)',\s*lines: \[(.*?)\],\s*\}", body, re.S):
        lines = [s.replace("\\'", "'") for s in re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))]
        sections.append((m.group(1), lines))
    if not sections:
        raise SystemExit('privacy.ts에서 절을 찾지 못했다')
    return date, sections


def read_contact():
    src = SETTINGS_TS.read_text(encoding='utf-8')
    return re.search(r"CONTACT_EMAIL = [^']*'([^']+)'", src).group(1)


STYLE = """
:root {
  --page: #FFF6EA; --card: #FFFFFF; --ink: #3A2A1E; --sub: #7A6657; --line: #EADFD2; --brand: #D45A2A; --soft: #FFE9DE;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --page: #1F1915; --card: #2A221D; --ink: #F5ECE3; --sub: #C2B2A3; --line: #3D332C; --brand: #FF9A6B; --soft: #3A2A22; }
}
:root[data-theme="dark"] { --page: #1F1915; --card: #2A221D; --ink: #F5ECE3; --sub: #C2B2A3; --line: #3D332C; --brand: #FF9A6B; --soft: #3A2A22; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--page); color: var(--ink);
  font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif; line-height: 1.7; }
main { max-width: 720px; margin: 0 auto; padding: 32px 16px 56px; }
header.top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
.brand { font-weight: 800; font-size: 22px; color: var(--ink); text-decoration: none; }
nav a { color: var(--sub); margin-left: 14px; text-decoration: none; font-size: 15px; }
nav a[aria-current="page"] { color: var(--brand); font-weight: 700; }
h1 { font-size: 28px; line-height: 1.3; margin: 0 0 8px; }
.lead { color: var(--sub); margin: 0 0 28px; }
section { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 20px 20px 8px; margin-bottom: 14px; }
h2 { font-size: 18px; margin: 0 0 10px; }
ul { margin: 0 0 12px; padding-left: 20px; }
li { margin-bottom: 8px; }
p { margin: 0 0 12px; }
.mail { display: inline-block; background: var(--soft); color: var(--brand); font-weight: 700; padding: 6px 12px; border-radius: 10px; text-decoration: none; word-break: break-all; }
a { color: var(--brand); }
a:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
footer { color: var(--sub); font-size: 14px; margin-top: 24px; text-align: center; }
"""


def page(title, path, body, desc):
    current = ' aria-current="page"'
    nav = ''.join(
        f'<a href="{href}"{current if href == path else ""}>{label}</a>'
        for href, label in [('./', '지원'), ('privacy.html', '개인정보 처리방침')]
    )
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<style>{STYLE}</style>
</head>
<body>
<main>
<header class="top"><a class="brand" href="./">{APP}</a><nav aria-label="페이지">{nav}</nav></header>
{body}
<footer>© {APP}</footer>
</main>
</body>
</html>
"""


def build():
    date, sections = read_privacy()
    mail = read_contact()
    mailto = f'mailto:{mail}?subject={html.escape("[" + APP + "] 문의")}'

    privacy_body = f'<h1>개인정보 처리방침</h1><p class="lead">{date}부터 적용해요. 앱 안의 설정 &gt; 개인정보 처리방침과 같은 내용이에요.</p>'
    for title, lines in sections:
        items = ''.join(f'<li>{html.escape(line)}</li>' for line in lines)
        privacy_body += f'<section><h2>{html.escape(title)}</h2><ul>{items}</ul></section>'
    privacy_body += f'<section><h2>문의</h2><p>개인정보와 관련한 문의는 메일로 보내 주세요.</p><p><a class="mail" href="{mailto}">{mail}</a></p></section>'

    support_body = f"""<h1>{APP} 지원</h1>
<p class="lead">할 일을 적고 냥을 걸어 두는 앱이에요. 기한 안에 끝내면 원금과 이자를 돌려받고, 미루면 원금이 깎여요.</p>
<section><h2>문의하기</h2>
<p>쓰다가 막히거나 고쳤으면 하는 점이 있으면 메일로 알려 주세요. 앱의 설정 &gt; 의견 보내기를 누르면 앱 버전과 기기 종류가 미리 채워진 메일이 열려요.</p>
<p><a class="mail" href="{mailto}">{mail}</a></p></section>
<section><h2>계정과 데이터 지우기</h2>
<ul>
<li>앱에서: 설정 &gt; 계정 삭제를 누르고 확인 글자를 입력하면 서버의 계정과 할 일, 기록, 신용 점수, 친구 관계, 그룹 참여와 인증 사진이 바로 지워져요. 되돌릴 수 없어요.</li>
<li>앱을 열 수 없다면: 로그인에 쓴 카카오 닉네임을 적어 메일 <a href="{mailto}">{mail}</a> 앞으로 삭제를 요청해 주세요. 본인 확인 뒤 지워 드려요.</li>
<li>오류 기록(Sentry)은 30일이 지나면 자동으로 지워져요.</li>
</ul></section>
<section><h2>자주 묻는 질문</h2>
<ul>
<li><strong>냥은 진짜 돈인가요?</strong> 아니에요. 앱 안에서만 쓰는 가상 단위라 살 수도, 돈으로 바꿀 수도 없어요.</li>
<li><strong>할 일 제목이 친구에게 보이나요?</strong> 아니요. 친구 그룹에서 인증한 할 일만 그 그룹 사람에게 보여요.</li>
<li><strong>알림이 오지 않아요.</strong> 휴대폰 설정에서 {APP} 알림을 켰는지, 앱의 설정 &gt; 알림 받기가 켜져 있는지 확인해 주세요.</li>
</ul></section>
<section><h2>개인정보 처리방침</h2><p><a href="privacy.html">개인정보 처리방침 보기</a></p></section>
"""
    (SITE / 'index.html').write_text(page(f'{APP} 지원', './', support_body, f'{APP} 문의, 계정 삭제 방법, 자주 묻는 질문'), encoding='utf-8', newline='\n')
    (SITE / 'privacy.html').write_text(page(f'{APP} 개인정보 처리방침', 'privacy.html', privacy_body, f'{APP} 개인정보 처리방침'), encoding='utf-8', newline='\n')
    print(f'만듦: index.html, privacy.html (처리방침 {len(sections)}절, {date})')


if __name__ == '__main__':
    build()
