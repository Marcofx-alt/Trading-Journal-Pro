'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Archive, BookOpen, CalendarDays, ChevronDown, ChevronRight, FileText,
  Folder, FolderPlus, MoreVertical, NotebookPen, Pin, Plus, Search, Star,
  Trash2, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type NoteRow = {
  id: string
  user_id: string
  title: string
  content: string
  folder_id: string | null
  note_type: string
  template_key: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

type FolderRow = {
  id: string
  user_id: string
  name: string
  created_at: string
}

type Template = {
  key: string
  title: string
  icon: string
  preview: string[]
  content: string
}

const templates: Template[] = [
  {
    key: 'daily-review',
    title: 'Daily Review',
    icon: '🗒️',
    preview: ['Date:', 'Session: Asia / London / New York', 'Market condition:', 'Summary Statistics'],
    content: `DAILY REVIEW\n\nDate:\nSession: Asia / London / New York\nMarket condition: Trending / Ranging / Choppy / News-driven\n\nSUMMARY STATISTICS\nWins:\nLosses:\nBreakeven:\nTotal trades:\nWin rate:\nNet P/L:\nNet R:\n\nEXECUTION\nDid I follow my plan?\nBest decision today:\nBiggest mistake today:\nWhat went well:\nWhat needs improvement:\n\nPSYCHOLOGY\nEmotion before trading:\nEmotion after trading:\nWas I patient?\nDid I force any setups?\n\nLESSON\nOne thing I will repeat tomorrow:\nOne thing I will avoid tomorrow:\n`
  },
  {
    key: 'weekly-review',
    title: 'Weekly Review',
    icon: '🗓️',
    preview: ['Week of [date range]', 'Wins / Losses / Breakeven', 'Net R', 'Best setup of the week'],
    content: `WEEKLY REVIEW\n\nWeek of:\n\nSUMMARY STATISTICS\nWins:\nLosses:\nBreakeven:\nTotal trades:\nWin rate:\nNet P/L:\nNet R:\nAverage R:\n\nSTRATEGY REVIEW\nBest performing strategy:\nBest market/pair:\nBest trading session:\nBest setup of the week:\nWorst setup of the week:\n\nDISCIPLINE\nHow well did I follow my rules?\nDid I overtrade?\nDid I trade during high-impact news?\nMost common mistake:\n\nNEXT WEEK\nKeep doing:\nStop doing:\nMain focus:\n`
  },
  {
    key: 'monthly-review',
    title: 'Monthly Review',
    icon: '📄',
    preview: ['Month YYYY', 'Summary Statistics', 'Net P/L / Net R', 'Monthly lessons'],
    content: `MONTHLY REVIEW\n\nMonth:\n\nSUMMARY STATISTICS\nWins:\nLosses:\nBreakeven:\nTotal trades:\nWin rate:\nNet P/L:\nNet R:\nProfit factor:\nMaximum drawdown:\n\nPERFORMANCE\nBest pair:\nWorst pair:\nBest session:\nBest strategy:\nAverage setup score:\n\nPSYCHOLOGY & DISCIPLINE\nBiggest improvement:\nMost expensive mistake:\nDid I respect my risk limits?\nDid I follow my process consistently?\n\nMONTHLY LESSONS\n1.\n2.\n3.\n\nNEXT MONTH\nPrimary process goal:\nRisk goal:\nTrading goal:\n`
  },
  {
    key: 'quarterly-review',
    title: 'Quarterly Review',
    icon: '📁',
    preview: ['Q1 / Q2 / Q3 / Q4 YYYY', 'Summary Statistics', 'Strategy comparison', 'Quarterly focus'],
    content: `QUARTERLY REVIEW\n\nQuarter: Q1 / Q2 / Q3 / Q4\nYear:\n\nSUMMARY STATISTICS\nTotal trades:\nWins:\nLosses:\nBreakeven:\nWin rate:\nNet P/L:\nNet R:\nProfit factor:\nMaximum drawdown:\n\nSTRATEGY COMPARISON\nStrategy A trades:\nStrategy A expectancy:\nStrategy A total R:\nStrategy B trades:\nStrategy B expectancy:\nStrategy B total R:\nWhich strategy was more consistent and why?\n\nQUARTER LESSONS\nStrongest edge:\nWeakest habit:\nBest market condition:\nWorst market condition:\n\nNEXT QUARTER FOCUS\n1.\n2.\n3.\n`
  },
  {
    key: 'annual-review',
    title: 'Annual Review',
    icon: '💼',
    preview: ['YYYY', 'Yearly statistics', 'Biggest lessons', 'Plan for next year'],
    content: `ANNUAL TRADING REVIEW\n\nYear:\n\nYEARLY STATISTICS\nTotal trades:\nWins:\nLosses:\nBreakeven:\nWin rate:\nNet P/L:\nNet R:\nAverage R:\nProfit factor:\nMaximum drawdown:\nLongest losing streak:\n\nEDGE REVIEW\nBest strategy:\nBest pair:\nBest session:\nBest month:\nWorst month:\nMost reliable setup:\n\nPERSONAL GROWTH\nBiggest trading achievement:\nBiggest mistake:\nMost important lesson:\nHow did my discipline improve?\nHow did my psychology improve?\n\nNEXT YEAR\nTrading objectives:\nRisk objectives:\nBacktesting objectives:\nPersonal development objectives:\n`
  }
]

function newTitle(template?: Template) {
  if (template) return `${template.title} — ${new Date().toLocaleDateString()}`
  return `New Note — ${new Date().toLocaleDateString()}`
}

export default function NotebookPage() {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftFolder, setDraftFolder] = useState<string>('')

  async function load() {
    setLoading(true)
    const [{ data: noteData, error: noteError }, { data: folderData, error: folderError }] = await Promise.all([
      supabase.from('notebook_notes').select('*').order('updated_at', { ascending: false }),
      supabase.from('notebook_folders').select('*').order('name')
    ])
    const dbError = noteError || folderError
    if (dbError) {
      setError('Notebook database is not ready yet. Run supabase/upgrade_v12_notebook.sql in Supabase SQL Editor.')
    } else {
      setError('')
      setNotes((noteData || []) as NoteRow[])
      setFolders((folderData || []) as FolderRow[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(n => `${n.title} ${n.content}`.toLowerCase().includes(q))
  }, [notes, query])

  const selected = notes.find(n => n.id === selectedId) || null

  function openNote(note: NoteRow) {
    setSelectedId(note.id)
    setShowTemplates(false)
    setDraftTitle(note.title)
    setDraftContent(note.content)
    setDraftFolder(note.folder_id || '')
  }

  function openTemplates() {
    setSelectedId(null)
    setShowTemplates(true)
    setDraftTitle('')
    setDraftContent('')
    setDraftFolder('')
  }

  async function createNote(template?: Template) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const payload = {
      user_id: auth.user.id,
      title: newTitle(template),
      content: template?.content || '',
      folder_id: null,
      note_type: template ? 'review' : 'note',
      template_key: template?.key || null,
      is_pinned: false
    }
    const { data, error } = await supabase.from('notebook_notes').insert(payload).select('*').single()
    if (error) return alert(error.message)
    const row = data as NoteRow
    setNotes(prev => [row, ...prev])
    openNote(row)
  }

  async function saveNote() {
    if (!selectedId) return
    setSaving(true)
    const { data, error } = await supabase.from('notebook_notes').update({
      title: draftTitle.trim() || 'Untitled Note',
      content: draftContent,
      folder_id: draftFolder || null,
      updated_at: new Date().toISOString()
    }).eq('id', selectedId).select('*').single()
    setSaving(false)
    if (error) return alert(error.message)
    setNotes(prev => prev.map(n => n.id === selectedId ? data as NoteRow : n).sort((a,b) => +new Date(b.updated_at) - +new Date(a.updated_at)))
  }

  async function togglePin(note: NoteRow) {
    const { data, error } = await supabase.from('notebook_notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id).select('*').single()
    if (error) return alert(error.message)
    setNotes(prev => prev.map(n => n.id === note.id ? data as NoteRow : n))
  }

  async function deleteNote(note: NoteRow) {
    if (!confirm(`Delete “${note.title}”?`)) return
    const { error } = await supabase.from('notebook_notes').delete().eq('id', note.id)
    if (error) return alert(error.message)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    if (selectedId === note.id) openTemplates()
  }

  async function addFolder() {
    const name = prompt('Folder name')?.trim()
    if (!name) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data, error } = await supabase.from('notebook_folders').insert({ user_id: auth.user.id, name }).select('*').single()
    if (error) return alert(error.message)
    setFolders(prev => [...prev, data as FolderRow].sort((a,b) => a.name.localeCompare(b.name)))
  }

  const pinned = filteredNotes.filter(n => n.is_pinned)

  return <div className="notebook-page">
    <header className="notebook-header">
      <div>
        <h1>Notebook</h1>
        <p>Think before you trade. Review before you repeat.</p>
      </div>
      <button className="button primary" onClick={() => createNote()}><Plus size={18}/> New Note</button>
    </header>

    {error && <div className="card notebook-error"><strong>One setup step required</strong><span>{error}</span></div>}

    <div className="notebook-shell">
      <aside className="notebook-rail">
        <div className="notebook-search"><Search size={17}/><input placeholder="Search in notes" value={query} onChange={e => setQuery(e.target.value)} /></div>

        <button className={`notebook-rail-tab ${showTemplates ? 'active' : ''}`} onClick={openTemplates}>
          <BookOpen size={17}/><span>Templates</span><ChevronRight size={16}/>
        </button>

        <div className="notebook-rail-section">
          <div className="notebook-rail-title"><span>ALL NOTES <b>{notes.length}</b></span><ChevronDown size={16}/></div>
          <div className="notebook-note-list">
            {loading ? <div className="notebook-empty-small">Loading notes…</div> : filteredNotes.length ? filteredNotes.map(note =>
              <button key={note.id} className={`notebook-note-row ${selectedId === note.id ? 'active' : ''}`} onClick={() => openNote(note)}>
                <FileText size={16}/><span><strong>{note.title}</strong><small>{new Date(note.updated_at).toLocaleDateString()}</small></span>{note.is_pinned && <Pin size={13}/>} 
              </button>
            ) : <div className="notebook-empty-small"><NotebookPen size={30}/><span>No notes yet</span><button className="button" onClick={() => createNote()}><Plus size={15}/> New Note</button></div>}
          </div>
        </div>

        <div className="notebook-rail-section">
          <div className="notebook-rail-title"><span>FOLDERS <b>{folders.length}</b></span><button onClick={addFolder} title="New folder"><FolderPlus size={16}/></button></div>
          <div className="notebook-folder-list">
            {folders.map(folder => <button key={folder.id} onClick={() => setQuery('')}><Folder size={15}/><span>{folder.name}</span><b>{notes.filter(n => n.folder_id === folder.id).length}</b></button>)}
          </div>
        </div>
      </aside>

      <main className="notebook-main">
        {showTemplates ? <>
          <div className="notebook-main-title"><div><span className="eyebrow">Review system</span><h2>Templates</h2></div><Star size={22}/></div>

          {pinned.length > 0 && <section className="notebook-template-section">
            <h3><Pin size={16}/> Pinned Notes <span>{pinned.length}</span></h3>
            <div className="notebook-pinned-grid">{pinned.slice(0,4).map(note => <button key={note.id} onClick={() => openNote(note)}><strong>{note.title}</strong><span>{note.content.slice(0,120) || 'Empty note'}</span></button>)}</div>
          </section>}

          <section className="notebook-template-section">
            <h3><Archive size={16}/> Performance Review <span>{templates.length}</span></h3>
            <div className="notebook-template-grid">
              {templates.map(template => <article key={template.key} className="notebook-template-card">
                <div className="notebook-template-card-head"><strong><span>{template.icon}</span>{template.title}</strong><MoreVertical size={16}/></div>
                <div className="notebook-template-preview">{template.preview.map((line,i) => <span key={i}>{line}</span>)}</div>
                <button onClick={() => createNote(template)}>Use template</button>
              </article>)}
            </div>
          </section>
        </> : selected ? <section className="notebook-editor">
          <div className="notebook-editor-toolbar">
            <button className="icon-button" onClick={openTemplates} title="Close note"><X size={17}/></button>
            <div className="notebook-editor-actions">
              <button className="icon-button" onClick={() => togglePin(selected)} title={selected.is_pinned ? 'Unpin' : 'Pin'}><Pin size={17}/></button>
              <button className="icon-button danger" onClick={() => deleteNote(selected)} title="Delete"><Trash2 size={17}/></button>
              <button className="button primary" onClick={saveNote} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
            </div>
          </div>
          <input className="notebook-title-input" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Untitled Note" />
          <div className="notebook-meta-row">
            <label><Folder size={15}/><select value={draftFolder} onChange={e => setDraftFolder(e.target.value)}><option value="">No folder</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <span><CalendarDays size={15}/>{new Date(selected.updated_at).toLocaleString()}</span>
          </div>
          <textarea className="notebook-content-editor" value={draftContent} onChange={e => setDraftContent(e.target.value)} placeholder="Write your trading notes, observations, lessons, and reviews here…" />
        </section> : null}
      </main>
    </div>
  </div>
}
