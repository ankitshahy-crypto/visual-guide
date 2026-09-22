import { describe, expect, it } from "vitest";
import golden from "../data/golden/newtral-magich-pro.json";
import { assertGuide } from "../lib/validate";
import { resolveManualImage } from "./cliRealistic";
import { buildPartPrompt, buildStepPrompt } from "./realisticPrompts";
import {
  catalogQuery,
  imageUrlFromInstantAnswer,
  manualProductPage,
  productIdentifiers,
  selectProductReference,
} from "./productReference";

describe("finished-product reference priority", () => {
  const guide = assertGuide(golden);

  it("uses the MagicH cover already in the manual and does not require a user photo", () => {
    const page = manualProductPage(guide);
    expect(page?.page).toBe("1");
    expect(page?.label).toBe("cover");
    expect(page?.image).toBe("pages/p-01.jpg");
    const identifiers = productIdentifiers(guide);
    expect(identifiers).toContain("MagicH-BPRO");
    expect(identifiers).toContain("MagicH-GPRO");
    const path = resolveManualImage(page!.image);
    const chosen = selectProductReference({
      manualPath: path,
      manualPage: page!.page,
      manualImage: page!.image,
      catalogPath: "/tmp/catalog.jpg",
      userPath: "/tmp/user-chair.jpg",
      identifiers,
      query: catalogQuery(guide, identifiers),
    });
    expect(chosen.kind).toBe("manual-cover");
    expect(chosen.path).toBe(path);
    expect(chosen.page).toBe("1");
    expect(chosen.detail).toContain("No user photo is required");
    expect(chosen.detail).toContain("ignored");
    expect(chosen.path).not.toBe("/tmp/user-chair.jpg");
    expect(chosen.path).not.toBe("/tmp/catalog.jpg");
  });

  it("fetches by model number only when the manual has no cover or hero", () => {
    const bare = assertGuide({
      ...golden,
      source: {
        ...golden.source,
        manual: {
          ...golden.source.manual,
          pages: golden.source.manual.pages.map((p) => ({ ...p, label: "step" })),
        },
      },
    });
    expect(manualProductPage(bare)).toBeNull();
    const identifiers = productIdentifiers(bare);
    const fetched = selectProductReference({
      manualPath: null,
      catalogPath: "/tmp/catalog.jpg",
      userPath: "/tmp/user-chair.jpg",
      identifiers,
      query: catalogQuery(bare, identifiers),
    });
    expect(fetched.kind).toBe("catalog-fetch");
    expect(fetched.path).toBe("/tmp/catalog.jpg");
    expect(fetched.detail).toContain("No user photo is required");

    const pending = selectProductReference({
      manualPath: null,
      catalogPath: null,
      userPath: "/tmp/user-chair.jpg",
      identifiers,
      catalogPending: true,
      query: "Newtral MagicH-BPRO office chair",
    });
    expect(pending.kind).toBe("none");
    expect(pending.path).toBeNull();
    expect(pending.detail).toContain("Would search");
    expect(pending.detail).toContain("--product-photo");
  });

  it("accepts an optional user photo only after cover and catalog fetch miss", () => {
    const upload = selectProductReference({
      manualPath: null,
      catalogPath: null,
      userPath: "/tmp/user-chair.jpg",
      identifiers: ["MagicH-BPRO"],
    });
    expect(upload.kind).toBe("user-upload");
    expect(upload.path).toBe("/tmp/user-chair.jpg");

    const none = selectProductReference({
      manualPath: null,
      catalogPath: null,
      userPath: null,
      identifiers: [],
    });
    expect(none.kind).toBe("none");
    expect(none.detail).toContain("diagram and parts list");
    expect(none.detail).toContain("No user photo is required");
  });

  it("reads a DuckDuckGo image URL when a catalog answer has one", () => {
    expect(imageUrlFromInstantAnswer({})).toBeNull();
    expect(imageUrlFromInstantAnswer({ Image: "" })).toBeNull();
    expect(imageUrlFromInstantAnswer({ Image: "/i/chair.jpg" })).toBe("https://duckduckgo.com/i/chair.jpg");
    expect(imageUrlFromInstantAnswer({ Image: "https://example.com/chair.jpg" })).toBe("https://example.com/chair.jpg");
  });

  it("puts the parts list and the manual cover into the generation prompt", () => {
    const step = guide.steps.find((s) => s.id === "s1")!;
    const part = guide.parts.find((p) => p.id === "A")!;
    const stepPrompt = buildStepPrompt(guide, step, "manual-cover");
    const partPrompt = buildPartPrompt(guide, part, "manual-cover");
    expect(stepPrompt).toContain("Parts list from the manual");
    expect(stepPrompt).toContain("Headrest ×1");
    expect(stepPrompt).toContain("Bolt M6x50mm ×4");
    expect(stepPrompt).toContain("cover or hero image already in the manual");
    expect(stepPrompt).toContain("Turn the seat upside down");
    expect(partPrompt).toContain("Headrest");
    expect(partPrompt).toContain("cover or hero image already in the manual");
    expect(partPrompt).toContain("Parts list from the manual");
  });
});
