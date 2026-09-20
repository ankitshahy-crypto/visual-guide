import type { Action, Step, Verb } from "../types/guide";
import { teachingCaptions } from "./youtube";
import type { ManualParse, VideoBeat, VideoGapReason, VideoObservation } from "./types";

const CLICK_RE = /\b(click|seat(?:s|ed)?|until it (?:snaps|locks)|hear|flush)\b/i;
const ORIENT_RE = /\b(upside|right side|facing|orientation|front of|arrow|wide end|narrow end)\b/i;

/**
 * Align video evidence to manual steps.
 * Manual claims never get overwritten here — conflicts are review flags;
 * extras become inferred_from_video gap-fills.
 */
export function proposeBeats(manual: ManualParse, obs: VideoObservation): VideoBeat[] {
  const beats: VideoBeat[] = [];
  const teach = teachingCaptions(obs);
  const visualNotes = [
    ...obs.frames.map((f) => f.note),
    obs.title ?? "",
  ].join(" ");

  for (const step of manual.steps) {
    if (step.template === "parts_overview") continue;
    const captionForStep = captionsForStep(step, teach);
    const extra = extrasNotInManual(step, captionForStep);
    for (const line of extra) {
      beats.push(gapFill(step, line, gapReason(line), line));
    }

    const qtyConflict = quantityConflict(step, captionForStep);
    if (qtyConflict) beats.push(qtyConflict);

    const order = detectOrderConflict(step, captionForStep);
    if (order) beats.push(order);
  }

  // Paper-omitted click/feel and orientation, only when the video is present
  // as a visual source (music-only audio is ignored; visuals + manual remain).
  const visualBlob = `${visualNotes}\n${teach.map((c) => c.text).join("\n")}`;
  for (const step of manual.steps) {
    if (step.template === "parts_overview") continue;
    if (step.actions.some((a) => ["press", "insert", "snap", "fasten"].includes(a.verb)) && !CLICK_RE.test(stepActions(step))) {
      if (obs.audioKind === "music" || /click|seat|snap|push until/i.test(visualBlob) || obs.frames.length || obs.audioKind === "unknown") {
        if (!beats.some((b) => b.stepId === step.id && b.reason === "click_feel")) {
          const part = step.actions.find((a) => ["press", "insert", "snap", "fasten"].includes(a.verb)) ?? step.actions[0];
          if (part) {
            beats.push(gapFill(
              step,
              "Push until it seats — paper diagrams often omit the click/feel.",
              "click_feel",
              `From the video: push ${part.object} until it seats / you feel a click.`,
              {
                verb: part.verb === "fasten" ? "check" : "press",
                object: part.object,
                target: part.target,
                detail: `From the video: push ${part.object} until it seats / you feel a click.`,
                provenance: "inferred_from_video",
              },
            ));
          }
        }
      }
    }
    if (step.actions.some((a) => ["place", "flip", "insert"].includes(a.verb)) && !ORIENT_RE.test(stepActions(step))) {
      if (/fac(e|ing)|orient|front|upside|wide end/i.test(visualBlob) || obs.frames.length) {
        if (!beats.some((b) => b.stepId === step.id && b.reason === "orientation")) {
          const part = step.actions.find((a) => ["place", "flip", "insert"].includes(a.verb)) ?? step.actions[0];
          if (part) {
            beats.push(gapFill(
              step,
              "Video shows which way the part faces before it is fastened.",
              "orientation",
              `From the video: turn ${part.object} so it matches the orientation on screen before you fasten it.`,
              {
                verb: "rotate",
                object: part.object,
                detail: `From the video: turn ${part.object} so it matches the orientation on screen before you fasten it.`,
                provenance: "inferred_from_video",
              },
            ));
          }
        }
      }
    }
  }

  return dedupe(beats);
}

function stepActions(step: Step): string {
  return step.actions.map((a) => a.detail).join(" ");
}

function captionsForStep(step: Step, captions: { text: string }[]): string[] {
  const ids = new Set([
    ...step.parts_used.map((p) => p.id.toLowerCase()),
    ...step.actions.map((a) => a.object.toLowerCase()),
    ...(step.source_label ? [step.source_label.toLowerCase()] : []),
    `step ${step.index}`,
  ]);
  const titleBits = step.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  return captions
    .map((c) => c.text)
    .filter((t) => {
      const low = t.toLowerCase();
      if ([...ids].some((id) => id.length && new RegExp(`\\b${escapeRe(id)}\\b`, "i").test(low))) return true;
      const hits = titleBits.filter((w) => low.includes(w)).length;
      return hits >= 2;
    });
}

