/**
 * AI completions via Groq (free tier).
 * Get your key at https://console.groq.com/ and add to .env as VITE_GROQ_API_KEY.
 */

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export function isConfigured() {
  return !!GROQ_KEY;
}

/**
 * @param {string} prompt - Full prompt
 * @param {number} maxTokens - Max tokens to generate
 * @returns {Promise<string>} - The generated text
 */
export async function getCompletion(prompt, maxTokens = 1000) {
  if (!GROQ_KEY) {
    throw new Error('Add VITE_GROQ_API_KEY to your .env (free at console.groq.com)');
  }
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${response.status}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (text == null) throw new Error('Groq returned no text');
  return text;
}
