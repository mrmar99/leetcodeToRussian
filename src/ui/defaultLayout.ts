import type { LayoutConfig } from "@/api/types";

/**
 * Копия конфига разметки на момент сборки. Используется, пока с сервера не пришёл
 * свежий, и остаётся единственным вариантом, если API недоступен.
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
  version: 1,
  targets: {
    togglerBar: [
      {
        anchor: '[data-track-load="description_content"]',
        steps: [{ op: "parent" }, { op: "parent" }, { op: "prev" }],
      },
      {
        anchor: '[data-track-load="description_content"]',
        steps: [
          { op: "closest", arg: ".flexlayout__tab" },
          { op: "query", arg: ".flexlayout__tab_toolbar" },
        ],
      },
    ],
    title: [{ anchor: ".text-title-large", steps: [] }],
    description: [{ anchor: '[data-track-load="description_content"]', steps: [] }],
    problemsetTopicBar: [
      { anchor: 'a[href="/problemset/all-code-essentials"]', steps: [{ op: "parent" }] },
    ],
    suggestBar: [
      {
        anchor: '[data-track-load="description_content"]',
        steps: [{ op: "parent" }, { op: "parent" }, { op: "prev" }],
      },
      { anchor: ".text-title-large", steps: [{ op: "parent" }] },
    ],
  },
};
