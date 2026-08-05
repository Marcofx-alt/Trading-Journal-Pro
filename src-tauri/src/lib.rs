use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const APP_URL: &str = include_str!("../app-url.txt");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let url = APP_URL.trim();

            if !url.starts_with("https://") {
                return Err("src-tauri/app-url.txt must contain your full HTTPS Vercel URL".into());
            }

            let parsed_url = url.parse()?;

            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(parsed_url),
            )
            .title("Trading Journal Pro")
            .inner_size(1440.0, 920.0)
            .min_inner_size(1000.0, 680.0)
            .resizable(true)
            .center()
            .build()?;

            #[cfg(debug_assertions)]
            window.open_devtools();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Trading Journal Pro");
}
