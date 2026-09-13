# Step 2 — Notebook

This build adds a Notebook page inspired by the supplied reference screenshot while keeping Trading Journal Pro branding and styling.

## Features
- Search all notes
- Create blank notes
- Custom folders
- Pin/unpin notes
- Delete notes
- Daily, Weekly, Monthly, Quarterly, and Annual review templates
- Use a template to create an editable review note
- Supabase-backed persistence across devices
- Desktop and mobile navigation entry

## Required database upgrade
Run `supabase/upgrade_v12_notebook.sql` once in Supabase SQL Editor.

## Start locally
Copy your existing `.env.local` beside `package.json`, then:

```bash
npm install
npm run dev
```