function gapReason(line: string): VideoGapReason {
  if (CLICK_RE.test(line)) return "click_feel";
  if (ORIENT_RE.test(line)) return "orientation";
  if (/\bhidden|underneath|from below\b/i.test(line)) return "hidden_fastener";
  return "other";
}

function extrasNotInManual(step: Step, lines: string[]): string[] {
  const manual = stepActions(step).toLowerCase();
  const extra: string[] = [];
  for (const line of lines) {
    const gapHint = CLICK_RE.test(line) || ORIENT_RE.test(line) || /\bhidden|underneath|from below\b/i.test(line);
    if (!gapHint) continue;
    const tokens = line.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    const overlap = tokens.filter((w) => manual.includes(w)).length;
    if (overlap < Math.max(3, Math.floor(tokens.length * 0.5))) extra.push(line.trim());
  }
  return extra.slice(0, 2);
}

function quantityConflict(step: Step, lines: string[]): VideoBeat | null {
  for (const a of step.actions) {
    if (a.qty == null) continue;
    const re = new RegExp(`\\b(\\d+)\\s*(?:x\\s*)?(?:${escapeRe(a.object)})\\b|\\b${escapeRe(a.object)}\\b[^.\\n]{0,24}\\b(\\d+)\\b`, "i");
    for (const line of lines) {
      const m = line.match(re);
      const n = m ? parseInt(m[1] || m[2], 10) : NaN;
      if (Number.isFinite(n) && n !== a.qty) {
        return {
          kind: "conflict",
          reason: "other",
          stepId: step.id,
          stepIndex: step.index,
          detail: `Manual uses ${a.qty}× ${a.object}; video says ${n}.`,
          manualClaim: a.detail,
          videoClaim: line.trim().slice(0, 240),
        };
      }
    }
  }
  // "six H bolts" vs qty 4
  for (const a of step.actions) {
    if (a.qty == null) continue;
    const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
    for (const line of lines) {
      const m = line.toLowerCase().match(new RegExp(`\\b(${Object.keys(words).join("|")})\\s+${escapeRe(a.object.toLowerCase())}`));
      if (m && words[m[1]] !== a.qty) {
        return {
          kind: "conflict",
          reason: "other",
          stepId: step.id,
          stepIndex: step.index,
          detail: `Manual uses ${a.qty}× ${a.object}; video says ${words[m[1]]}.`,
          manualClaim: a.detail,
          videoClaim: line.trim().slice(0, 240),
        };
      }
    }
  }
  return null;
}

function detectOrderConflict(step: Step, lines: string[]): VideoBeat | null {
  if (step.actions.length < 2 || lines.length < 1) return null;
  const first = step.actions[0];
  const second = step.actions[1];
  const blob = lines.join(" ").toLowerCase();
  const i1 = blob.search(new RegExp(`\\b${escapeRe(second.object.toLowerCase())}\\b`));
  const i2 = blob.search(new RegExp(`\\b${escapeRe(first.object.toLowerCase())}\\b`));
  if (i1 >= 0 && i2 >= 0 && i1 < i2 && first.object !== second.object) {
    return {
      kind: "conflict",
      reason: "order",
      stepId: step.id,
      stepIndex: step.index,
      detail: "Video beat order disagrees with the printed step. Manual order stands.",
      manualClaim: first.detail,
      videoClaim: lines[0].trim().slice(0, 240),
    };
  }
  return null;
}

function gapFill(
  step: Step,
  detail: string,
  reason: VideoGapReason,
  actionDetail: string,
  action?: Action,
): VideoBeat {
  const verb: Verb = action?.verb ?? "check";
  return {
    kind: "gap_fill",
    reason,
    stepId: step.id,
    stepIndex: step.index,
    detail,
    action: action ?? {
      verb,
      object: step.actions[0]?.object ?? step.parts_used[0]?.id ?? "X",
      detail: actionDetail.slice(0, 240),
      provenance: "inferred_from_video",
    },
  };
}

function dedupe(beats: VideoBeat[]): VideoBeat[] {
  const seen = new Set<string>();
  const out: VideoBeat[] = [];
  for (const b of beats) {
    const key = `${b.kind}:${b.stepId}:${b.reason}:${(b.action?.detail ?? b.detail).slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
