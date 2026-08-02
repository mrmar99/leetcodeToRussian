export interface Translation {
  id: number;
  rusTitle: string;
  description: string;
  /** Проставлен ли записи разбор картинок. У всех записей в базе `true`. */
  imagesChecked?: boolean;
}

export interface Keyword {
  id: string;
  rusName: string;
  description: string;
}

/** Термин без идентификатора: в кеше он и так ключ. */
export type KeywordEntry = Pick<Keyword, "rusName" | "description">;

/** Элементы страницы, которые расширение ищет через конфиг разметки. */
export type LayoutTarget =
  | "togglerBar"
  | "title"
  | "description"
  | "problemsetTopicBar"
  | "suggestBar";

/** Шаг перехода по дереву. Набор операций закрыт, исполняемого кода в конфиге нет. */
export interface LayoutStep {
  op: string;
  arg?: string;
}

export interface LayoutStrategy {
  anchor: string;
  steps: LayoutStep[];
  /** Если задан, найденный элемент обязан ему соответствовать, иначе стратегия не сработала. */
  expect?: string;
}

export interface LayoutConfig {
  version: number;
  targets: Partial<Record<LayoutTarget, LayoutStrategy[]>>;
}

export interface Bootstrap {
  versions: { translations: number; keywords: number };
  layout: LayoutConfig;
}

/** `strategy` — индекс сработавшей стратегии, `-1` означает, что не сработала ни одна. */
export interface TelemetryResult {
  target: LayoutTarget;
  strategy: number;
}
