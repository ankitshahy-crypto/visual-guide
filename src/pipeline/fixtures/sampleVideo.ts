import type { CaptionCue, VideoObservation } from "../types";

/** Recorded YouTube observation for CI / no-network demo. */
export const SAMPLE_VIDEO_ID = "vgfixture001";

export const SAMPLE_YOUTUBE_URL = `https://www.youtube.com/watch?v=${SAMPLE_VIDEO_ID}`;

export function isFixtureVideoId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === SAMPLE_VIDEO_ID || id.startsWith("vgfixture");
}

export function sampleAssemblyObservation(locators: { youtubeUrl?: string; packagingUrl?: string }): VideoObservation {
  const captions: CaptionCue[] = [
    { t: 4, text: "Flip the seat upside down on a soft surface." },
    { t: 12, text: "Set the mechanism so the FRONT faces the front of the seat." },
    { t: 20, text: "Now take the six H bolts and start them by hand." },
    { t: 28, text: "Push until you feel a click before you snug the hex key." },
    { t: 40, text: "Armrests next — three I bolts each side." },
  ];
  return {
    youtubeUrl: locators.youtubeUrl,
    packagingUrl: locators.packagingUrl,
    videoId: SAMPLE_VIDEO_ID,
    title: "Assembly video (recorded fixture)",
    captions,
    audioKind: "speech",
    frames: [
      { t: 0, note: "seat upside down, mechanism F aligned, front facing camera" },
      { t: 12, note: "H bolts started in four holes — click as the mechanism seats" },
    ],
    fetchStatus: "fixture",
    log: ["using recorded video fixture vgfixture001 (no live YouTube fetch)"],
  };
}

export function sampleMusicObservation(locators: { youtubeUrl?: string; packagingUrl?: string }): VideoObservation {
  return {
    youtubeUrl: locators.youtubeUrl,
    packagingUrl: locators.packagingUrl,
    videoId: locators.youtubeUrl ? "musicstub" : null,
    title: "Official Audio — Ambient Tools",
    captions: [
      { t: 0, text: "♪ la la la ♪" },
      { t: 4, text: "yeah yeah" },
      { t: 8, text: "chorus: dancing tonight" },
      { t: 12, text: "verse two lyrics" },
      { t: 16, text: "♪ official audio ♪" },
    ],
    audioKind: "music",
    frames: [
      { t: 0, note: "hands pushing a caster into a base leg until it seats" },
    ],
    fetchStatus: "fixture",
    log: ["music-only audio ignored; teaching from visuals + manual"],
  };
}
