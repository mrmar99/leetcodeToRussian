import { Fetcher } from "@/api/Fetcher";
import { LocalStorageManager } from "@/storage/LocalStorageManager";
import type { KeywordsMap } from "@/storage/types";
import { Tooltip } from "./Tooltip";
import { sanitize } from "./sanitize";
import * as S from "./selectors";

interface SavedImage {
  img: HTMLImageElement;
  imgPath: number[];
}

export class UIEditor {
  LSM: LocalStorageManager;
  isRussianSaved = false;
  isRussian = false;
  rusTitle!: string;
  rusDescription!: HTMLElement;
  engTitle!: HTMLElement;
  engDescription!: HTMLElement;
  descriptionImages!: SavedImage[];
  localKeywords: KeywordsMap = {};
  /** Контейнер описания, на который уже повешены обработчики тултипов. */
  tooltipHost: HTMLElement | null = null;
  /** Узел описания, на который встал перевод. React подменяет его при перерисовке. */
  mountedDescription: Element | null = null;
  toggler: HTMLElement | null = null;

  constructor() {
    this.LSM = new LocalStorageManager(new Fetcher());
  }

  /**
   * Снимает всё, что расширение добавило на страницу. Вызывается перед перерисовкой
   * после клиентской навигации, иначе тумблеры и тултипы копятся.
   */
  static removeInjectedUI() {
    const injected = document.querySelectorAll(
      `.${S.TOGGLER_CLASS}, .${S.TOOLTIP_CLASS}, .${S.TRANSLATIONS_BTN_CLASS}`
    );

    for (const el of injected) {
      el.remove();
    }
  }

  /**
   * Стоят ли правки расширения на текущем DOM. Становится `false`, когда React
   * пересоздаёт описание — например, при возврате с вкладки решений.
   */
  isMounted(): boolean {
    return (
      this.mountedDescription !== null &&
      this.mountedDescription === document.querySelector(S.DESCRIPTION) &&
      this.toggler !== null &&
      this.toggler.isConnected
    );
  }

  initProblemPage(rusTitle: string, rusDescription: string) {
    if (arguments.length < 2)
      throw new Error("Необходимо передать все аргументы");

    this.isRussianSaved = false;
    this.isRussian = false;

    this.rusTitle = rusTitle;
    this.rusDescription = document.createElement("div");
    this.rusDescription.innerHTML = sanitize(rusDescription);

    this.engTitle = document.querySelector(S.TITLE) as HTMLElement;
    this.engDescription = document.querySelector(S.DESCRIPTION) as HTMLElement;
    this.mountedDescription = this.engDescription;

    this.saveImages();
  }

  initProblemsetPage(topicBtnsEl: Element) {
    const a = document.createElement("a");

    a.href = "https://leetcode-to-russian-api.vercel.app/infopage/";
    a.target = "_blank";
    a.className = `relative ${S.TRANSLATIONS_BTN_CLASS}`;

    const div = document.createElement("div");

    div.className = "flex items-center space-x-2 whitespace-nowrap rounded-full px-4 py-[10px] pointer-event-none text-base leading-tight shadow-level2 dark:shadow-dark-level2";
    div.textContent = "Переводы";
    a.append(div);
    topicBtnsEl.insertAdjacentElement("afterbegin", a);
  }

  async setToggler() {
    const bar = (
      document.querySelector(S.DESCRIPTION)!.parentNode!.parentNode as Element
    ).previousElementSibling!;

    // При перемонтировании старый тумблер удаляется, чтобы не появился второй.
    bar.querySelector(`.${S.TOGGLER_CLASS}`)?.remove();

    const toggler = document.createElement("div");

    toggler.className = `${S.TOGGLER_CLASS} relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full`;
    toggler.textContent = "EN | RU";
    this.setTogglerState(toggler);
    bar.append(toggler);

    toggler.addEventListener("click", async () => {
      if (this.isRussian) {
        this.setEng();
      } else {
        await this.setRus();
      }

      this.setTogglerState(toggler);
    });

    this.toggler = toggler;
  }

  setTogglerState(toggler: HTMLElement) {
    toggler.classList.toggle(`${S.TOGGLER_CLASS}__active-RU`, this.isRussian);
    toggler.classList.toggle(`${S.TOGGLER_CLASS}__active-EN`, !this.isRussian);
  }

