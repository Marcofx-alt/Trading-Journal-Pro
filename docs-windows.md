# Trading Journal Pro v22 — Windows Desktop Foundation

This release wraps the secure Vercel deployment in a native Tauri 2 desktop window. The OpenAI key and Supabase secrets remain on the hosted server; they are not embedded in the Windows installer.

## 1. Install Windows prerequisites

Install:

1. Microsoft C++ Build Tools with **Desktop development with C++** selected.
2. Rust using Rustup, then run `rustup default stable-msvc`.
3. Microsoft Edge WebView2 Runtime if it is not already installed.
4. Node.js LTS.

Restart Windows or at least restart VS Code after installing them.

## 2. Set the hosted app URL

Open:

`src-tauri/app-url.txt`

Replace the placeholder with the exact Vercel production URL, for example:

`https://trading-journal-pro-example.vercel.app`

Only one URL should be in the file. It must start with `https://`.

## 3. Install dependencies

```bash
npm install
```

## 4. Verify configuration

```bash
npm run desktop:check
```

## 5. Test the desktop app

```bash
npm run desktop:dev
```

The native Trading Journal Pro window should open and display the deployed app.

## 6. Build Windows installers

```bash
npm run desktop:build
```

When the build completes, installers will be under:

`src-tauri/target/release/bundle/nsis/`

and, if MSI prerequisites are enabled:

`src-tauri/target/release/bundle/msi/`

## Security model

- `.env.local` stays in the web/Vercel project and is not packaged into the desktop executable.
- The desktop shell displays the HTTPS Vercel deployment.
- Supabase authentication and AI Chart Vision continue to use the same secure hosted backend.
- Keep the GitHub repository private while the product is under development.

## Git workflow

```bash
git checkout -b feature/windows-desktop
git add .
git commit -m "Add v22 Windows desktop foundation"
git push -u origin feature/windows-desktop
```
