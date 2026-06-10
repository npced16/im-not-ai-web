# Humanize KR Web MVP

브라우저에서 바로 쓰는 정적 웹앱입니다. 한글 텍스트를 붙여 넣고 OpenAI API 키를 입력하면 Responses API로 윤문본을 받아와 복사할 수 있습니다.

## 사용법

1. `web/index.html`을 브라우저로 엽니다.
2. OpenAI API 키를 입력합니다.
3. 원문을 붙여 넣고 `윤문화`를 누릅니다.
4. 결과가 나오면 `복사`를 누릅니다.

## 배포

정적 파일만 있으므로 GitHub Pages, Netlify, Vercel Static Hosting에 `web/` 디렉터리를 올리면 됩니다.

이 저장소 루트에는 `vercel.json`이 포함되어 있어 Vercel에서 GitHub 저장소를 연결하면 `/` 경로가 `web/index.html`로 열립니다. Build Command는 비워두고 Framework Preset은 `Other`로 두면 됩니다.

## 보안 메모

API 키는 브라우저에서 OpenAI API 호출에만 사용됩니다. `이 브라우저에 API 키 저장`을 켜면 `localStorage`에 저장되므로, 공용 PC에서는 사용하지 않는 편이 좋습니다.
