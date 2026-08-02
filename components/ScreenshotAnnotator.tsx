'use client'

import { useEffect, useRef, useState } from 'react'
import { Circle, Download, Eraser, Minus, MousePointer2, Redo2, Save, Square, Type, Undo2, X } from 'lucide-react'

type Tool = 'select' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser'

type Props = {
  imageUrl: string
  title: string
  onClose: () => void
  onSave: (blob: Blob) => Promise<void>
}

const TOOL_LABELS: Record<Tool, string> = {
  select: 'Move',
  line: 'Trendline',
  rectangle: 'Zone',
  circle: 'Liquidity',
  text: 'Text',
  eraser: 'Eraser',
}

export default function ScreenshotAnnotator({ imageUrl, title, onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseImageRef = useRef<HTMLImageElement | null>(null)
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef(-1)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const snapshotRef = useRef<ImageData | null>(null)
  const [tool, setTool] = useState<Tool>('line')
  const [stroke, setStroke] = useState('#facc15')
  const [lineWidth, setLineWidth] = useState(4)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  function updateHistoryButtons() {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }

  function pushHistory() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(current)
    historyIndexRef.current = historyRef.current.length - 1
    if (historyRef.current.length > 30) {
      historyRef.current.shift()
      historyIndexRef.current--
    }
    updateHistoryButtons()
  }

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error('Could not load screenshot')
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (!canvas || !ctx) return
          const maxWidth = 1600
          const scale = Math.min(1, maxWidth / img.naturalWidth)
          canvas.width = Math.round(img.naturalWidth * scale)
          canvas.height = Math.round(img.naturalHeight * scale)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          baseImageRef.current = img
          historyRef.current = []
          historyIndexRef.current = -1
          pushHistory()
          setLoading(false)
        }
        img.onerror = () => { throw new Error('Could not open screenshot') }
        img.src = objectUrl
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Could not load screenshot')
        onClose()
      }
    }
    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageUrl])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function configure(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = stroke
    ctx.fillStyle = stroke
  }

  function drawShape(ctx: CanvasRenderingContext2D, start: {x:number;y:number}, end: {x:number;y:number}) {
    configure(ctx)
    const w = end.x - start.x
    const h = end.y - start.y
    if (tool === 'line') {
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke()
    } else if (tool === 'rectangle') {
      ctx.save()
      ctx.globalAlpha = .22
      ctx.fillRect(start.x, start.y, w, h)
      ctx.restore()
      ctx.strokeRect(start.x, start.y, w, h)
    } else if (tool === 'circle') {
      const rx = Math.abs(w / 2), ry = Math.abs(h / 2)
      ctx.beginPath()
      ctx.ellipse(start.x + w / 2, start.y + h / 2, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (loading || tool === 'select') return
    const canvas = canvasRef.current!
    canvas.setPointerCapture(event.pointerId)
    const p = point(event)
    if (tool === 'text') {
      const text = window.prompt('Type your chart note:')
      if (!text) return
      const ctx = canvas.getContext('2d')!
      configure(ctx)
      ctx.font = `700 ${Math.max(22, lineWidth * 7)}px Arial`
      ctx.lineWidth = Math.max(3, lineWidth / 2)
      ctx.strokeStyle = '#000000'
      ctx.strokeText(text, p.x, p.y)
      ctx.fillStyle = stroke
      ctx.fillText(text, p.x, p.y)
      pushHistory()
      return
    }
    startRef.current = p
    snapshotRef.current = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = startRef.current
    const snapshot = snapshotRef.current
    if (!start || !snapshot) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const p = point(event)
    if (tool === 'eraser') {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = lineWidth * 5
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(p.x, p.y); ctx.stroke()
      ctx.restore()
      startRef.current = p
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      return
    }
    ctx.putImageData(snapshot, 0, 0)
    drawShape(ctx, start, p)
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!startRef.current) return
    const canvas = canvasRef.current!
    try { canvas.releasePointerCapture(event.pointerId) } catch {}
    startRef.current = null
    snapshotRef.current = null
    pushHistory()
  }

  function undo() {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    canvasRef.current?.getContext('2d')?.putImageData(historyRef.current[historyIndexRef.current], 0, 0)
    updateHistoryButtons()
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    canvasRef.current?.getContext('2d')?.putImageData(historyRef.current[historyIndexRef.current], 0, 0)
    updateHistoryButtons()
  }

  function reset() {
    if (!window.confirm('Remove every annotation and return to the original screenshot?')) return
    const canvas = canvasRef.current
    const img = baseImageRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !img || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    pushHistory()
  }

  async function save() {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not create image')), 'image/png', .95))
      await onSave(blob)
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save annotation')
    } finally { setSaving(false) }
  }

  function downloadCopy() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-annotated.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const tools: {id:Tool; icon:React.ReactNode}[] = [
    {id:'select',icon:<MousePointer2 size={17}/>}, {id:'line',icon:<Minus size={17}/>},
    {id:'rectangle',icon:<Square size={17}/>}, {id:'circle',icon:<Circle size={17}/>},
    {id:'text',icon:<Type size={17}/>}, {id:'eraser',icon:<Eraser size={17}/>},
  ]

  return <div className="annotator-backdrop" role="dialog" aria-modal="true">
    <div className="annotator-modal">
      <div className="annotator-header">
        <div><div className="eyebrow">Sprint 2 · Chart markup</div><h2>{title}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X/></button>
      </div>
      <div className="annotator-toolbar">
        <div className="tool-group">
          {tools.map(item=><button key={item.id} className={`tool-button ${tool===item.id?'active':''}`} onClick={()=>setTool(item.id)} title={TOOL_LABELS[item.id]}>{item.icon}<span>{TOOL_LABELS[item.id]}</span></button>)}
        </div>
        <div className="tool-group settings-group">
          <label className="annotation-color">Color<input type="color" value={stroke} onChange={e=>setStroke(e.target.value)}/></label>
          <label className="annotation-width">Width<input type="range" min="2" max="12" value={lineWidth} onChange={e=>setLineWidth(Number(e.target.value))}/><b>{lineWidth}</b></label>
          <button className="tool-button" disabled={!canUndo} onClick={undo}><Undo2 size={17}/><span>Undo</span></button>
          <button className="tool-button" disabled={!canRedo} onClick={redo}><Redo2 size={17}/><span>Redo</span></button>
          <button className="tool-button" onClick={reset}><Eraser size={17}/><span>Reset</span></button>
        </div>
      </div>
      <div className="canvas-stage">
        {loading&&<div className="canvas-loading"><div className="auth-spinner"/>Loading screenshot…</div>}
        <canvas ref={canvasRef} className={`annotation-canvas tool-${tool}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}/>
      </div>
      <div className="annotator-footer">
        <span className="muted">Use Zone for supply, demand, and FVG areas. Use Liquidity to circle key highs or lows.</span>
        <div className="annotator-actions">
          <button className="button secondary" onClick={downloadCopy}><Download size={17}/>Download copy</button>
          <button className="button" onClick={save} disabled={saving||loading}><Save size={17}/>{saving?'Saving…':'Save to trade'}</button>
        </div>
      </div>
    </div>
  </div>
}
