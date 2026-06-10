# Humanize KR Web MVP

Vercel에서 바로 쓰는 웹앱입니다. 한글 텍스트를 붙여 넣고 GPT, Gemini, Claude 중 하나를 선택한 뒤 API 키를 입력하면 서버리스 API 프록시가 윤문본을 받아와 복사할 수 있게 합니다.

## 사용법

1. `web/index.html`을 브라우저로 엽니다.
2. GPT, Gemini, Claude 중 사용할 AI를 고릅니다.
3. 해당 서비스의 API 키를 입력합니다.
4. 모델을 선택하거나 직접 입력합니다.
5. 원문을 붙여 넣고 `윤문화`를 누릅니다.
6. 결과가 나오면 `복사`를 누릅니다.

## 배포

Vercel에 연결해 배포하면 루트의 `index.html` 정적 화면과 `api/humanize.js` 서버리스 함수가 함께 올라갑니다.

Vercel에서 GitHub 저장소를 연결하면 `/` 경로가 루트 `index.html`로 열립니다. Build Command는 비워두고 Framework Preset은 `Other`로 두면 됩니다.

## 보안 메모

API 키는 브라우저에서 Vercel 서버리스 함수로 전달된 뒤 선택한 AI 제공자 API 호출에만 사용됩니다. 서버에 저장하지 않습니다. `이 브라우저에 API 키 저장`을 켜면 제공자별로 `localStorage`에 저장되므로, 공용 PC에서는 사용하지 않는 편이 좋습니다.
