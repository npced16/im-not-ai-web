# Humanize KR — Web 공식 버전

원본 프로젝트 [`im-not-ai`](https://github.com/epoko77-ai/im-not-ai)의 분류 체계와 윤문 규칙을 웹 애플리케이션으로 구현한 공식 웹 버전입니다. 

**[👉 im-not-ai-web.vercel.app 바로 가기](https://im-not-ai-web.vercel.app/)**

CLI 설치 없이 웹 브라우저에서 바로 한글 AI 글을 윤문할 수 있습니다.

## 주요 기능

- **멀티 AI 지원**: OpenAI GPT, Google Gemini, Anthropic Claude 중 선택
- **자동 텍스트 분할**: 10,000자 이상 입력은 자동으로 4,000자 청크로 분할 처리
- **상세한 에러 메시지**: API 키 오류, Rate Limit, 할당량 초과 등의 원인 설명 + 해결 방법
- **편한 결과 관리**: 윤문본 바로 복사, API 키 자동 저장 옵션
- **무설치**: 클릭 몇 번으로 바로 시작

## 사용법

### 웹에서 사용 (권장)
1. [im-not-ai-web.vercel.app](https://im-not-ai-web.vercel.app/)에 접속합니다.
2. **AI 제공자 선택**: GPT, Gemini, Claude 중 하나 선택
3. **API 키 입력**: 해당 AI의 API 키 입력 ([API 키 발급 가이드](#api-키-발급))
4. **모델 선택**: 드롭다운에서 선택하거나 직접 입력
5. **텍스트 입력**: 윤문할 한글 텍스트 붙여넣기
6. **윤문화**: "윤문화" 버튼 클릭
7. **복사**: 결과가 나오면 "복사" 버튼으로 클립보드에 저장

### 로컬에서 실행
```bash
git clone https://github.com/npced16/im-not-ai-web.git
cd im-not-ai-web
# 웹 서버 시작 (예: Python)
python -m http.server 8000
# 브라우저에서 http://localhost:8000/web/ 접속
```

## API 키 발급

### OpenAI (GPT)
- 사이트: https://platform.openai.com/
- 로그인 → API keys → Create new secret key
- 형식: `sk-...`

### Google Gemini
- 사이트: https://aistudio.google.com/
- 좌측 "API keys" → "Create API key"
- 형식: `AIza...`

### Anthropic Claude
- 사이트: https://console.anthropic.com/
- API Keys → Create Key
- 형식: `sk-ant-...`

## 배포

Vercel에 연결해 배포하면 루트의 `index.html` 정적 화면과 `api/humanize.js` 서버리스 함수가 함께 올라갑니다.

Vercel에서 GitHub 저장소를 연결하면 `/` 경로가 루트 `index.html`로 열립니다. Build Command는 비워두고 Framework Preset은 `Other`로 두면 됩니다.

## 보안 메모

API 키는 브라우저에서 Vercel 서버리스 함수로 전달된 뒤 선택한 AI 제공자 API 호출에만 사용됩니다. 서버에 저장하지 않습니다. `이 브라우저에 API 키 저장`을 켜면 제공자별로 `localStorage`에 저장되므로, 공용 PC에서는 사용하지 않는 편이 좋습니다.
