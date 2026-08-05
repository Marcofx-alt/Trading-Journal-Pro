import fs from "node:fs";

const url = fs.readFileSync("src-tauri/app-url.txt", "utf8").trim();
const required = [
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/icons/icon.ico"
];

let failed = false;
for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`Missing: ${file}`);
    failed = true;
  }
}

if (!url.startsWith("https://") || url.includes("YOUR-TRADING-JOURNAL")) {
  console.error("Update src-tauri/app-url.txt with your actual Vercel HTTPS URL.");
  failed = true;
}

if (failed) process.exit(1);
console.log("Windows desktop configuration is ready.");
console.log(`App URL: ${url}`);
