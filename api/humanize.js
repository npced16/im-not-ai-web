const ALLOWED_PROVIDERS = new Set(["openai", "gemini", "claude"]);

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "POST만 지원합니다." });
  }

  try {
    const { provider, apiKey, model, prompt, input } = request.body || {};
    validatePayload({ provider, apiKey, model, prompt, input });

    const output = await humanizeWithProvider({
      provider,
      apiKey,
      model,
      prompt,
      input,
    });

    return response.status(200).json({ output });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return response.status(status).json({
      error: error.message || "윤문화 요청에 실패했습니다.",
    });
  }
};

function validatePayload({ provider, apiKey, model, prompt, input }) {
  if (!ALLOWED_PROVIDERS.has(provider)) {
    throw createError(400, "지원하지 않는 AI 제공자입니다.");
  }

  if (!apiKey || !model || !prompt || !input) {
    throw createError(400, "API 키, 모델, 프롬프트, 입력 텍스트가 필요합니다.");
  }

  if (!/[가-힣]/.test(input)) {
    throw createError(400, "한국어 텍스트만 처리할 수 있습니다.");
  }
}

async function humanizeWithProvider({ provider, apiKey, model, prompt, input }) {
  if (provider === "openai") {
    return humanizeWithOpenAI({ apiKey, model, prompt, input });
  }

  if (provider === "gemini") {
    return humanizeWithGemini({ apiKey, model, prompt, input });
  }

  return humanizeWithClaude({ apiKey, model, prompt, input });
}

async function humanizeWithOpenAI({ apiKey, model, prompt, input }) {
  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  const data = await parseUpstreamJson(upstream, "OpenAI API 요청에 실패했습니다.");
  return extractOpenAIText(data);
}

async function humanizeWithGemini({ apiKey, model, prompt, input }) {
  const normalizedModel = model.replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    normalizedModel,
  )}:generateContent`;
  const upstream = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
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

  const data = await parseUpstreamJson(upstream, "Gemini API 요청에 실패했습니다.");
  return extractGeminiText(data);
}

async function humanizeWithClaude({ apiKey, model, prompt, input }) {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
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

  const data = await parseUpstreamJson(upstream, "Claude API 요청에 실패했습니다.");
  return extractClaudeText(data);
}

async function parseUpstreamJson(upstream, fallbackMessage) {
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw createError(upstream.status, data.error?.message || fallbackMessage);
  }
  return data;
}

function extractOpenAIText(data) {
  const choices = data.choices || [];
  if (choices.length > 0 && choices[0].message?.content) {
    return choices[0].message.content;
  }
  return "";
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

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
