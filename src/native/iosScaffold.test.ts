import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("iOS Capacitor scaffold", () => {
  const plist = readFileSync(resolve(root, "ios/App/App/Info.plist"), "utf8");
  const pbx = readFileSync(resolve(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  const cap = readFileSync(resolve(root, "capacitor.config.ts"), "utf8");

  it("uses Plainstep + placeholder bundle id that is easy to change", () => {
    expect(cap).toContain('appId: "app.plainstep.ios"');
    expect(cap).toContain('appName: "Plainstep"');
    expect(plist).toContain("<string>Plainstep</string>");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = app.plainstep.ios;");
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

  it("ships a 1024×1024 RGB AppIcon for the locked Plainstep mark", () => {
    const icon = readFileSync(resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"));
    expect([...icon.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(icon.readUInt32BE(16)).toBe(1024);
    expect(icon.readUInt32BE(20)).toBe(1024);
  });
});
