const PROVIDERS = {
  openai: {
    name: "GPT",
    keyLabel: "OpenAI API Key",
    placeholder: "sk-...",
    storageKey: "humanize-api-key-openai",
    defaultModel: "gpt-5.2",
    models: ["gpt-5.2", "gpt-5.1", "gpt-4.1"],
  },
  gemini: {
    name: "Gemini",
    keyLabel: "Gemini API Key",
    placeholder: "AIza...",
    storageKey: "humanize-api-key-gemini",
    defaultModel: "gemini-2.5-pro",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  },
  claude: {
    name: "Claude",
    keyLabel: "Anthropic API Key",
    placeholder: "sk-ant-...",
    storageKey: "humanize-api-key-claude",
    defaultModel: "claude-opus-4-5",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  },
};

const form = document.querySelector("#humanize-form");
const providerSelect = document.querySelector("#provider");
const apiKeyInput = document.querySelector("#api-key");
const apiKeyLabel = document.querySelector("#api-key-label");
const modelInput = document.querySelector("#model");
const modelOptions = document.querySelector("#model-options");
const sourceText = document.querySelector("#source-text");
const resultText = document.querySelector("#result-text");
const sourceCount = document.querySelector("#source-count");
const statusText = document.querySelector("#status");
const submitButton = document.querySelector("#submit-button");
const copyButton = document.querySelector("#copy-result");
const clearButton = document.querySelector("#clear-result");
const rememberKey = document.querySelector("#remember-key");

applyProviderSettings(providerSelect.value);

providerSelect.addEventListener("change", () => {
  applyProviderSettings(providerSelect.value);
  setStatus(`${PROVIDERS[providerSelect.value].name}로 연결 대상을 바꿨습니다.`);
});

sourceText.addEventListener("input", () => {
  sourceCount.textContent = `${sourceText.value.length.toLocaleString("ko-KR")}자`;
});

rememberKey.addEventListener("change", () => {
  const provider = getProvider();
  if (!rememberKey.checked) {
    localStorage.removeItem(provider.storageKey);
  } else if (apiKeyInput.value.trim()) {
    localStorage.setItem(provider.storageKey, apiKeyInput.value.trim());
  }
});

apiKeyInput.addEventListener("input", () => {
  if (rememberKey.checked) {
    localStorage.setItem(getProvider().storageKey, apiKeyInput.value.trim());
  }
});

clearButton.addEventListener("click", () => {
  resultText.value = "";
  setStatus("결과를 비웠습니다.");
});

copyButton.addEventListener("click", async () => {
  if (!resultText.value.trim()) {
    setStatus("복사할 윤문본이 없습니다.", true);
    return;
  }

  await navigator.clipboard.writeText(resultText.value);
  setStatus("윤문본을 클립보드에 복사했습니다.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const provider = getProvider();
  const apiKey = apiKeyInput.value.trim();
  const input = sourceText.value.trim();
  const model = modelInput.value.trim() || provider.defaultModel;
  const genre = document.querySelector("#genre").value;
  const tone = new FormData(form).get("tone") || "기본";

  if (!apiKey) {
    setStatus(`${provider.keyLabel}를 입력하세요.`, true);
    apiKeyInput.focus();
    return;
  }

  if (!input) {
    setStatus("윤문화할 한글 텍스트를 입력하세요.", true);
    sourceText.focus();
    return;
  }

  if (!/[가-힣]/.test(input)) {
    setStatus("한국어 텍스트만 처리할 수 있습니다.", true);
    sourceText.focus();
    return;
  }

  setBusy(true);
  setStatus(`${provider.name} ${model}로 윤문화 중입니다.`);
  resultText.value = "";

  try {
    const prompt = buildHumanizePrompt({ genre, tone });
    const output = await humanizeWithProvider({
      providerKey: providerSelect.value,
      apiKey,
      model,
      prompt,
      input,
    });

    resultText.value = output.trim();
    setStatus("완료했습니다. 윤문본을 바로 복사할 수 있습니다.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

async function humanizeWithProvider({ providerKey, apiKey, model, prompt, input }) {
  if (providerKey === "openai") {
    return humanizeWithOpenAI({ apiKey, model, prompt, input });
  }

  if (providerKey === "gemini") {
    return humanizeWithGemini({ apiKey, model, prompt, input });
  }

  if (providerKey === "claude") {
    return humanizeWithClaude({ apiKey, model, prompt, input });
  }

  throw new Error("지원하지 않는 AI 제공자입니다.");
}

async function humanizeWithOpenAI({ apiKey, model, prompt, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: input,
            },
          ],
        },
      ],
    }),
  });

  const data = await parseJsonResponse(response, "OpenAI API 요청에 실패했습니다.");
  return extractOpenAIText(data);
}

