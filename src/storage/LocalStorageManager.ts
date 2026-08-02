import { browser } from "wxt/browser";
import type { Fetcher } from "@/api/Fetcher";
import type { Translation } from "@/api/types";
import type { KeywordsMap, TranslationsMap } from "./types";

export class LocalStorageManager {
  fetcher: Fetcher;
  translationsKey = "leetcodeToRussianTranslations";
  keywordsKey = "leetcodeToRussianKeywords";
  translationsVersionKey = "leetcodeToRussianTranslationsVersion";
  keywordsVersionKey = "leetcodeToRussianKeywordsVersion";
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

  /** Сбой отправки не должен мешать показу перевода: аналитика необязательна. */
  async setAnonymousUserId(problemId: number): Promise<void> {
    try {
      let uuid = await this.get<string>(this.uuidKey);

      if (!uuid) {
        uuid = window.crypto.randomUUID();
        await this.set(this.uuidKey, uuid);
      }

      await this.fetcher.anonymousUser(uuid, problemId);
    } catch (e) {
      console.warn("Не удалось отправить анонимный идентификатор", e);
    }
  }

  /** При сбое обновления остаётся прежний кеш — это лучше, чем отсутствие перевода. */
  async initOrUpdateKeywords(): Promise<void> {
    try {
      const versionAPI = await this.fetcher.version("keywords");
      const versionLocal = await this.getKeywordsVersion();

      if (!versionLocal || versionLocal < versionAPI) {
        await this.setKeywords();
        await this.setKeywordsVersion(versionAPI);
      }
    } catch (e) {
      console.warn("Термины не обновлены, используется кеш", e);
    }
  }

  /** При сбое обновления остаётся прежний кеш — это лучше, чем отсутствие перевода. */
  async initOrUpdateTranslations(): Promise<void> {
    try {
      let translations = await this.getTranslations();

      if (!translations) {
        translations = {};
        await this.set(this.translationsKey, translations);
      }

      const versionAPI = await this.fetcher.version("translations");
      const versionLocal = await this.getTranslationsVersion();

      if (!versionLocal || versionLocal < versionAPI) {
        const tIds = Object.keys(translations);

        if (tIds.length) {
          const fetchedTranslations = await this.fetcher.translations(tIds);

          await this.setTranslations(fetchedTranslations, translations);
        }

        await this.setTranslationsVersion(versionAPI);
      }
    } catch (e) {
      console.warn("Переводы не обновлены, используется кеш", e);
    }
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
      console.log(`Переводы обновлены и сохранены в локальное хранилище`);

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
    try {
      const keywords = await this.fetcher.keywords();

      const keywordsToSave: KeywordsMap = {};

      for (const k of keywords) {
        const { id, rusName, description } = k;

        keywordsToSave[id] = { rusName, description };
      }

      await this.set(this.keywordsKey, keywordsToSave);
      console.log("Термины обновлены и сохранены в локальное хранилище");
    } catch (e) {
      console.error(e);
    }
  }

  async getKeywords(): Promise<KeywordsMap | undefined> {
    try {
      return await this.get<KeywordsMap>(this.keywordsKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setTranslationsVersion(version: number | undefined): Promise<void> {
    try {
      await this.set(this.translationsVersionKey, version);
    } catch (e) {
      console.error(e);
    }
  }

  async getTranslationsVersion(): Promise<number | undefined> {
    try {
      return await this.get<number>(this.translationsVersionKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setKeywordsVersion(version: number | undefined): Promise<void> {
    try {
      await this.set(this.keywordsVersionKey, version);
    } catch (e) {
      console.error(e);
    }
  }

  async getKeywordsVersion(): Promise<number | undefined> {
    try {
      return await this.get<number>(this.keywordsVersionKey);
    } catch (e) {
      console.error(e);
    }
  }
}
