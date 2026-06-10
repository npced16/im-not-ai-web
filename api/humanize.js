const ALLOWED_PROVIDERS = new Set(["openai", "gemini", "claude"]);

module.exports = async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      error: "POST 메서드만 지원합니다.",
      details: "이 API는 POST 요청만 받습니다. GET, PUT, DELETE 등 다른 메서드로는 요청할 수 없습니다.",
      code: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const { provider, apiKey, model, prompt, input } = request.body || {};
    validatePayload({ provider, apiKey, model, prompt, input });

    const chunks = splitIntoChunks(input);
    const outputs = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const output = await humanizeWithProvider({
        provider,
        apiKey,
        model,
        prompt,
        input: chunk,
      });
      outputs.push(output);
    }

    return response.status(200).json({
      output: outputs.join("\n"),
      chunks: chunks.length,
      chunkSizes: chunks.map(c => c.length)
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return response.status(status).json({
      error: error.message || "윤문화 요청에 실패했습니다.",
      details: error.details || "예상치 못한 오류가 발생했습니다.",
      code: error.code || "UNKNOWN_ERROR"
    });
  }
};

function validatePayload({ provider, apiKey, model, prompt, input }) {
  if (!ALLOWED_PROVIDERS.has(provider)) {
    throw createError(400,
      `지원하지 않는 AI 제공자: ${provider}`,
      `지원하는 제공자는 ${Array.from(ALLOWED_PROVIDERS).join(", ")}입니다.`,
      "INVALID_PROVIDER"
    );
  }

  if (!apiKey) {
    throw createError(400,
      "API 키가 없습니다.",
      `${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Google Gemini" : "Anthropic"} API 키를 입력해주세요.`,
      "MISSING_API_KEY"
    );
  }

  if (!model) {
    throw createError(400,
      "모델이 지정되지 않았습니다.",
      "사용할 AI 모델을 선택해주세요.",
      "MISSING_MODEL"
    );
  }

  if (!prompt) {
    throw createError(400,
      "프롬프트가 없습니다.",
      "윤문 지시사항(프롬프트)이 필요합니다.",
      "MISSING_PROMPT"
    );
  }

  if (!input) {
    throw createError(400,
      "입력 텍스트가 없습니다.",
      "윤문화할 한글 텍스트를 입력해주세요.",
      "MISSING_INPUT"
    );
  }

  if (!/[가-힣]/.test(input)) {
    throw createError(400,
      "한국어 텍스트만 처리할 수 있습니다.",
      "한글이 포함되지 않은 텍스트입니다. 한국어 텍스트를 입력해주세요.",
      "NOT_KOREAN_TEXT"
    );
  }
}

function splitIntoChunks(text, maxChunkSize = 4000) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const chunks = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if ((currentChunk + "\n\n" + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
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
  try {
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

    const data = await parseUpstreamJson(upstream, "OpenAI", "OpenAI API 요청에 실패했습니다.");
    return extractOpenAIText(data);
  } catch (error) {
    throw error;
  }
}

async function humanizeWithGemini({ apiKey, model, prompt, input }) {
  try {
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
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt}\n\n${input}` }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
        },
      }),
    });

    const data = await parseUpstreamJson(upstream, "Google Gemini", "Gemini API 요청에 실패했습니다.");
    return extractGeminiText(data);
  } catch (error) {
    throw error;
  }
}

async function humanizeWithClaude({ apiKey, model, prompt, input }) {
  try {
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

    const data = await parseUpstreamJson(upstream, "Anthropic Claude", "Claude API 요청에 실패했습니다.");
    return extractClaudeText(data);
  } catch (error) {
    throw error;
  }
}

async function parseUpstreamJson(upstream, provider, fallbackMessage) {
  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    let message = data.error?.message || data.error || fallbackMessage;
    let details = "";
    let code = "API_ERROR";

    if (upstream.status === 401) {
      message = "API 인증 실패";
      details = "API 키가 유효하지 않습니다. 키를 확인하고 다시 시도해주세요.";
      code = "INVALID_API_KEY";
    } else if (upstream.status === 403) {
      message = "접근 권한 없음";
      details = "이 API 키로는 요청을 실행할 권한이 없습니다. 계정 설정을 확인해주세요.";
      code = "FORBIDDEN";
    } else if (upstream.status === 429) {
      message = "너무 많은 요청 (Rate Limit)";
      details = `${provider} API의 요청 제한에 도달했습니다. 잠시 후 다시 시도해주세요.`;
      code = "RATE_LIMITED";
    } else if (upstream.status === 400) {
      message = "잘못된 요청";
      details = data.error?.message || "요청 형식이 올바르지 않습니다.";
      code = "BAD_REQUEST";
    } else if (upstream.status === 503) {
      message = "서버 일시 중단";
      details = `${provider} 서버가 일시적으로 이용 불가능합니다. 잠시 후 다시 시도해주세요.`;
      code = "SERVICE_UNAVAILABLE";
    }

    throw createError(upstream.status, message, details, code);
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

function createError(status, message, details = "", code = "ERROR") {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  error.code = code;
  return error;
}
