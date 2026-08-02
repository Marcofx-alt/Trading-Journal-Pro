import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && key)

// Keep the application renderable when .env.local has not been copied yet.
// AppShell displays a setup screen and prevents authentication/data calls until
// valid public Supabase settings are present.
const safeUrl = url || 'https://placeholder.supabase.co'
const safeKey = key || 'missing-anon-key'

export const supabase = createClient(safeUrl, safeKey)
