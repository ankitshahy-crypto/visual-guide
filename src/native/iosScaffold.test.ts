import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

const SKIP_DIR = new Set(["node_modules", "dist", ".git", "out", "__pycache__", "xcuserdata", "DerivedData"]);
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".html", ".md", ".json", ".plist", ".py", ".svg",
  ".webmanifest", ".pbxproj", ".css", ".swift", ".xml", ".xcconfig", ".example",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(dir, name);
    const rel = relative(root, p).replaceAll("\\", "/");
    if (rel.startsWith("ios/App/App/public") || rel === "ios/App/App/capacitor.config.json" || rel === "ios/App/App/config.xml" || rel === "docs/E2E-CHECKLIST.md") {
      continue;
    }
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (TEXT_EXT.has(extname(name)) || name === ".env.example") out.push(p);
  }
  return out;
}

describe("iOS Capacitor scaffold", () => {
  const plist = readFileSync(resolve(root, "ios/App/App/Info.plist"), "utf8");
  const pbx = readFileSync(resolve(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  const cap = readFileSync(resolve(root, "capacitor.config.ts"), "utf8");

  it("points README at the human E2E checklist", () => {
    const readme = readFileSync(resolve(root, "README.md"), "utf8");
    expect(readme).toContain("docs/E2E-CHECKLIST.md");
    const e2e = readFileSync(resolve(root, "docs/E2E-CHECKLIST.md"), "utf8");
    expect(e2e).toContain("## A. Assembler");
    expect(e2e).toContain("## B. Creator");
    expect(e2e).toContain("## Findings");
    expect(e2e.toLowerCase()).toContain("dark chrome");
    expect(e2e.toLowerCase()).toContain("paper-white");
  });

  it("defaults app chrome to dark and keeps the clip stage paper-white", () => {
    const css = readFileSync(resolve(root, "src/index.css"), "utf8");
    expect(css).toContain("--color-chrome: #111214");
    expect(css).toContain("--color-paper: #ffffff");
    expect(css).toContain("--color-ink: #000000");
    expect(css).toContain("color-scheme: dark");

    const remotion = readFileSync(resolve(root, "src/remotion/theme.ts"), "utf8");
    expect(remotion).toContain('paper: "#ffffff"');
    expect(remotion).toContain('ink: "#000000"');

    const player = readFileSync(resolve(root, "src/components/StepPlayer.tsx"), "utf8");
    expect(player).toContain("bg-paper");

    const thumb = readFileSync(resolve(root, "src/components/FigureThumb.tsx"), "utf8");
    expect(thumb).toContain("bg-paper");
    expect(thumb).toContain("border-ink");

    expect(cap).toContain('backgroundColor: "#111214"');
    expect(cap).toContain('style: "LIGHT"');
    expect(plist).toContain("UIStatusBarStyleLightContent");

    const native = readFileSync(resolve(root, "src/native/initNative.ts"), "utf8");
    expect(native).toContain("Style.Light");
    expect(native).not.toContain("Style.Dark");
  });

  it("uses Plainstep + placeholder bundle id that is easy to change", () => {
    expect(cap).toContain('appId: "app.plainstep.ios"');
    expect(cap).toContain('appName: "Plainstep"');
    expect(plist).toContain("<string>Plainstep</string>");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = app.plainstep.ios;");
  });

  it("locks display spelling to Plainstep (capital P only) and ids to lowercase plainstep", () => {
    const forbidden = [
      "Plain" + "Step",
      "plain" + "Step",
      "Visual" + " Guide",
      "app.visual" + "guide",
    ];
    const hits: string[] = [];
    for (const file of walk(root)) {
      const text = readFileSync(file, "utf8");
      for (const needle of forbidden) {
        if (text.includes(needle)) hits.push(`${relative(root, file)}: ${needle}`);
      }
    }
    expect(hits).toEqual([]);
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
