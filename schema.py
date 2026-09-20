"""
Guide schema v0.2 — the contract between parser, player, and renderer.

v0.1 came from golden/newtral-magich-pro.json (the chair fixture).
v0.2 adds multi-source guides: the printed/photographed manual is the
source of truth; an optional video (YouTube and/or a packaging QR URL)
may gap-fill. Video never silently overwrites the manual — conflicts
become review_notes of kind "conflict".

Design notes
- Plainstep is for ANY instruction set (furniture, toys, electronics).
  The Newtral MagicH Pro chair is a golden test fixture, not the product.
- One Step == one clip. Multi-action steps become beats inside the clip
  so numbering matches the manual.
- Parts are a catalog on the Guide; steps reference them by id.
- Narration ships at two reading levels. Both are required so the
  Simple words toggle is never empty.
- Provenance: "manual" = printed in the source, "inferred" = read off a
  diagram, "generated" = added for pedagogy, "inferred_from_video" =
  taken from the optional video and not present in the manual.
- Figure bboxes are normalized [x0, y0, x1, y1] on the rendered source
  page image (ManualSource.pages[].image).
- review_notes carry parser uncertainty AND manual-vs-video conflicts
  so a human can resolve them. Never drop a manual fact to match video.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# --------------------------------------------------------------------------- enums

class ContentModel(str, Enum):
    procedural = "procedural"
    expository = "expository"  # reserved; not implemented in v1


class Template(str, Enum):
    parts_overview = "parts_overview"  # materials checklist that ticks
    figure_action = "figure_action"    # source figure + zoom/highlight + action
    options = "options"                # figure_action + a user choice
    caution = "caution"                # standalone warning card


class PartKind(str, Enum):
    component = "component"
    fastener = "fastener"
    tool = "tool"


class Provenance(str, Enum):
    manual = "manual"
    inferred = "inferred"
    generated = "generated"
    inferred_from_video = "inferred_from_video"


class ReviewKind(str, Enum):
    uncertainty = "uncertainty"  # parser unsure; human should check
    conflict = "conflict"        # manual and video disagree; manual stands


class Verb(str, Enum):
    flip = "flip"
    place = "place"
    insert = "insert"
    slide = "slide"
    press = "press"
    snap = "snap"
    fasten = "fasten"
    tighten = "tighten"
    choose = "choose"
    remove = "remove"
    rotate = "rotate"
    check = "check"


class Direction(str, Enum):
    up = "up"
    down = "down"
    left = "left"
    right = "right"
    in_ = "in"
    out = "out"
    clockwise = "clockwise"
    counterclockwise = "counterclockwise"


# --------------------------------------------------------------------------- guide-level

class Product(BaseModel):
    brand: str
    model: str
    category: str


class SourcePage(BaseModel):
    page: str            # source page key: PDF page number, or a photo's ordinal
    label: Optional[str] = None  # what's printed on the page ("2", "cover")
    image: str           # rendered/uploaded image for this page
    width: Optional[int] = Field(default=None, ge=1)   # pixel size of that image, so the
    height: Optional[int] = Field(default=None, ge=1)  # player can crop deterministically


class ManualSource(BaseModel):
    """Printed or photographed manual — always the source of truth."""
    type: str  # "pdf" | "manual_photos"
    file: Optional[str] = None
    pages: list[SourcePage] = Field(default_factory=list)
    missing_pages: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class VideoSource(BaseModel):
    """Optional manufacturer / packaging video used only to gap-fill the manual."""
    youtube_url: Optional[str] = None
    packaging_url: Optional[str] = None  # URL printed or QRed on the box
    file: Optional[str] = None           # local copy once YouTube fetch lands
    title: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def has_locator(self) -> "VideoSource":
        if not (self.youtube_url or self.packaging_url or self.file):
            raise ValueError("video source needs youtube_url, packaging_url, or file")
        return self


class Sources(BaseModel):
    manual: ManualSource
    video: Optional[VideoSource] = None


class Part(BaseModel):
    id: str = Field(min_length=1, max_length=8)  # the manual's own letter/number
    name: str
    qty: int = Field(ge=1)
    kind: PartKind
    provenance: Provenance


# --------------------------------------------------------------------------- step-level

class PartRef(BaseModel):
    id: str
    qty: int = Field(ge=1)


class Action(BaseModel):
    verb: Verb
    object: str                      # part id being moved/handled
    target: Optional[str] = None     # part id it goes onto/into
    qty: Optional[int] = Field(default=None, ge=1)
    tool: Optional[str] = None       # part id of kind == tool
    direction: Optional[Direction] = None
    detail: str = Field(min_length=1, max_length=240)
    provenance: Optional[Provenance] = None


class Figure(BaseModel):
    page: str  # SourcePage.page
    bbox: list[float] = Field(min_length=4, max_length=4)
    highlights: list[list[float]] = Field(default_factory=list)  # optional sub-regions to ring

    @field_validator("bbox")
    @classmethod
    def bbox_normalized(cls, v: list[float]) -> list[float]:
        x0, y0, x1, y1 = v
        if not all(0.0 <= c <= 1.0 for c in v):
            raise ValueError("bbox must be normalized to [0, 1]")
        if x1 <= x0 or y1 <= y0:
            raise ValueError("bbox must have positive width and height")
        return v


class Narration(BaseModel):
    standard: str = Field(min_length=1, max_length=600)
    simple: str = Field(min_length=1, max_length=400)


class Note(BaseModel):
    text: str = Field(min_length=1, max_length=240)
    provenance: Provenance


class Choice(BaseModel):
    id: str
    label: str


class Options(BaseModel):
    prompt: str
    choices: list[Choice] = Field(min_length=2)
    default: Optional[str] = None

    @model_validator(mode="after")
    def default_is_a_choice(self) -> "Options":
        if self.default is not None and self.default not in {c.id for c in self.choices}:
            raise ValueError("options.default must match a choice id")
        return self


class ReviewNote(BaseModel):
    kind: ReviewKind = ReviewKind.uncertainty
    text: str = Field(min_length=1, max_length=400)
    manual_claim: Optional[str] = None
    video_claim: Optional[str] = None


class Step(BaseModel):
    id: str
    index: int = Field(ge=0)
    source_label: Optional[str] = None   # e.g. "Step 5" as printed
    title: str = Field(min_length=1, max_length=80)
    template: Template
    parts_used: list[PartRef] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    actions: list[Action] = Field(default_factory=list)
    figure: Optional[Figure] = None
    narration: Narration
    warnings: list[Note] = Field(default_factory=list)
    tips: list[Note] = Field(default_factory=list)
    options: Optional[Options] = None
    checkpoint: Optional[str] = Field(default=None, max_length=160)
    estimated_seconds: int = Field(ge=3, le=90)
    review_notes: list[ReviewNote] = Field(default_factory=list)

    @field_validator("review_notes", mode="before")
    @classmethod
    def coerce_review_notes(cls, v: object) -> object:
        if not isinstance(v, list):
            return v
        out = []
        for item in v:
            if isinstance(item, str):
                out.append({"kind": "uncertainty", "text": item})
            else:
                out.append(item)
        return out

    @model_validator(mode="after")
    def template_requirements(self) -> "Step":
        if self.template in (Template.figure_action, Template.options) and self.figure is None:
            raise ValueError(f"template {self.template.value} requires a figure")
        if self.template == Template.options and self.options is None:
            raise ValueError("template 'options' requires options")
        if self.template != Template.options and self.options is not None:
            raise ValueError("options only allowed on template 'options'")
        if self.template == Template.figure_action and not self.actions:
            raise ValueError("figure_action step must have at least one action")
        return self


# --------------------------------------------------------------------------- root

class Guide(BaseModel):
    schema_version: str
    guide_id: str
    title: str
    content_model: ContentModel
    product: Product
    source: Sources
    parts: list[Part]
    steps: list[Step] = Field(min_length=1)

    @field_validator("source", mode="before")
    @classmethod
    def coerce_legacy_source(cls, v: object) -> object:
        # v0.1 stored the manual fields directly on source.
        if isinstance(v, dict) and "manual" not in v and ("pages" in v or "type" in v):
            return {"manual": v}
        return v

    @model_validator(mode="after")
    def cross_checks(self) -> "Guide":
        part_ids = {p.id for p in self.parts}
        if len(part_ids) != len(self.parts):
            raise ValueError("duplicate part ids")
        parts_by_id = {p.id: p for p in self.parts}
        tool_ids = {p.id for p in self.parts if p.kind == PartKind.tool}
        page_keys = {pg.page for pg in self.source.manual.pages}

        # indices must be 0..n-1 in order (0 is the optional parts overview)
        indices = [s.index for s in self.steps]
        if indices != list(range(indices[0], indices[0] + len(indices))) or indices[0] not in (0, 1):
            raise ValueError("step indices must be contiguous and start at 0 or 1")

        step_ids = [s.id for s in self.steps]
        if len(set(step_ids)) != len(step_ids):
            raise ValueError("duplicate step ids")

        for s in self.steps:
            for ref in s.parts_used:
                if ref.id not in part_ids:
                    raise ValueError(f"{s.id}: unknown part '{ref.id}'")
                if ref.qty > parts_by_id[ref.id].qty:
                    raise ValueError(f"{s.id}: uses {ref.qty} of part '{ref.id}' but only {parts_by_id[ref.id].qty} exist")
            for t in s.tools:
                if t not in tool_ids:
                    raise ValueError(f"{s.id}: '{t}' is not a tool")
            for a in s.actions:
                for pid in (a.object, a.target, a.tool):
                    if pid is not None and pid not in part_ids:
                        raise ValueError(f"{s.id}: action references unknown part '{pid}'")
                if a.tool is not None and a.tool not in tool_ids:
                    raise ValueError(f"{s.id}: action tool '{a.tool}' is not a tool")
                if a.qty is not None and a.object in parts_by_id and a.qty > parts_by_id[a.object].qty:
                    raise ValueError(f"{s.id}: action uses {a.qty} of '{a.object}'")
            if s.figure is not None and s.figure.page not in page_keys:
                raise ValueError(f"{s.id}: figure page '{s.figure.page}' not in source pages")
        return self


if __name__ == "__main__":
    import json
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else "golden/newtral-magich-pro.json"
    with open(path) as f:
        guide = Guide.model_validate(json.load(f))
    video = " + video" if guide.source.video else ""
    print(f"OK: {guide.title} — {len(guide.steps)} steps, {len(guide.parts)} parts{video}")
