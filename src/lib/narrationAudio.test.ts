import { describe, expect, it } from "vitest";
import { cues, splitSentences } from "./sentences";
import { cuesFromDurations, planNarration } from "./narrationAudio";

describe("subtitle cues", () => {
  it("splits sentences and windows them across the body", () => {
    const list = cues("One. Two three.", 10, 110);
    expect(splitSentences("One. Two three.")).toEqual(["One.", "Two three."]);
    expect(list[0].from).toBe(10);
    expect(list.at(-1)?.to).toBe(110);
  });
});

describe("planNarration", () => {
  it("times cues from audio durations and scales if the clip is shorter than speech", () => {
    const { cues: list, playbackRate } = cuesFromDurations(
      [
        { text: "First.", durationMs: 2000 },
        { text: "Second.", durationMs: 2000 },
      ],
      0,
      30, // 1 second at 30fps
      30,
    );
    expect(playbackRate).toBeGreaterThan(1);
    expect(list[0].from).toBe(0);
    expect(list[1].to).toBe(30);
  });

  it("falls back to character-timed cues when no audio files exist", () => {
    const plan = planNarration("Hello. World.", 0, 90, null, 30);
    expect(plan.clips).toEqual([]);
    expect(plan.cues.length).toBe(2);
    expect(plan.cues[0].text).toBe("Hello.");
  });

  it("emits Remotion clips aligned to subtitle cues", () => {
    const plan = planNarration("Hello.", 10, 40, [
      { text: "Hello.", hash: "abc", src: "/narration/abc.mp3", durationMs: 500 },
    ], 30);
    expect(plan.clips).toHaveLength(1);
    expect(plan.clips[0].src).toBe("/narration/abc.mp3");
    expect(plan.clips[0].from).toBe(10);
    expect(plan.cues[0].text).toBe("Hello.");
  });
});