  saveImages() {
    this.descriptionImages = [];

    const imgs = this.engDescription.querySelectorAll("img");

    for (const img of imgs) {
      const imgPath: number[] = [];

      let tmpParent = img.parentNode as Element, tmpChild: Element = img, oneChildCnt = 0;

      while (tmpParent !== this.engDescription) {
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

      this.descriptionImages.push({ img: img.cloneNode(true) as HTMLImageElement, imgPath: imgPath.reverse() });
    }
  }

  async loadKeywords() {
    try {
      this.localKeywords = (await this.LSM.getKeywords()) ?? {};
    } catch (e) {
      console.error(e);
    }
  }

  async setRus() {
    try {
      await this.loadKeywords();

      if (this.isRussianSaved) {
        const currTitle = document.querySelector(S.TITLE) as HTMLElement;
        const currDescription = document.querySelector(S.DESCRIPTION) as HTMLElement;

        currTitle.textContent = this.rusTitle;
        currDescription.innerHTML = this.rusDescription.innerHTML;
        this.attachKeywordTooltips(currDescription);
      } else {
        this.changeTitle();
        this.changeDescription();
      }

      this.isRussian = true;
    } catch (e) {
      console.error(e);
    }
  }

  setEng() {
    const currTitle = document.querySelector(S.TITLE) as HTMLElement;
    const currDescription = document.querySelector(S.DESCRIPTION) as HTMLElement;

    currTitle.textContent = this.engTitle.textContent;
    this.rusDescription = this.rusDescription.cloneNode(true) as HTMLElement;
    currDescription.innerHTML = this.engDescription.innerHTML;
    this.isRussian = false;
  }

  changeTitle() {
    const title = this.engTitle.cloneNode(true) as HTMLElement;
    const oldText = this.engTitle.textContent!;

    this.engTitle.textContent = oldText.split(" ")[0] + " " + this.rusTitle;
    this.rusTitle = this.engTitle.textContent;
    this.engTitle = title;
  }

  changeDescription() {
    const nonBlockTags = new Set(["STRONG", "EM", "B", "I", "U"]);
    const currKeywords = this.engDescription.querySelectorAll("[data-keyword]");

    for (const currK of currKeywords) {
      let textEl: Node = currK;

      while (!(textEl instanceof Text) && !nonBlockTags.has((textEl as Element).tagName)) {
        textEl = textEl.childNodes[0]!;
      }

      currK.replaceWith(textEl);
    }

    for (const descriptionImage of this.descriptionImages) {
      const { img, imgPath } = descriptionImage;

      let parent: Element = this.rusDescription;

      for (let i = 0; i < imgPath.length - 1; i++) {
        parent = parent.children[imgPath[i]!]!;
      }

      const idx = imgPath.at(-1)!;

      if (parent !== this.rusDescription) {
        const textNodesCnt = Array.from(parent.childNodes)
          .reduce((a, e) => a + (e instanceof Text ? 1 : 0), 0);

        parent.insertBefore(img, parent.childNodes[idx + textNodesCnt - 1] ?? null);
      } else {
        parent.insertBefore(img, parent.children[idx] ?? null);
      }
    }

    const description = this.engDescription.cloneNode(true) as HTMLElement;

    this.engDescription.innerHTML = this.rusDescription.innerHTML;
    this.rusDescription = this.engDescription;
    this.attachKeywordTooltips(this.rusDescription);
    this.engDescription = description;

    this.isRussianSaved = true;
  }

  /**
   * Вешает на контейнер описания одну пару делегированных обработчиков вместо двух
   * на каждый термин. Контейнер переживает смену языка, поэтому подписка нужна один раз.
   */
  attachKeywordTooltips(descriptionContainer: HTMLElement) {
    if (this.tooltipHost === descriptionContainer) return;

    this.tooltipHost = descriptionContainer;

    descriptionContainer.addEventListener("pointerover", (event) => {
      const keyword = keywordUnderPointer(event);

      if (!keyword) return;

      const k = this.localKeywords[keyword.dataset.keyword!];

      if (!k) return;

      Tooltip.get().showAfterDelay(keyword, k.rusName, k.description);
    });

    descriptionContainer.addEventListener("pointerout", (event) => {
      if (!keywordUnderPointer(event)) return;

      Tooltip.get().hideAfterDelay();
    });
  }
}

/**
 * Термин, в который курсор вошёл или из которого вышел. Перемещения внутри одного
 * термина отсекаются: `pointerover`/`pointerout` всплывают и от вложенных узлов.
 */
function keywordUnderPointer(event: PointerEvent): HTMLElement | null {
  const target = event.target as Element | null;
  const keyword = target?.closest<HTMLElement>("[data-keyword]");

  if (!keyword) return null;

  const related = event.relatedTarget as Node | null;

  if (related && keyword.contains(related)) return null;

  return keyword;
}
