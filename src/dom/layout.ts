import type { LayoutConfig, LayoutStrategy, LayoutTarget, TelemetryResult } from "@/api/types";

type Op = (el: Element, arg?: string) => Element | null;

/**
 * Закрытый набор операций. Конфиг приходит с сервера как данные, поэтому исполняемого
 * кода в нём быть не может — политика Chrome Web Store запрещает remotely hosted code.
 */
const OPS: Record<string, Op> = {
  parent: (el) => el.parentElement,
  prev: (el) => el.previousElementSibling,
  next: (el) => el.nextElementSibling,
  first: (el) => el.firstElementChild,
  closest: (el, arg) => (arg ? el.closest(arg) : null),
  query: (el, arg) => (arg ? el.querySelector(arg) : null),
};

function runStrategy(strategy: LayoutStrategy): Element | null {
  try {
    let el: Element | null = document.querySelector(strategy.anchor);

    for (const { op, arg } of strategy.steps) {
      if (!el) return null;

      const run = OPS[op];

      // Незнакомая операция означает конфиг новее клиента: стратегия не сработала.
      if (!run) return null;

      el = run(el, arg);
    }

    if (!el) return null;

    // parent/prev/next выполняются всегда, поэтому без проверки стратегия может
    // «успешно» вернуть посторонний элемент и не пустить в ход запасную.
    if (strategy.expect && !el.matches(strategy.expect)) return null;

    return el;
  } catch {
    // Битый селектор в конфиге не должен ронять страницу.
    return null;
  }
}

/**
 * Поиск элементов LeetCode по конфигу с сервера. Стратегии перебираются по порядку,
 * побеждает первая сработавшая — так вёрстку можно чинить без релиза в сторе.
 */
export class Layout {
  readonly version: number;

  private targets: Partial<Record<LayoutTarget, LayoutStrategy[]>>;
  private outcomes = new Map<LayoutTarget, number>();

  constructor(config: LayoutConfig) {
    this.version = config.version;
    this.targets = config.targets;
  }

  find(target: LayoutTarget): Element | null {
    const strategies = this.targets[target] ?? [];

    for (const [index, strategy] of strategies.entries()) {
      const el = runStrategy(strategy);

      if (el) {
        this.record(target, index);

        return el;
      }
    }

    this.record(target, -1);

    return null;
  }

  /** Что уходит в телеметрию: `-1` у цели означает, что вёрстка LeetCode изменилась. */
  results(): TelemetryResult[] {
    return [...this.outcomes].map(([target, strategy]) => ({ target, strategy }));
  }

  private record(target: LayoutTarget, strategy: number) {
    const known = this.outcomes.get(target);

    // Успех вытесняет ранее записанную неудачу: цель могла появиться в DOM позже.
    if (known === undefined || (known === -1 && strategy !== -1)) {
      this.outcomes.set(target, strategy);
    }
  }
}
