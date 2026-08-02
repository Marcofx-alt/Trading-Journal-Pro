import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are a conservative chart-review assistant inside a trading journal. Analyze only what is visibly supported by the screenshot. Never promise a win, never provide a trade signal, and never invent exact prices that are unreadable. Distinguish observation from uncertainty. Return only valid JSON with this exact shape:
{
  "market_bias":"Bullish|Bearish|Ranging|Unclear",
  "confidence":0,
  "trend_notes":"",
  "market_structure":"",
  "supply_zones":[""],
  "demand_zones":[""],
  "liquidity_notes":[""],
  "fvg_notes":[""],
  "bos_notes":"",
  "choch_notes":"",
  "support_resistance":[""],
  "candle_observations":[""],
  "confluences":[""],
  "warnings":[""],
  "review_summary":""
}
Confidence means confidence in the visual interpretation, not probability of trade success. Use empty arrays when evidence is absent.`

function extractJson(text:string){
  const cleaned=text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()
  const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}')
  if(start<0||end<start) throw new Error('The model did not return structured JSON.')
  return JSON.parse(cleaned.slice(start,end+1))
}

export async function POST(request:NextRequest){
  try{
    if(!process.env.OPENAI_API_KEY){
      return NextResponse.json({error:'AI Vision is not configured. Add OPENAI_API_KEY to .env.local and restart the app.'},{status:503})
    }
    const body=await request.json()
    const image=String(body.image||'')
    if(!image.startsWith('data:image/')) return NextResponse.json({error:'Please upload a valid image.'},{status:400})
    if(image.length>9_000_000) return NextResponse.json({error:'Image is too large. Use an image under about 6 MB.'},{status:413})

    const context=[body.pair&&`Pair: ${body.pair}`,body.timeframe&&`Timeframe: ${body.timeframe}`,body.direction&&`Trader idea: ${body.direction}`,body.notes&&`Trader notes: ${body.notes}`].filter(Boolean).join('\n')
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_VISION_MODEL||'gpt-5',
        input:[{role:'user',content:[
          {type:'input_text',text:`${SYSTEM_PROMPT}\n\nChart context:\n${context||'No additional context.'}\n\nReview the chart screenshot now.`},
          {type:'input_image',image_url:image,detail:'high'}
        ]}],
        max_output_tokens:1800
      })
    })
    const raw=await response.json()
    if(!response.ok) throw new Error(raw?.error?.message||'OpenAI request failed.')
    const outputText=raw.output_text||raw.output?.flatMap((item:any)=>item.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('\n')||''
    const analysis=extractJson(outputText)
    analysis.confidence=Math.max(0,Math.min(100,Number(analysis.confidence)||0))
    return NextResponse.json({analysis})
  }catch(error:any){
    return NextResponse.json({error:error?.message||'Chart analysis failed.'},{status:500})
  }
}
