import { describe, expect, it } from "vitest";
import {
  FIXTURE_CREATE_YOUTUBE_URL,
  loadFixtureCreatePhotos,
  publicAssetUrl,
  wantsFixtureCreate,
} from "./fixtureCreate";

describe("fixture create (phone / static host)", () => {
  it("does not require a paid YouTube id", () => {
    expect(FIXTURE_CREATE_YOUTUBE_URL).toContain("vgfixture001");
  });

  it("reads ?fixture= from the hash (iPhone deep link)", () => {
    expect(wantsFixtureCreate("#/new?fixture=1")).toBe(true);
    expect(wantsFixtureCreate("#/new?fixture")).toBe(true);
    expect(wantsFixtureCreate("#/new")).toBe(false);
    expect(wantsFixtureCreate("#/")).toBe(false);
  });

  it("resolves public files from the Vite base (subdirectory hosts)", () => {
    expect(publicAssetUrl("fixtures/parts-list.jpg", "./")).toBe("./fixtures/parts-list.jpg");
    expect(publicAssetUrl("fixtures/parts-list.jpg", "/visual-guide/")).toBe("/visual-guide/fixtures/parts-list.jpg");
  });

  it("loads both fixture JPEGs as page photos without OPENAI_API_KEY", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toMatch(/fixtures\/(parts-list|assembly-steps)\.jpg$/);
      return new Response(jpeg, { status: 200, headers: { "Content-Type": "image/jpeg" } });
    };
    const files = await loadFixtureCreatePhotos(fetchImpl as typeof fetch);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name)).toEqual(["parts-list.jpg", "assembly-steps.jpg"]);
    expect(files.every((f) => f.role === "photo" && f.dataUrl.startsWith("data:image/jpeg;base64,"))).toBe(true);
  });
});
