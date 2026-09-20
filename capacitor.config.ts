import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

/**
 * Optional live-reload into the iOS Simulator from a Mac:
 *   CAPACITOR_LIVE_RELOAD=http://<lan-ip>:5173 npx cap sync ios
 * Leave unset for the packaged `dist/` bundle (TestFlight / device).
 */
const liveReload = process.env.CAPACITOR_LIVE_RELOAD?.trim();

const config: CapacitorConfig = {
  appId: "app.plainstep.ios",
  appName: "Plainstep",
  webDir: "dist",
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "Plainstep",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
      backgroundColor: "#ffffff",
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
  server: {
    hostname: "localhost",
    iosScheme: "https",
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
