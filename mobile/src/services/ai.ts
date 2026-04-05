import OpenAI from 'openai'
import * as SecureStore from 'expo-secure-store'

const KEY_STORE = 'cortex_openai_key'

// ─── Key management ───────────────────────────────────────────────────────────
export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_STORE, key)
  _client = null // reset cached client
}

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_STORE)
}

export async function hasApiKey(): Promise<boolean> {
  const k = await getApiKey()
  return Boolean(k)
}

// ─── Client singleton ─────────────────────────────────────────────────────────
let _client: OpenAI | null = null

async function client(): Promise<OpenAI | null> {
  const key = await getApiKey()
  if (!key) return null
  if (!_client) {
    _client = new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true, // required for React Native environment
    })
  }
  return _client
}

// ─── Summarize ────────────────────────────────────────────────────────────────
export async function summarize(text: string): Promise<string | null> {
  const ai = await client()
  if (!ai) return null
  try {
    const res = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Summarize the following in 2-3 concise sentences. Focus on key ideas:\n\n${text.slice(0, 4000)}`,
      }],
    })
    return res.choices[0].message.content
  } catch (e: any) {
    console.error('[ai] summarize:', e.message)
    return null
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export async function chat(
  query: string,
  context: string,
  onToken?: (delta: string) => void
): Promise<string> {
  const ai = await client()
  if (!ai) return '⚠ No API key — add yours in Settings.'

  try {
    if (onToken) {
      // Streaming mode
      const stream = await ai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `You are a research assistant with access to the user's knowledge base.\n\nKnowledge base:\n${context.slice(0, 8000)}`,
          },
          {
            role: 'user',
            content: `${query}\n\nAnswer based on the knowledge base. Cite specific items by title when relevant.`,
          },
        ],
      })
      let full = ''
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        full += delta
        onToken(delta)
      }
      return full
    } else {
      const res = await ai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a research assistant with access to the user's knowledge base.\n\nKnowledge base:\n${context.slice(0, 8000)}`,
          },
          { role: 'user', content: query },
        ],
      })
      return res.choices[0].message.content ?? ''
    }
  } catch (e: any) {
    return `Error: ${e.message}`
  }
}

// ─── Essay help ───────────────────────────────────────────────────────────────
export async function essayHelp(
  prompt: string,
  notes: string,
  draft: string
): Promise<string> {
  const ai = await client()
  if (!ai) return '⚠ No API key — add yours in Settings.'
  try {
    const res = await ai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are a writing assistant helping the user develop an essay.\n\nResearch notes:\n${notes.slice(0, 4000)}\n\nCurrent draft:\n${draft.slice(0, 3000)}`,
        },
        { role: 'user', content: `${prompt}\n\nBe specific and actionable.` },
      ],
    })
    return res.choices[0].message.content ?? ''
  } catch (e: any) {
    return `Error: ${e.message}`
  }
}