async function humanizeWithGemini({ apiKey, model, prompt, input }) {
  const normalizedModel = model.replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    normalizedModel,
  )}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: prompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
      },
    }),
  });

  const data = await parseJsonResponse(response, "Gemini API 요청에 실패했습니다.");
  return extractGeminiText(data);
}

async function humanizeWithClaude({ apiKey, model, prompt, input }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: prompt,
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  const data = await parseJsonResponse(response, "Claude API 요청에 실패했습니다.");
  return extractClaudeText(data);
}

async function parseJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || fallbackMessage);
  }
  return data;
}

function buildHumanizePrompt({ genre, tone }) {
  return `
너는 Humanize KR 웹앱의 한국어 윤문 엔진이다.
사용자가 붙여넣은 한글 텍스트를 AI 티가 덜 나도록 자연스럽게 윤문하라.

출력 규칙:
- 윤문본만 출력한다.
- 마크다운 코드블록, 설명, 탐지 리포트, 사과문은 출력하지 않는다.
- 원문의 문단 구분은 최대한 유지한다.
- 장르: ${genre}
- 강도: ${tone}

철칙:
1. 의미 불변: 사실, 주장, 수치, 날짜, 고유명사, 직접 인용은 바꾸지 않는다.
2. Do-NOT: 제품명, 모델명, 기관명, 법률 조문, 수학/화학/통계 표기, LLM/GPU/API 같은 영어 약어는 보존한다.
3. 장르와 문체를 유지한다. 격식체 글은 격식체로 둔다.
4. 과윤문하지 않는다. 새 비유, 새 주장, 새 정보를 만들지 않는다.
5. 윤문본만 출력한다.

우선 수정할 패턴:
- A-1 "~에 대해(서)"는 목적격 조사로 자연스럽게 직결한다.
- A-2 "~를 통해/통하여" 남발은 "~로", "~해서", "~함으로써"로 분산한다.
- A-7 "가지고 있다", 직역식 동사구는 한국어 동사/형용사로 환원한다.
- A-8 "~되어진다"는 단일 피동이나 능동으로 고친다.
- C-11 연결어미 뒤 쉼표("-고,", "-며,", "-지만,")는 필요 없으면 제거한다.
- D-1 "결론적으로/따라서/이를 통해/그러므로/요약하면/정리하면" 남발은 줄인다.
- H-1 "또한/따라서/즉/나아가/아울러" 같은 문두 접속사 남발은 덜어낸다.
- I-1 "~인 것이다/~한 것이다" 결말은 평서형으로 바꾼다.
- J-2 따옴표 강조와 J-3 불릿 남발은 장르에 맞게 줄인다.
`.trim();
}

function extractOpenAIText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n");
}

function extractGeminiText(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("");
}

function extractClaudeText(data) {
  return (data.content || [])
    .map((item) => (item.type === "text" ? item.text : ""))
    .join("");
}

function applyProviderSettings(providerKey) {
  const provider = PROVIDERS[providerKey];
  apiKeyLabel.textContent = provider.keyLabel;
  apiKeyInput.placeholder = provider.placeholder;
  modelInput.value = provider.defaultModel;
  modelOptions.replaceChildren(
    ...provider.models.map((model) => {
      const option = document.createElement("option");
      option.value = model;
      return option;
    }),
  );

  const savedApiKey = localStorage.getItem(provider.storageKey);
  apiKeyInput.value = savedApiKey || "";
  rememberKey.checked = Boolean(savedApiKey);
}

function getProvider() {
  return PROVIDERS[providerSelect.value];
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "윤문화 중" : "윤문화";
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}
