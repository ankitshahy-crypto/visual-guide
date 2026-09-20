import { Capacitor } from "@capacitor/core";

/** True only inside the Capacitor iOS (or Android) shell, not `npm run dev`. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Plugin absent in web / tests.
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // ignore
  }

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    // ignore
  }
}
