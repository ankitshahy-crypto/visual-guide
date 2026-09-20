import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const home = readFileSync(resolve(import.meta.dirname, "ProjectList.tsx"), "utf8");
const app = readFileSync(resolve(import.meta.dirname, "../App.tsx"), "utf8");
const nav = readFileSync(resolve(root, "src/chrome/BottomNav.tsx"), "utf8");
const help = readFileSync(resolve(import.meta.dirname, "HelpPage.tsx"), "utf8");
const stepPlayer = readFileSync(resolve(root, "src/components/StepPlayer.tsx"), "utf8");

describe("in-app home (Projects)", () => {
  it("explains Plainstep on the first screen", () => {
    expect(home).toContain('title="Plainstep"');
    expect(home).toContain("Clear assembly videos from any manual.");
    expect(home).toContain("How it works");
    expect(home).toContain("Upload manual");
    expect(home).toContain("Review AI steps");
    expect(home).toContain("Follow clips with checkpoints");
    expect(home).toContain("Simple words");
    expect(home).toContain("Try MagicH Pro Chair");
    expect(home).toContain("Your guides");
    expect(home).toContain("No guides yet");
    expect(home).toContain("Tap New to turn a PDF or page photos into clips.");
    expect(home).toContain("Sample");
  });

  it("uses a Plainstep-orange hero, not a paper-white home stage", () => {
    expect(home).toContain("data-home-hero");
    expect(home).toContain("rounded-[28px] bg-action");
    expect(home).toContain("Try MagicH Pro Chair");
  });

  it("does not clone Pocket home chrome", () => {
    const ui = home + nav + help;
    expect(ui).not.toContain("Refer");
    expect(ui).not.toContain("streak");
    expect(ui).not.toContain("Training your Pocket");
    expect(ui).not.toContain("Ask Pocket");
    expect(ui).not.toContain("Start now");
    expect(nav).toContain('label: "Home"');
    expect(nav).toContain('label: "New"');
    expect(nav).toContain('label: "Help"');
    expect(nav).not.toContain('label: "Settings"');
    expect(nav).not.toContain("Ask Pocket");
  });

  it("keeps help, seller, and a Home/New/Help pill nav", () => {
    expect(home).toContain("SUPPORT_EMAIL");
    expect(home).toContain("SUPPORT_MAILTO");
    expect(home).toContain("LEGAL_OWNER");
    expect(home).toContain("Help & support");
    expect(nav).toContain("data-bottom-nav");
    expect(nav).toContain("rounded-full");
    expect(app).toContain('h === "/help"');
    expect(app).toContain("<BottomNav");
    expect(help).toContain("SUPPORT_MAILTO");
    expect(help).toContain("SUPPORT_EMAIL");
    expect(help).toContain("LEGAL_OWNER");
  });

  it("does not add a marketing-site route", () => {
    expect(app).not.toMatch(/plainstep\.app/);
    expect(app).not.toContain('page: "marketing"');
    expect(app).toContain('return { page: "list" }');
  });

  it("keeps the clip player paper-white and hides the tab there", () => {
    expect(stepPlayer).toContain("bg-paper");
    expect(stepPlayer).toContain("Paper-white stage");
    expect(app).toContain('route.page === "help" ? "help"');
    expect(app).toContain("tab ? (");
  });
});
