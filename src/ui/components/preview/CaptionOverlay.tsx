import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { withStylePatch } from "../../../application/editing";
import { CAPTION_DRAG_LIMITS } from "../../../config/constants";
import {
  captionWidth,
  clamp,
  clampStyleValue,
  REFERENCE_HEIGHT,
  STYLE_LIMITS,
  type Block,
  type Style,
  type Word,
} from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { minimumCaptionWidth } from "../../captionMetrics";

type Props = {
  block: Block;
  style: Style;
  words: Word[];
  time: number;
  selected: boolean;
  stage: RefObject<HTMLDivElement | null>;
  frame: { width: number; height: number };
};

type Side = -1 | 1;
const SIDES: readonly Side[] = [-1, 1];

/** Converts a value expressed for the reference height into container units. */
const cqh = (value: number) => `${(value / REFERENCE_HEIGHT) * 100}cqh`;

/** Attaches move/up/cancel listeners to a captured pointer. */
function trackPointer(
  node: HTMLElement,
  e: ReactPointerEvent,
  onMove: (ev: PointerEvent) => void,
  onFinish: (ev: PointerEvent) => void,
) {
  node.setPointerCapture(e.pointerId);
  const finish = (ev: PointerEvent) => {
    node.removeEventListener("pointermove", onMove);
    node.removeEventListener("pointerup", finish);
    node.removeEventListener("pointercancel", finish);
    onFinish(ev);
  };
  node.addEventListener("pointermove", onMove);
  node.addEventListener("pointerup", finish);
  node.addEventListener("pointercancel", finish);
}

/**
 * Invisible, draggable box that mirrors the rendered caption so the user can
 * move it and resize its width or font size directly on the video. The CSS
 * text is transparent; libass draws the real subtitles underneath.
 */
export function CaptionOverlay({
  block,
  style,
  words,
  time,
  selected,
  stage,
  frame,
}: Props) {
  const { t } = useTranslation();
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const setDragPreview = useEditorStore((s) => s.setDragPreview);
  const commit = useProjectStore((s) => s.commit);

  const dragCaption = (e: ReactPointerEvent) => {
    if (!stage.current) return;
    selectBlock(block.id);
    const project = currentProject();
    const rect = stage.current.getBoundingClientRect();
    const original = block.override ?? project.style;
    const startX = e.clientX;
    const startY = e.clientY;
    const node = e.currentTarget as HTMLElement;
    let x = original.x;
    let y = original.y;
    const patched = () => withStylePatch(project, block, { x, y });
    trackPointer(
      node,
      e,
      (ev) => {
        x = clamp(
          original.x + ((ev.clientX - startX) / rect.width) * 100,
          CAPTION_DRAG_LIMITS.min,
          CAPTION_DRAG_LIMITS.max,
        );
        y = clamp(
          original.y + ((ev.clientY - startY) / rect.height) * 100,
          CAPTION_DRAG_LIMITS.min,
          CAPTION_DRAG_LIMITS.max,
        );
        node.style.left = x + "%";
        node.style.top = y + "%";
        setDragPreview(patched());
      },
      () => {
        setDragPreview(null);
        commit(patched());
      },
    );
  };

  const resizeCaption = (
    e: ReactPointerEvent,
    mode: "size" | "width",
    horizontal: number,
    vertical = 1,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stage.current) return;
    selectBlock(block.id);
    const project = currentProject();
    const original = block.override ?? project.style;
    const node = e.currentTarget as HTMLElement;
    const box = node.parentElement!.getBoundingClientRect();
    const stageWidth = stage.current.getBoundingClientRect().width;
    const startX = e.clientX;
    const startY = e.clientY;
    let next = project;
    trackPointer(
      node,
      e,
      (ev) => {
        const dx = (ev.clientX - startX) * horizontal;
        const dy = (ev.clientY - startY) * vertical;
        let patch: Partial<Style>;
        if (mode === "size") {
          const factor = Math.max(
            0.1,
            1 +
              (2 * (dx * box.width + dy * box.height)) /
                (box.width ** 2 + box.height ** 2),
          );
          const size = clampStyleValue("size", original.size * factor);
          patch = {
            size,
            width: Math.max(
              minimumCaptionWidth(project, { ...original, size }, block, frame),
              Math.min(
                STYLE_LIMITS.width.max,
                (captionWidth(original) * size) / original.size,
              ),
            ),
          };
        } else {
          patch = {
            width: Math.max(
              minimumCaptionWidth(project, original, block, frame),
              Math.min(
                STYLE_LIMITS.width.max,
                captionWidth(original) + (200 * dx) / stageWidth,
              ),
            ),
          };
        }
        next = withStylePatch(project, block, patch);
        setDragPreview(next);
      },
      (ev) => {
        setDragPreview(null);
        if (ev.type !== "pointercancel") commit(next);
      },
    );
  };

  const cssStyle = {
    width: captionWidth(style) + "%",
    left: style.x + "%",
    top: style.y + "%",
    fontFamily: style.font,
    fontSize: cqh(style.size),
    color: style.color,
    opacity: style.opacity / 100,
    WebkitTextStroke: `${cqh(style.outline)} #101010`,
    textShadow: `0 ${cqh(style.shadow)} ${cqh(style.shadow)} #0009`,
  } as CSSProperties;

  const isWordVisible = (w: Word) =>
    style.animation !== "word" || (time >= w.start && time < w.end);
  const isWordRevealed = (w: Word) =>
    !(style.animation === "progressive" && time < w.start);

  return (
    <div
      onPointerDown={dragCaption}
      className={`caption caption-hitbox ${selected ? "caption-selected" : ""}`}
      style={cssStyle}
    >
      {SIDES.map((side) => (
        <button
          key={`side-${side}`}
          className={`caption-handle caption-side ${side < 0 ? "left" : "right"}`}
          aria-label={
            side < 0
              ? t("preview.resizeFromLeft")
              : t("preview.resizeFromRight")
          }
          onPointerDown={(e) => resizeCaption(e, "width", side)}
        />
      ))}
      {SIDES.flatMap((x) =>
        SIDES.map((y) => (
          <button
            key={`${x}-${y}`}
            className={`caption-handle caption-corner ${x < 0 ? "left" : "right"} ${y < 0 ? "top" : "bottom"}`}
            aria-label={t("preview.scaleFromCorner")}
            onPointerDown={(e) => resizeCaption(e, "size", x, y)}
          />
        )),
      )}
      {words.filter(isWordVisible).map((w) => (
        <span
          key={w.id}
          style={{ visibility: isWordRevealed(w) ? "visible" : "hidden" }}
        >
          {w.text}{" "}
        </span>
      ))}
    </div>
  );
}
