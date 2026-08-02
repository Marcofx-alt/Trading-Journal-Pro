'use client'

export default function EnvironmentSetup() {
  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#0d1117',color:'#f4f7fb'}}>
      <section style={{width:'min(760px,100%)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'20px',padding:'28px',background:'rgba(20,26,35,.96)',boxShadow:'0 24px 80px rgba(0,0,0,.35)'}}>
        <p style={{margin:'0 0 8px',fontSize:'13px',letterSpacing:'.12em',textTransform:'uppercase',opacity:.7}}>Trading Journal Pro</p>
        <h1 style={{margin:'0 0 12px',fontSize:'30px'}}>Supabase setup required</h1>
        <p style={{lineHeight:1.65,opacity:.85}}>
          The app is installed correctly, but this new project folder does not contain your private <code>.env.local</code> file.
          Copy that file from the working v18 project into this folder, beside <code>package.json</code>, then restart the app.
        </p>
        <div style={{marginTop:'20px',padding:'18px',borderRadius:'14px',background:'rgba(255,255,255,.06)',lineHeight:1.8}}>
          <strong>Required file contents</strong>
          <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'12px 0 0',fontSize:'14px'}}>NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co{`\n`}NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY{`\n`}OPENAI_API_KEY=YOUR_OPENAI_KEY</pre>
        </div>
        <ol style={{lineHeight:1.8,paddingLeft:'22px'}}>
          <li>Stop the server with <code>Ctrl + C</code>.</li>
          <li>Copy <code>.env.local</code> from v18 into the new <code>trading-journal-pro</code> folder.</li>
          <li>Run <code>npm run dev</code> again.</li>
          <li>Refresh <code>localhost:3000</code>.</li>
        </ol>
        <p style={{marginBottom:0,opacity:.7,fontSize:'14px'}}>Do not rename the file to .env.local.txt.</p>
      </section>
    </main>
  )
}
