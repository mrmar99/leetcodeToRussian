export interface ObserveDomOptions {
  /** Поддерево, за которым идёт наблюдение. */
  root?: Node;
  /** Отписка по сигналу. */
  signal?: AbortSignal;
}

/**
 * Зовёт `handler` на каждое изменение DOM. Возвращает функцию отписки.
 *
 * LeetCode — SPA на React: перерисовка сносит вставленные элементы, а содержимое
 * описания заменяет обратно на английское.
 */
export function observeDom(
  handler: () => void,
  { root = document, signal }: ObserveDomOptions = {}
): () => void {
  const observer = new MutationObserver(handler);

  function stop() {
    observer.disconnect();
    signal?.removeEventListener("abort", stop);
  }

  if (signal?.aborted) return stop;

  observer.observe(root, { childList: true, subtree: true });
  signal?.addEventListener("abort", stop);

  return stop;
}
