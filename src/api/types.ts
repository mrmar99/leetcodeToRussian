export interface Translation {
  id: number;
  rusTitle: string;
  description: string;
}

export interface Keyword {
  id: string;
  rusName: string;
  description: string;
}

/** Термин без идентификатора: в кеше он и так ключ. */
export type KeywordEntry = Pick<Keyword, "rusName" | "description">;
