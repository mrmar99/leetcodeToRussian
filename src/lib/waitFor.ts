export interface WaitForOptions {
  /** Сколько ждать результата, мс. */
  timeout?: number;
  /** Поддерево, за которым идёт наблюдение. */
  root?: Node;
  /** Досрочная отмена ожидания — например, при уходе на другую страницу. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT = 8000;

/**
 * Ждёт, пока `probe` вернёт непустой результат: проверяет сразу и затем на каждое
 * изменение DOM. Отдаёт `null`, если за `timeout` мс ничего не появилось или
 * ожидание отменено через `signal`.
 *
 * LeetCode рендерит страницу асинхронно, поэтому нужных узлов может не быть в момент
 * запуска content script.
 */
export function waitFor<T>(
  probe: () => T | null | undefined,
  { timeout = DEFAULT_TIMEOUT, root = document.documentElement, signal }: WaitForOptions = {}
): Promise<T | null> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null);

      return;
    }

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

    function onAbort() {
      stop();
      resolve(null);
    }

    function stop() {
      observer.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    signal?.addEventListener("abort", onAbort);
    observer.observe(root, { childList: true, subtree: true });
  });
}
