const OpenAI = require('openai');
const config = require('../config');

class AiUnavailableError extends Error {
  constructor(message) { super(message); this.status = 503; this.expose = true; }
}

function getClient() {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openrouterKey,
    maxRetries: 0,
  });
}

// Tries each model in OPENROUTER_MODELS. Moves to the next one on quota (429/402), model full,
// timeout, 5xx, or empty answer. Stops only on 401 (bad key).
async function chatWithFallback(messages) {
  if (!config.openrouterKey || config.openrouterModels.length === 0) {
    throw new AiUnavailableError('AI belum dikonfigurasi (OPENROUTER_API_KEY / OPENROUTER_MODELS).');
  }
  const client = getClient();
  for (const model of config.openrouterModels) {
    try {
      const res = await client.chat.completions.create({ model, messages, temperature: 0 }, { timeout: 60000 });
      if (res.error) continue;                              // OpenRouter can return errors inside a 200 body
      const text = res.choices?.[0]?.message?.content;
      if (text && text.trim()) return { model, text };
    } catch (err) {
      if (err.status === 401) throw new AiUnavailableError('API key OpenRouter tidak valid.');
      // any other error: try the next model
    }
  }
  throw new AiUnavailableError('Semua model AI sedang penuh atau kuota habis. Coba lagi nanti, atau pakai input manual / CSV.');
}

module.exports = { chatWithFallback, AiUnavailableError };
