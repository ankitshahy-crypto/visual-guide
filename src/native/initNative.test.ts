import { describe, expect, it } from "vitest";
import { isNativeApp } from "./initNative";

describe("isNativeApp", () => {
  it("is false under Vitest / npm run dev (not a Capacitor binary)", () => {
    expect(isNativeApp()).toBe(false);
  });
});
