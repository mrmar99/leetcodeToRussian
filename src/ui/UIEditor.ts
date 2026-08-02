import type { Layout } from "@/dom/layout";
import type { KeywordsMap } from "@/storage/types";
import { Tooltip } from "./Tooltip";
import { fillImagePlaceholders } from "./images";
import { sanitize } from "./sanitize";
import * as S from "./selectors";

export type Lang = "en" | "ru";

/** Заголовок и описание задачи на одном языке. */
interface Snapshot {
  title: string;
  html: string;
}

export class UIEditor {
  lang: Lang = "en";
  localKeywords: KeywordsMap;
  /** Контейнер описания, на который уже повешены обработчики тултипов. */
  tooltipHost: HTMLElement | null = null;
  /** Узел описания, на который встал перевод. React подменяет его при перерисовке. */
  mountedDescription: Element | null = null;
  toggler: HTMLElement | null = null;

  private titleEl!: HTMLElement;
  private descriptionEl!: HTMLElement;
  private snapshots!: Record<Lang, Snapshot>;

  constructor(private layout: Layout, keywords: KeywordsMap) {
    this.localKeywords = keywords;
  }

  /**
   * Снимает всё, что расширение добавило на страницу. Вызывается перед перерисовкой
   * после клиентской навигации, иначе тумблеры и тултипы копятся.
   */
  static removeInjectedUI() {
    const injected = document.querySelectorAll(
      `.${S.TOGGLER_CLASS}, .${S.TOOLTIP_CLASS}, .${S.TRANSLATIONS_BTN_CLASS}, .${S.SUGGEST_BTN_CLASS}`
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
      this.mountedDescription === this.layout.find("description") &&
      this.toggler !== null &&
      this.toggler.isConnected
    );
  }

  /**
   * Снимает с текущей страницы английский вариант и готовит русский. Оба остаются
   * неизменяемыми строками, так что переключение языка — это переустановка одной из них.
   */
  initProblemPage(rusTitle: string, rusHtml: string) {
    this.titleEl = this.layout.find("title") as HTMLElement;
    this.descriptionEl = this.layout.find("description") as HTMLElement;
    this.mountedDescription = this.descriptionEl;

    const engTitle = this.titleEl.textContent ?? "";
    const rusDescription = document.createElement("div");

    rusDescription.innerHTML = sanitize(rusHtml);
    fillImagePlaceholders(rusDescription, this.descriptionEl);

    this.snapshots = {
      en: { title: engTitle, html: this.descriptionEl.innerHTML },
      // Номер задачи есть только в английском заголовке, в переводе его нет.
      ru: { title: `${engTitle.split(" ")[0]} ${rusTitle}`, html: rusDescription.innerHTML },
    };
  }

  /** Ставит на страницу нужный язык. Вызывать можно сколько угодно раз. */
  render(lang: Lang) {
    const snapshot = this.snapshots[lang];

    this.titleEl.textContent = snapshot.title;
    this.descriptionEl.innerHTML = snapshot.html;
    this.lang = lang;

    if (lang === "ru") this.attachKeywordTooltips(this.descriptionEl);
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

  setToggler() {
    const bar = this.layout.find("togglerBar");

    if (!bar) throw new Error("Панель для тумблера не найдена");

    // При перемонтировании старый тумблер удаляется, чтобы не появился второй.
    bar.querySelector(`.${S.TOGGLER_CLASS}`)?.remove();

    const toggler = document.createElement("div");

    toggler.className = `${S.TOGGLER_CLASS} relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full`;
    toggler.textContent = "EN | RU";
    this.paintToggler(toggler);
    bar.append(toggler);

    toggler.addEventListener("click", () => {
      this.render(this.lang === "ru" ? "en" : "ru");
      this.paintToggler(toggler);
    });

    this.toggler = toggler;
  }

  private paintToggler(toggler: HTMLElement) {
    toggler.classList.toggle(`${S.TOGGLER_CLASS}__active-RU`, this.lang === "ru");
    toggler.classList.toggle(`${S.TOGGLER_CLASS}__active-EN`, this.lang !== "ru");
  }

  /**
   * Вешает на контейнер описания одну пару делегированных обработчиков вместо двух
   * на каждый термин. Контейнер переживает смену языка, поэтому подписка нужна один раз.
   */
  private attachKeywordTooltips(descriptionContainer: HTMLElement) {
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
  const keyword = target?.closest<HTMLElement>(S.KEYWORD);

  if (!keyword) return null;

  const related = event.relatedTarget as Node | null;

  if (related && keyword.contains(related)) return null;

  return keyword;
}
