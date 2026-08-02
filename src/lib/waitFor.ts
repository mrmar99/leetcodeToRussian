export interface WaitForOptions {
  /** Сколько ждать результата, мс. */
  timeout?: number;
  /** Поддерево, за которым следим. */
  root?: Node;
}

const DEFAULT_TIMEOUT = 8000;

/**
 * Ждёт, пока `probe` вернёт непустой результат: проверяет сразу и затем на каждое
 * изменение DOM. Отдаёт `null`, если за `timeout` мс ничего не появилось.
 *
 * LeetCode рендерит страницу асинхронно, поэтому нужных узлов может не быть в момент
 * запуска content script.
 */
export function waitFor<T>(
  probe: () => T | null | undefined,
  { timeout = DEFAULT_TIMEOUT, root = document.documentElement }: WaitForOptions = {}
): Promise<T | null> {
  return new Promise((resolve) => {
    const immediate = probe();

    if (immediate) {
      resolve(immediate);

      return;
    }

    const observer = new MutationObserver(() => {
      const found = probe();

      if (found) {
        stop();
        resolve(found);
      }
    });

    const timer = setTimeout(() => {
      stop();
      resolve(null);
    }, timeout);

    function stop() {
      observer.disconnect();
      clearTimeout(timer);
    }

    observer.observe(root, { childList: true, subtree: true });
  });
}
