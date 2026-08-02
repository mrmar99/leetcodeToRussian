import { sanitize } from "./sanitize";
import * as S from "./selectors";

const SHOW_DELAY = 500;
const HIDE_DELAY = 500;
/** Отступ от края окна, чтобы тултип не прилипал к границе. */
const EDGE_GAP = 11;
/** Зазор между тултипом и термином. */
const ANCHOR_GAP = 10;

/**
 * Единственный тултип на страницу: содержимое подменяется под наведённый термин.
 *
 * Раньше на каждый термин создавался свой элемент, и при каждом переключении языка
 * они создавались заново — в `#__next` накапливались сотни узлов.
 */
export class Tooltip {
  private static instance: Tooltip | null = null;

  private el: HTMLElement;
  private titleEl: HTMLElement;
  private bodyEl: HTMLElement;
  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  private constructor() {
    this.el = document.createElement("div");
    this.el.classList.add(S.TOOLTIP_CLASS);

    this.titleEl = document.createElement("div");
    this.titleEl.classList.add("tooltip-title");

    this.bodyEl = document.createElement("div");
    this.bodyEl.classList.add("tooltip-description");

    this.el.append(this.titleEl, this.bodyEl);
  }

  static get(): Tooltip {
    Tooltip.instance ??= new Tooltip();
    Tooltip.instance.attach();

    return Tooltip.instance;
  }

  /** Возвращает элемент в DOM, если его убрали при перерисовке страницы. */
  private attach() {
    if (this.el.isConnected) return;

    document.querySelector(S.APP_ROOT)?.append(this.el);
  }

  showAfterDelay(anchor: Element, title: string, html: string) {
    clearTimeout(this.hideTimer);
    clearTimeout(this.showTimer);

    this.showTimer = setTimeout(() => this.show(anchor, title, html), SHOW_DELAY);
  }

  hideAfterDelay() {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);

    this.hideTimer = setTimeout(() => this.hide(), HIDE_DELAY);
  }

  private show(anchor: Element, title: string, html: string) {
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = sanitize(html);
    this.attach();

    // Размеры считаются на скрытом элементе: `visibility: hidden` их сохраняет.
    const anchorRect = anchor.getBoundingClientRect();
    const rect = this.el.getBoundingClientRect();
    const center = anchorRect.left + anchorRect.width / 2;

    let left = center - rect.width / 2;
    let top = anchorRect.top - rect.height - ANCHOR_GAP;

    if (left < EDGE_GAP) left = EDGE_GAP;

    if (top < 0) top = anchorRect.bottom + ANCHOR_GAP;

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    this.el.style.opacity = "1";
    this.el.style.visibility = "visible";
  }

  private hide() {
    this.el.style.opacity = "0";
    this.el.style.visibility = "hidden";
  }
}
