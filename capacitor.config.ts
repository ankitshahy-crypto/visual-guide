import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

/**
 * Optional live-reload into the iOS Simulator / device from a Mac.
 * Packaged default (unset): WKWebView loads bundled `dist/` — chair + fixture,
 * no `/api/pipeline`. GitHub Pages is not used.
 *
 *   # Simulator (shares the Mac loopback)
 *   npm run dev
 *   npm run ios:live-sync          # CAPACITOR_LIVE_RELOAD=http://localhost:5173
 *
 *   # Physical iPhone on the same LAN
 *   npm run dev -- --host --port 5173
 *   CAPACITOR_LIVE_RELOAD=http://<mac-lan-ip>:5173 npm run ios:sync
 *
 * Unset CAPACITOR_LIVE_RELOAD and re-run `npm run ios:sync` before Archive /
 * TestFlight or the app will keep loading that URL instead of `dist/`.
 * See docs/IOS-DEPLOY.md.
 */
const liveReload = process.env.CAPACITOR_LIVE_RELOAD?.trim();

const config: CapacitorConfig = {
  appId: "app.plainstep.ios",
  appName: "Plainstep",
  webDir: "dist",
  backgroundColor: "#111214",
  ios: {
    // Xcode *build* scheme (target is still `App`). Not a display name.
    // Future URL / deep-link schemes: lowercase `plainstep`.
    contentInset: "never",
    preferredContentMode: "mobile",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: "#111214",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      overlaysWebView: true,
      backgroundColor: "#111214",
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
  // Do not set server.iosScheme to "https". WKWebView already handles https, so
  // Capacitor rejects it and serves the bundle at capacitor://localhost.
  // server.url is live-reload only (CAPACITOR_LIVE_RELOAD). A localhost URL
  // blanks a physical iPhone; the bridge ignores loopback on device.
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
};

if (liveReload) {
  config.server = {
    ...config.server,
    url: liveReload,
    cleartext: liveReload.startsWith("http://"),
  };
}

export default config;
