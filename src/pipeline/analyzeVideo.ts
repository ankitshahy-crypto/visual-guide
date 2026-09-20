import type { ManualParse, VideoBeat, VideoProposal } from "./types";

const FETCH_TODO =
  "TODO: fetch/transcribe the YouTube (or packaging-QR) video, detect beats, and align them to manual steps. This stub only proposes example gap-fills and a conflict so mergeSources can be exercised.";

/**
 * analyzeVideo — optional video → proposed beats aligned to the manual.
 *
 * Does not fetch YouTube. Returns null when no video locator is given.
 * Stub proposals are tagged so they never look like a real vision result.
 */
export function analyzeVideo(
  manual: ManualParse,
  locators: { youtubeUrl?: string; packagingUrl?: string },
): VideoProposal | null {
  const youtube = locators.youtubeUrl?.trim() || undefined;
  const packaging = locators.packagingUrl?.trim() || undefined;
  if (!youtube && !packaging) return null;

  const actionStep = [...manual.steps].reverse().find((s) => s.template === "figure_action") ?? manual.steps.at(-1);
  const firstAction = manual.steps.find((s) => s.actions.length > 0);
  const partId = manual.parts[0]?.id ?? "X";

  const beats: VideoBeat[] = [];
  if (actionStep) {
    beats.push({
      kind: "gap_fill",
      reason: "click_feel",
      stepId: actionStep.id,
      stepIndex: actionStep.index,
      detail: "Video usually shows a click/seat that paper diagrams omit.",
      action: {
        verb: "check",
        object: partId,
        detail: "From the video: push until it seats / you hear or feel a click.",
        provenance: "inferred_from_video",
      },
    });
    beats.push({
      kind: "gap_fill",
      reason: "orientation",
      stepId: actionStep.id,
      stepIndex: actionStep.index,
      detail: "Video often shows which way a part faces before it is fastened.",
      action: {
        verb: "rotate",
        object: partId,
        detail: "From the video: turn the part so it matches the orientation on screen before you fasten it.",
        provenance: "inferred_from_video",
      },
    });
  }
  if (firstAction?.actions[0]) {
    beats.push({
      kind: "conflict",
      reason: "order",
      stepId: firstAction.id,
      stepIndex: firstAction.index,
      detail: "Stub conflict: video beat order may not match the printed step. Manual order stands.",
      manualClaim: firstAction.actions[0].detail,
      videoClaim: "Video appears to do this beat in a different order or with a different count. Confirm against the printed page — do not take the video over the manual.",
    });
  }

  const notes = [
    youtube ? `YouTube locator stored: ${youtube}` : "",
    packaging ? `Packaging/QR locator stored: ${packaging}` : "",
    FETCH_TODO,
  ].filter(Boolean);

  return {
    source: {
      youtube_url: youtube ?? null,
      packaging_url: packaging ?? null,
      notes: FETCH_TODO,
    },
    beats,
    fetchStatus: "stubbed",
    log: notes,
    stubbed: ["YouTube / packaging-QR fetch + transcription", "beat alignment against manual steps"],
  };
}
