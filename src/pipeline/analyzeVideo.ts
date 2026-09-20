import { proposeBeats } from "./alignVideo";
import { isFixtureVideoId, sampleAssemblyObservation } from "./fixtures/sampleVideo";
import type { ManualParse, VideoProposal } from "./types";
import { fetchVideoObservation, parseYouTubeId } from "./youtube";

export interface AnalyzeVideoOptions {
  onProgress?: (detail: string) => void;
  observation?: import("./types").VideoObservation;
  fetchObservation?: typeof fetchVideoObservation;
}

/**
 * analyzeVideo — optional video → proposed beats aligned to the manual.
 *
 * Fetches YouTube metadata / captions / poster frames when the dev proxy or
 * network allows it. Fixture video ids and failed fetches still run the
 * aligner: music-only audio is ignored; teaching actions come from visuals
 * plus the printed manual. Video never overwrites the manual.
 */
export async function analyzeVideo(
  manual: ManualParse,
  locators: { youtubeUrl?: string; packagingUrl?: string },
  opts?: AnalyzeVideoOptions,
): Promise<VideoProposal | null> {
  const youtube = locators.youtubeUrl?.trim() || undefined;
  const packaging = locators.packagingUrl?.trim() || undefined;
  if (!youtube && !packaging) return null;

  opts?.onProgress?.("Fetching manufacturer video…");
  const id = parseYouTubeId(youtube) || parseYouTubeId(packaging);
  let obs = opts?.observation;
  if (!obs) {
    if (isFixtureVideoId(id)) {
      obs = sampleAssemblyObservation({ youtubeUrl: youtube, packagingUrl: packaging });
    } else {
      try {
        const fetchObs = opts?.fetchObservation ?? fetchVideoObservation;
        obs = await fetchObs({ youtubeUrl: youtube, packagingUrl: packaging });
      } catch (err) {
        obs = {
          youtubeUrl: youtube,
          packagingUrl: packaging,
          videoId: id,
          title: null,
          captions: [],
          audioKind: "unknown",
          frames: id ? [{ t: 0, note: "poster frame", imageUrl: `https://i.ytimg.com/vi/${id}/0.jpg` }] : [],
          fetchStatus: "partial",
          log: [`live fetch failed (${err instanceof Error ? err.message : String(err)}); aligning from visuals + manual text`],
        };
      }
    }
  }

  if (obs.audioKind === "music") {
    opts?.onProgress?.("Music-only audio — reading visuals instead…");
  } else {
    opts?.onProgress?.("Aligning video beats to printed steps…");
  }

  const beats = proposeBeats(manual, obs);
  const notes = [
    youtube ? `YouTube locator: ${youtube}` : "",
    packaging ? `Packaging/QR locator: ${packaging}` : "",
    obs.title ? `title: ${obs.title}` : "",
    `audio: ${obs.audioKind}`,
    `${beats.filter((b) => b.kind === "gap_fill").length} gap-fills, ${beats.filter((b) => b.kind === "conflict").length} conflicts`,
    ...obs.log,
  ].filter(Boolean);

  return {
    source: {
      youtube_url: youtube ?? null,
      packaging_url: packaging ?? null,
      title: obs.title ?? null,
      notes: obs.audioKind === "music"
        ? "Music-only audio ignored. Gap-fills come from visuals + the printed manual."
        : "Video used only to fill gaps. Conflicts are review items; the printed page stands.",
    },
    beats,
    fetchStatus: obs.fetchStatus,
    log: notes,
    stubbed: [],
  };
}
