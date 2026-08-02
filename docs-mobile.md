# v21 Mobile Foundation

This release prepares Trading Journal Pro for Android and iOS packaging.

## Included
- Responsive top and bottom mobile navigation
- Touch-friendly controls and safe-area support
- Mobile tools drawer
- PWA manifest, app icons and install prompt
- Basic service-worker shell caching
- iPhone standalone display metadata

## Next packaging step
The app uses a server route for AI Chart Vision, so the secure web backend must remain hosted. The Android and iOS native shells should load the deployed HTTPS app URL rather than exposing the OpenAI key in the mobile package.

Recommended order:
1. Deploy the current web app to Vercel.
2. Confirm the production URL and authentication redirects.
3. Add Capacitor Android using the production URL.
4. Test camera, uploads, downloads and authentication on a real device.
5. Add iOS on a Mac with Xcode.
