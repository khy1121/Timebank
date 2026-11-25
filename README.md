# 공개 페이지

todobank의 지원 페이지(`index.html`)와 개인정보 처리방침(`privacy.html`). 스토어에 적는 지원 주소·처리방침 주소로 쓴다.

- 처리방침 본문은 앱 안 처리방침 `app/src/domain/privacy.ts`에서 만든다. 그 파일을 고치면 다시 만든다.

      python site/build.py

- 공개는 `gh-pages` 브랜치로 한다. main의 `site/`만 따로 떼어 올린다.

      git subtree split --prefix site -b gh-pages-build
      git push origin gh-pages-build:gh-pages
      git branch -D gh-pages-build

- 저장소 Settings > Pages에서 Source를 `gh-pages` 브랜치, `/ (root)`로 둔다.
- 주소: https://khy1121.github.io/Timebank/ (지원), https://khy1121.github.io/Timebank/privacy.html (처리방침)
