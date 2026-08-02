interface SavedImage {
  img: HTMLImageElement;
  imgPath: number[];
}

/**
 * Переносит картинки из английского описания в русское.
 *
 * Перевод приходит из API без картинок, поэтому их приходится доставать из вёрстки
 * LeetCode и вклеивать по позиции. Позиция считается индексным путём от картинки до
 * корня описания, а применяется уже к другому дереву — русскому. Работает, пока
 * структура переводного HTML совпадает с оригинальной.
 *
 * Модуль целиком удаляется, когда API начнёт отдавать описание с плейсхолдерами
 * `<img data-ltr-img="N">`: тогда достаточно сопоставить их по порядку.
 */
export function collectImages(engDescription: Element): SavedImage[] {
  const saved: SavedImage[] = [];

  for (const img of engDescription.querySelectorAll("img")) {
    const imgPath: number[] = [];

    let tmpParent = img.parentNode as Element, tmpChild: Element = img, oneChildCnt = 0;

    while (tmpParent !== engDescription) {
      const tmpChildren = tmpParent.children;

      if (tmpChildren.length === 1) {
        imgPath.push(0);
        oneChildCnt++;
      } else {
        const index = Array.from(tmpChildren).indexOf(tmpChild);

        imgPath.push(index);
      }

      tmpChild = tmpParent;
      tmpParent = tmpParent.parentNode as Element;
    }

    if (oneChildCnt === imgPath.length) {
      imgPath.length = 0;
    }

    const index = Array.from(tmpParent.children).indexOf(tmpChild);

    imgPath.push(index);

    saved.push({ img: img.cloneNode(true) as HTMLImageElement, imgPath: imgPath.reverse() });
  }

  return saved;
}

export function insertImages(rusDescription: HTMLElement, images: SavedImage[]) {
  for (const { img, imgPath } of images) {
    let parent: Element = rusDescription;

    for (let i = 0; i < imgPath.length - 1; i++) {
      parent = parent.children[imgPath[i]!]!;
    }

    const idx = imgPath.at(-1)!;

    if (parent !== rusDescription) {
      const textNodesCnt = Array.from(parent.childNodes)
        .reduce((a, e) => a + (e instanceof Text ? 1 : 0), 0);

      parent.insertBefore(img, parent.childNodes[idx + textNodesCnt - 1] ?? null);
    } else {
      parent.insertBefore(img, parent.children[idx] ?? null);
    }
  }
}
