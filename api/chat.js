/**
 * RBXAI — Multi-Provider Smart Proxy with Vision Support
 * Groq + Google Gemini + OpenRouter + Cloudflare AI
 * By.DevFahmi
 *
 * SETUP Vercel → Settings → Environment Variables:
 *
 *  GROQ_API_KEY_1        = gsk_...        (console.groq.com/keys)
 *  ...hingga GROQ_API_KEY_10
 *
 *  GEMINI_API_KEY_1      = AIza...        (aistudio.google.com/apikey)
 *  ...hingga GEMINI_API_KEY_10
 *
 *  OPENROUTER_API_KEY_1  = sk-or-...      (openrouter.ai/keys)
 *  ...hingga OPENROUTER_API_KEY_5
 *
 *  CF_ACCOUNT_ID         = abc123...      (dash.cloudflare.com → AI)
 *  CF_API_TOKEN          = xxx...
 */

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' }, // Allow images in request
    responseLimit: false,
  },
};

// ── Model Pools ───────────────────────────────────────────────────

// Groq vision models (for image requests)
const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
];
// Groq text models
const GROQ_TEXT_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
];

// Gemini (all support vision)
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-lite',
];

// OpenRouter vision models
const OR_VISION_MODELS = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'google/gemini-flash-1.5-8b:free',
  'qwen/qwen2-vl-7b-instruct:free',
];
// OpenRouter text models
const OR_TEXT_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
];

const CF_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/google/gemma-7b-it',
];

// ── Helpers ───────────────────────────────────────────────────────

function collectKeys(prefix, max = 10) {
  const keys = [];
  for (let i = 1; i <= max; i++) {
    const k = process.env[`${prefix}_${i}`];
    if (k && k.trim().length > 8) keys.push(k.trim());
  }
  if (keys.length === 0) {
    const plain = process.env[prefix];
    if (plain && plain.trim().length > 8) keys.push(plain.trim());
  }
  return keys;
}

// Check if any message contains an image
function hasImageContent(messages) {
  return messages.some(m => {
    if (!Array.isArray(m.content)) return false;
    return m.content.some(p => p.type === 'image_url');
  });
}

// Strip images from messages (for providers that don't support vision)
function stripImages(messages) {
  return messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    const textParts = m.content.filter(p => p.type === 'text');
    const imgCount  = m.content.filter(p => p.type === 'image_url').length;
    let text = textParts.map(p => p.text).join('\n');
    if (imgCount > 0) text += `\n[User attached ${imgCount} image(s) — describe based on context]`;
    return { ...m, content: text.trim() };
  });
}

// ── Provider Callers ──────────────────────────────────────────────

async function callGroq(key, model, messages, maxTokens) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  const data = await res.json();
  if (res.ok) return { status: 200, text: data.choices?.[0]?.message?.content || '' };
  return { status: res.status, text: null };
}

async function callGemini(key, model, messages, maxTokens) {
  const sysMsg  = messages.find(m => m.role === 'system');
  const history = messages.filter(m => m.role !== 'system');

  // Convert messages to Gemini format (supports both text & images)
  const contents = history.map(m => {
    const role = m.role === 'assistant' ? 'model' : 'user';

    if (typeof m.content === 'string') {
      return { role, parts: [{ text: m.content }] };
    }

    if (Array.isArray(m.content)) {
      const parts = m.content.map(p => {
        if (p.type === 'text') return { text: p.text };
        if (p.type === 'image_url') {
          // Extract base64 from data URL
          const dataUrl = p.image_url?.url || '';
          const match   = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return { inlineData: { mimeType: match[1], data: match[2] } };
          }
        }
        return null;
      }).filter(Boolean);
      return { role, parts };
    }

    return { role, parts: [{ text: String(m.content) }] };
  });

  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
  };
  if (sysMsg) {
    body.systemInstruction = { parts: [{ text: sysMsg.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (res.ok) {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { status: 200, text };
  }

  const errMsg = data?.error?.message || '';
  const is429  = res.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
  return { status: is429 ? 429 : res.status, text: null };
}

async function callOpenRouter(key, model, messages, maxTokens) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://rbxai.vercel.app',
      'X-Title': 'RBXAI',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  const data = await res.json();
  if (res.ok) return { status: 200, text: data.choices?.[0]?.message?.content || '' };
  return { status: res.status, text: null };
}

async function callCloudflare(model, messages, maxTokens) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token     = process.env.CF_API_TOKEN;
  if (!accountId || !token) return { status: 401, text: null };

  // Cloudflare doesn't support vision yet — strip images
  const stripped = stripImages(messages);
  const sysMsg   = stripped.find(m => m.role === 'system')?.content || '';
  const history  = stripped.filter(m => m.role !== 'system');

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: sysMsg }, ...history],
        max_tokens: maxTokens,
      }),
    }
  );
  const data = await res.json();
  if (res.ok && data.success) return { status: 200, text: data.result?.response || '' };
  const is429 = res.status === 429 || JSON.stringify(data).includes('rate limit');
  return { status: is429 ? 429 : res.status, text: null };
}

