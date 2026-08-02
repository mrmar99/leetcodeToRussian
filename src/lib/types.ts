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

export type KeywordEntry = Pick<Keyword, "rusName" | "description">;

export type TranslationsMap = Record<string, Translation>;

export type KeywordsMap = Record<string, KeywordEntry>;
