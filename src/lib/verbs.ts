import type { LucideIcon } from "lucide-react";
import {
  ArrowDown, ArrowDownToLine, ArrowUpFromLine, Check, FlipVertical, ListChecks,
  Magnet, Move, MoveHorizontal, RotateCw, Wrench,
} from "lucide-react";
import type { Verb } from "../types/guide";

export const verbIcon: Record<Verb, LucideIcon> = {
  flip: FlipVertical,
  place: Move,
  insert: ArrowDownToLine,
  slide: MoveHorizontal,
  press: ArrowDown,
  snap: Magnet,
  fasten: Wrench,
  tighten: RotateCw,
  choose: ListChecks,
  remove: ArrowUpFromLine,
  rotate: RotateCw,
  check: Check,
};

export const verbLabel: Record<Verb, string> = {
  flip: "Flip", place: "Place", insert: "Insert", slide: "Slide", press: "Press", snap: "Snap on",
  fasten: "Bolt", tighten: "Tighten", choose: "Choose", remove: "Remove", rotate: "Rotate", check: "Check",
};
