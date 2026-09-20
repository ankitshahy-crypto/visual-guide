import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("iOS Capacitor scaffold", () => {
  const plist = readFileSync(resolve(root, "ios/App/App/Info.plist"), "utf8");
  const pbx = readFileSync(resolve(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  const cap = readFileSync(resolve(root, "capacitor.config.ts"), "utf8");

  it("uses Visual Guide + placeholder bundle id that is easy to change", () => {
    expect(cap).toContain('appId: "app.visualguide.ios"');
    expect(cap).toContain('appName: "Visual Guide"');
    expect(plist).toContain("<string>Visual Guide</string>");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = app.visualguide.ios;");
  });

  it("declares camera + photo library usage (QR scan is still URL paste)", () => {
    expect(plist).toContain("NSCameraUsageDescription");
    expect(plist).toContain("NSPhotoLibraryUsageDescription");
    expect(plist).toContain("paste the YouTube or packaging URL");
  });

  it("locks iPhone to portrait; iPad may rotate", () => {
    const iphoneBlock = plist.split("UISupportedInterfaceOrientations~ipad")[0];
    expect(iphoneBlock).toContain("UIInterfaceOrientationPortrait");
    expect(iphoneBlock).not.toContain("UIInterfaceOrientationLandscapeLeft");
    expect(pbx).toContain("CapApp-SPM");
  });
});
