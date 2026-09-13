# Trading Journal Pro v23.0 — AI Trading Assistant

## Setup
1. Run `supabase/upgrade_v14_ai_chat.sql` in the Supabase SQL Editor.
2. Keep `OPENAI_API_KEY` server-side only in `.env.local` and Vercel environment variables.
3. Optional model setting: `OPENAI_CHAT_MODEL=gpt-5.6-luna`.
4. Restart `npm run dev` after changing environment variables.

## What it does
- Persistent private chat history in Supabase.
- Server-side OpenAI Responses API call; API key never enters browser JavaScript.
- Authenticated API route to reduce unauthorized key usage.
- Uses a compact summary of the signed-in user's trades and backtests as context.
- Can compare Strategy A and Strategy B, review recent trades, journal discipline, and discuss session/risk patterns.
- Voice dictation where the browser supports Web Speech API.

## Safety
The assistant is framed for education, journaling and performance review. It does not promise profits or provide guaranteed live trade signals.
