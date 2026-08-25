import { describe, expect, it } from "vitest";

import {
  isTimelineEndEditable,
  isTimelineMoveEditable,
  isTimelineStartEditable,
} from "@/utils/programmeTimeline";

describe("shared programme timeline editability", () => {
  it("retains the legacy isEditable fallback for Reporting rows", () => {
    const item = { id: "reporting", rowLabel: "Reporting", isEditable: true, startDate: "2026-01-01", endDate: "2026-01-02" };
    expect(isTimelineStartEditable(item)).toBe(true);
    expect(isTimelineEndEditable(item)).toBe(true);
    expect(isTimelineMoveEditable(item)).toBe(true);
  });

  it("honours Target field-level editability", () => {
    const item = { id: "target", rowLabel: "Target", isEditable: true, isStartEditable: false, isEndEditable: true, isMoveEditable: false, startDate: "2026-01-01", endDate: "2026-01-02" };
    expect(isTimelineStartEditable(item)).toBe(false);
    expect(isTimelineEndEditable(item)).toBe(true);
    expect(isTimelineMoveEditable(item)).toBe(false);
  });
});
