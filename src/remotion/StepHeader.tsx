import type { FC } from "react";
import type { Step } from "../types/guide";
import { T } from "./theme";

/** Black number box + title, echoing the manual's own "Step [n]" mark. */
export const StepHeader: FC<{ step: Step; width: number }> = ({ step, width }) => {
  const label = step.index === 0 ? "Start" : String(step.index);
  return (
    <div style={{ width, padding: "48px 56px 0", display: "flex", alignItems: "center", gap: 22 }}>
      <div style={{ background: T.ink, color: T.paper, fontFamily: T.font, fontWeight: 700, fontSize: 44, minWidth: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px" }}>
        {label}
      </div>
      <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 52, lineHeight: 1.1, color: T.ink }}>{step.title}</div>
    </div>
  );
};
