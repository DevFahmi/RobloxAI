/**
 * RBXAI — Groq API Proxy with Multi-Key Rotation
 * By.DevFahmi
 *
 * Cara setup di Vercel Environment Variables:
 *   GROQ_API_KEY_1 = gsk_xxxxxxxxxxxxxx
 *   GROQ_API_KEY_2 = gsk_xxxxxxxxxxxxxx
 *   GROQ_API_KEY_3 = gsk_xxxxxxxxxxxxxx
 *   ... dst hingga GROQ_API_KEY_10
 *
 * Sistem akan:
 *   1. Coba key secara berurutan (1, 2, 3, ...)
 *   2. Jika key kena 429 (rate limit) atau 401 (invalid), otomatis ke key berikutnya
 *   3. Jika semua key habis, kirim pesan error yang jelas
 */

// ── Kumpulkan semua key dari env vars ──────────────────────────────
function getApiKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k && k.trim().startsWith('gsk_')) {
      keys.push(k.trim());
    }
  }
  // Fallback: support key tunggal tanpa nomor
  if (keys.length === 0 && process.env.GROQ_API_KEY) {
    keys.push(process.env.GROQ_API_KEY.trim());
  }
  return keys;
}

// ── Coba satu key ke Groq API ───────────────────────────────────────
async function tryGroq(apiKey, body) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { status: res.status, data };
}

// ── Handler utama ───────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // Ambil semua API keys
  const keys = getApiKeys();
  if (keys.length === 0) {
    return res.status(500).json({
      error: 'Tidak ada GROQ API Key yang dikonfigurasi di server. Hubungi admin.',
    });
  }

  const { messages, system, max_tokens } = req.body;

  // Buat payload Groq (format OpenAI)
  const groqBody = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: system || '' },
      ...messages,
    ],
    max_tokens: max_tokens || 4096,
    temperature: 0.3,
  };

  // ── Rotasi key — coba satu per satu ────────────────────────────
  let lastError  = null;
  let keysTried  = 0;

  for (let i = 0; i < keys.length; i++) {
    keysTried++;
    try {
      const { status, data } = await tryGroq(keys[i], groqBody);

      // ✅ Sukses
      if (status === 200) {
        const text = data.choices?.[0]?.message?.content || 'Tidak ada respons.';
        // Sertakan info debug (berapa key dicoba) — opsional
        res.setHeader('X-Keys-Tried', keysTried);
        res.setHeader('X-Keys-Total', keys.length);
        return res.status(200).json({ content: [{ text }] });
      }

      // 429 = Rate limit habis → coba key berikutnya
      if (status === 429) {
        lastError = `Key ${i + 1}: Rate limit (429)`;
        continue;
      }

      // 401 = Key tidak valid → coba key berikutnya
      if (status === 401) {
        lastError = `Key ${i + 1}: Unauthorized (401)`;
        continue;
      }

      // Error lain yang tidak bisa di-retry (400, 500, dll)
      lastError = data?.error?.message || `HTTP ${status}`;
      return res.status(status).json({
        error: lastError,
      });

    } catch (networkErr) {
      // Network error → coba key berikutnya
      lastError = `Key ${i + 1}: Network error — ${networkErr.message}`;
      continue;
    }
  }

  // ── Semua key sudah dicoba dan gagal ───────────────────────────
  const totalKeys = keys.length;
  return res.status(429).json({
    error:
      totalKeys === 1
        ? 'API Key Groq telah mencapai batas harian. Coba lagi besok.'
        : `Semua ${totalKeys} API Key telah mencapai batas harian. Coba lagi besok atau tambahkan key baru di server.`,
  });
}
