import { describe, expect, it } from "vitest";
import { isFixtureQuery, splitHash } from "./hashRoute";

describe("splitHash", () => {
  it("strips query so #/new?fixture=1 is the New guide route", () => {
    expect(splitHash("#/new?fixture=1").path).toBe("/new");
    expect(isFixtureQuery(splitHash("#/new?fixture=1").params)).toBe(true);
    expect(isFixtureQuery(splitHash("#/new?fixture=true").params)).toBe(true);
    expect(isFixtureQuery(splitHash("#/new").params)).toBe(false);
    expect(splitHash("#/new/analyzing").path).toBe("/new/analyzing");
    expect(splitHash("#/help").path).toBe("/help");
  });
});
