import { observeDom } from "./observeDom";

/**
 * Зовёт `handler` при каждой смене URL, включая клиентскую навигацию LeetCode.
 *
 * Патч `history.pushState` тут не работает: страница вызывает его в main world, а
 * content script живёт в изолированном, и подмена туда не видна. Поэтому сигналом
 * служит перерисовка DOM — она сопровождает любой SPA-переход.
 *
 * Возвращает функцию отписки.
 */
export function onLocationChange(handler: () => void): () => void {
  let last = location.href;

  function check() {
    if (location.href === last) return;

    last = location.href;
    handler();
  }

  const stopObserving = observeDom(check);

  window.addEventListener("popstate", check);
  window.addEventListener("hashchange", check);

  return () => {
    stopObserving();
    window.removeEventListener("popstate", check);
    window.removeEventListener("hashchange", check);
  };
}
