/**
 * Подставляет в плейсхолдеры перевода картинки из вёрстки LeetCode.
 *
 * Перевод приходит без картинок — вместо них стоят `<img data-ltr-img="N">`, где N —
 * порядковый номер картинки в английском оригинале. Реальный `src` берётся из текущей
 * вёрстки, поэтому смена адресов на CDN LeetCode переводы не ломает.
 */
export function fillImagePlaceholders(rusDescription: HTMLElement, engDescription: Element) {
  const originals = engDescription.querySelectorAll("img");
  const placeholders = rusDescription.querySelectorAll<HTMLImageElement>("img[data-ltr-img]");

  for (const placeholder of placeholders) {
    const original = originals[Number(placeholder.dataset.ltrImg)];

    if (!original) {
      placeholder.remove();

      continue;
    }

    placeholder.replaceWith(original.cloneNode(true));
  }
}
