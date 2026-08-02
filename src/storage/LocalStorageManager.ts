import { browser } from "wxt/browser";
import type { Fetcher } from "@/api/Fetcher";
import type { LayoutConfig, Translation } from "@/api/types";
import type { KeywordsMap, TranslationsMap } from "./types";

export class LocalStorageManager {
  fetcher: Fetcher;
  translationsKey = "leetcodeToRussianTranslations";
  keywordsKey = "leetcodeToRussianKeywords";
  translationsVersionKey = "leetcodeToRussianTranslationsVersion";
  keywordsVersionKey = "leetcodeToRussianKeywordsVersion";
  layoutKey = "leetcodeToRussianLayout";
  uuidKey = "leetcodeToRussianUuid";

  constructor(fetcher: Fetcher) {
    this.fetcher = fetcher;
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (e) {
      console.error(e);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return (await browser.storage.local.get(key))[key] as T | undefined;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Обновляет кеши по версиям из `/api/bootstrap` и сохраняет конфиг разметки.
   *
   * При сбое остаётся прежний кеш — это лучше, чем отсутствие перевода, — поэтому
   * наружу ошибка не выпускается.
   */
  async sync(): Promise<void> {
    try {
      const { versions, layout } = await this.fetcher.bootstrap();

      await this.set(this.layoutKey, layout);
      await this.updateKeywords(versions.keywords);
      await this.updateTranslations(versions.translations);
    } catch (e) {
      console.warn("Синхронизация с API не удалась, используется кеш", e);
    }
  }

  /** Конфиг разметки с прошлой синхронизации. `undefined` — использовать бандленный. */
  async getLayout(): Promise<LayoutConfig | undefined> {
    return this.get<LayoutConfig>(this.layoutKey);
  }

  /**
   * Отмечает визит и отдаёт идентификатор пользователя, если визит дошёл до сервера.
   *
   * `null` означает сбой: аналитика необязательна и показу перевода не мешает, но
   * предлагать перевод в этом случае нельзя — сервер не знает такого пользователя.
   */
  async reportVisit(problemId: number): Promise<string | null> {
    try {
      let uuid = await this.get<string>(this.uuidKey);

      if (!uuid) {
        uuid = window.crypto.randomUUID();
        await this.set(this.uuidKey, uuid);
      }

      await this.fetcher.visit(uuid, problemId);

      return uuid;
    } catch (e) {
      console.warn("Не удалось отправить анонимный идентификатор", e);

      return null;
    }
  }

  private async updateKeywords(versionAPI: number): Promise<void> {
    const versionLocal = await this.getKeywordsVersion();

    if (versionLocal && versionLocal >= versionAPI) return;

    await this.setKeywords();
    await this.setKeywordsVersion(versionAPI);
  }

  private async updateTranslations(versionAPI: number): Promise<void> {
    let translations = await this.getTranslations();

    if (!translations) {
      translations = {};
      await this.set(this.translationsKey, translations);
    }

    const versionLocal = await this.getTranslationsVersion();

    if (versionLocal && versionLocal >= versionAPI) return;

    const tIds = Object.keys(translations);

    if (tIds.length) {
      const fetchedTranslations = await this.fetcher.translations(tIds);

      await this.setTranslations(fetchedTranslations, translations);
    }

    await this.setTranslationsVersion(versionAPI);
  }

  async setTranslations(
    fetchedTranslations: Translation[],
    translations: TranslationsMap
  ): Promise<TranslationsMap | undefined> {
    try {
      const translationsToSave: TranslationsMap = {};

      for (const t of fetchedTranslations) {
        translationsToSave[t.id] = t;
      }

      translations = { ...translations, ...translationsToSave };
      await this.set(this.translationsKey, translations);

      return translations;
    } catch (e) {
      console.error(e);
    }
  }

  async getTranslations(): Promise<TranslationsMap | undefined> {
    try {
      return await this.get<TranslationsMap>(this.translationsKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setKeywords(): Promise<void> {
    const keywords = await this.fetcher.keywords();
    const keywordsToSave: KeywordsMap = {};

    for (const k of keywords) {
      const { id, rusName, description } = k;

      keywordsToSave[id] = { rusName, description };
    }

    await this.set(this.keywordsKey, keywordsToSave);
  }

  async getKeywords(): Promise<KeywordsMap | undefined> {
    try {
      return await this.get<KeywordsMap>(this.keywordsKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setTranslationsVersion(version: number): Promise<void> {
    await this.set(this.translationsVersionKey, version);
  }

  async getTranslationsVersion(): Promise<number | undefined> {
    return this.get<number>(this.translationsVersionKey);
  }

  async setKeywordsVersion(version: number): Promise<void> {
    await this.set(this.keywordsVersionKey, version);
  }

  async getKeywordsVersion(): Promise<number | undefined> {
    return this.get<number>(this.keywordsVersionKey);
  }
}