// ── Main Handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, max_tokens, has_vision } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  // Trim to last 6 messages to stay under limits
  const trimmed  = messages.slice(-6);
  const safeMax  = Math.min(max_tokens || 2048, 2048);
  const withVision = has_vision || hasImageContent(trimmed);

  // Build full message array with system prompt
  const fullMsgs = [{ role: 'system', content: system || '' }, ...trimmed];

  // Collect keys
  const groqKeys       = collectKeys('GROQ_API_KEY');
  const geminiKeys     = collectKeys('GEMINI_API_KEY');
  const openrouterKeys = collectKeys('OPENROUTER_API_KEY', 5);
  const hasCF          = !!(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);

  if (!groqKeys.length && !geminiKeys.length && !openrouterKeys.length && !hasCF) {
    return res.status(500).json({ error: 'Tidak ada API Key yang dikonfigurasi di server.' });
  }

  // ── Build attempt list ────────────────────────────────────────
  // Vision requests: prioritize vision-capable models first
  const attempts = [];

  if (withVision) {
    // Vision priority: Gemini first (best free vision), then Groq vision, then OR vision
    for (const key of geminiKeys) {
      for (const model of GEMINI_MODELS) {
        attempts.push({ provider: 'gemini', key, model, supportsVision: true });
      }
    }
    for (const key of groqKeys) {
      for (const model of GROQ_VISION_MODELS) {
        attempts.push({ provider: 'groq', key, model, supportsVision: true });
      }
    }
    for (const key of openrouterKeys) {
      for (const model of OR_VISION_MODELS) {
        attempts.push({ provider: 'openrouter', key, model, supportsVision: true });
      }
    }
  }

  // Text models as fallback (or primary for non-vision)
  for (const key of groqKeys) {
    for (const model of GROQ_TEXT_MODELS) {
      attempts.push({ provider: 'groq', key, model, supportsVision: false });
    }
  }
  for (const key of geminiKeys) {
    for (const model of GEMINI_MODELS) {
      // avoid duplicates if already added above
      if (!withVision) {
        attempts.push({ provider: 'gemini', key, model, supportsVision: true });
      }
    }
  }
  for (const key of openrouterKeys) {
    for (const model of OR_TEXT_MODELS) {
      attempts.push({ provider: 'openrouter', key, model, supportsVision: false });
    }
  }
  if (hasCF) {
    for (const model of CF_MODELS) {
      attempts.push({ provider: 'cloudflare', model, supportsVision: false });
    }
  }

  // ── Rotate ────────────────────────────────────────────────────
  const invalidKeys = new Set();

  for (const attempt of attempts) {
    if (attempt.key && invalidKeys.has(attempt.key)) continue;

    // For non-vision models, strip images from messages
    const msgsToSend = (withVision && !attempt.supportsVision)
      ? stripImages(fullMsgs)
      : fullMsgs;

    try {
      let result;

      if (attempt.provider === 'groq') {
        result = await callGroq(attempt.key, attempt.model, msgsToSend, safeMax);
      } else if (attempt.provider === 'gemini') {
        result = await callGemini(attempt.key, attempt.model, msgsToSend, safeMax);
      } else if (attempt.provider === 'openrouter') {
        result = await callOpenRouter(attempt.key, attempt.model, msgsToSend, safeMax);
      } else if (attempt.provider === 'cloudflare') {
        result = await callCloudflare(attempt.model, msgsToSend, safeMax);
      } else {
        continue;
      }

      if (result.status === 200 && result.text) {
        res.setHeader('X-Provider', attempt.provider);
        res.setHeader('X-Model', attempt.model);
        res.setHeader('X-Vision', withVision ? 'true' : 'false');
        return res.status(200).json({ content: [{ text: result.text }] });
      }

      if (result.status === 429) continue;

      if (result.status === 401 && attempt.key) {
        invalidKeys.add(attempt.key); continue;
      }

      continue; // other errors → try next

    } catch (e) {
      continue;
    }
  }

  return res.status(429).json({
    error: 'Semua provider sedang rate limit. Tunggu 1 menit lalu coba lagi.',
  });
}
