import { NextRequest, NextResponse } from 'next/server'

type HistoryItem = { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `You are Trading Journal Pro AI, a private trading-journal assistant.
Your job is to help the user study their own trading data, backtests, process, discipline, risk, psychology, session selection, and strategy statistics.

Rules:
- Be concise, practical, and evidence-led.
- When the supplied journal context does not support a claim, say so clearly.
- Distinguish observed journal data from general trading education.
- Do not promise profits, guaranteed outcomes, or certainty about future market direction.
- Do not give personalized instructions to buy or sell a live security. You may discuss the user's documented plan, risk limits, backtest evidence, and decision process.
- Prefer statistics such as expectancy, R multiples, win rate, sample size, drawdown, and plan adherence over hype.
- Strategy A is the user's normal strategy. Strategy B is FVG + confirmation candle.
- If the user asks which strategy is stronger, consider multiple metrics and sample size; do not choose based on win rate alone.
- Encourage consistent execution and adequate sample sizes when appropriate.
- This assistant is for education, journaling, and performance review, not financial advice.`

function textFromResponse(data: any) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim()
  const chunks: string[] = []
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if ((part?.type === 'output_text' || part?.type === 'text') && typeof part?.text === 'string') chunks.push(part.text)
    }
  }
  return chunks.join('\n').trim()
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!supabaseUrl || !supabaseAnon) return NextResponse.json({ error: 'Supabase environment variables are missing.' }, { status: 500 })
    if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 500 })

    const auth = req.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnon, Authorization: auth },
      cache: 'no-store',
    })
    if (!userCheck.ok) return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })

    const body = await req.json()
    const message = String(body?.message || '').trim()
    const context = String(body?.context || '').slice(0, 24000)
    const history = (Array.isArray(body?.history) ? body.history : []) as HistoryItem[]
    if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 })

    const recentHistory = history.slice(-12).map(h => `${h.role === 'assistant' ? 'Assistant' : 'User'}: ${String(h.content || '').slice(0, 3000)}`).join('\n\n')
    const input = `TRADING JOURNAL CONTEXT\n${context || 'No journal context was available.'}\n\nRECENT CHAT\n${recentHistory || 'No previous messages.'}\n\nUSER MESSAGE\n${message}`

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-5.6-luna',
        instructions: SYSTEM_PROMPT,
        input,
        max_output_tokens: 1400,
      }),
      cache: 'no-store',
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('OpenAI Responses API error', data)
      return NextResponse.json({ error: data?.error?.message || 'AI request failed.' }, { status: response.status })
    }

    const reply = textFromResponse(data)
    if (!reply) return NextResponse.json({ error: 'The AI returned an empty response.' }, { status: 502 })
    return NextResponse.json({ reply })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not complete the AI request.' }, { status: 500 })
  }
}
