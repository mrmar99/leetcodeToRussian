class LocalStorageManager {
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.translationsKey = "leetcodeToRussianTranslations";
    this.keywordsKey = "leetcodeToRussianKeywords";
    this.translationsVersionKey = "leetcodeToRussianTranslationsVersion";
    this.keywordsVersionKey = "leetcodeToRussianKeywordsVersion";
  }

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (e) {
      console.error(e);
    }
  }

  async get(key) {
    try {
      return (await chrome.storage.local.get(key))[key];
    } catch (e) {
      console.error(e);
    }
  }

  async initOrUpdateKeywords() {
    try {
      const versionAPI = await this.fetcher.version("keywords");
      const versionLocal = await this.getKeywordsVersion();
  
      if (!versionLocal || versionLocal < versionAPI) {
        await this.setKeywords();
        await this.setKeywordsVersion(versionAPI);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async initOrUpdateTranslations() {
    try {
      let translations = await this.getTranslations();
      if (!translations) await this.set(this.translationsKey, {});
      translations = await this.getTranslations();

      const versionAPI = await this.fetcher.version("translations");
      const versionLocal = await this.getTranslationsVersion();

      if (!versionLocal || versionLocal < versionAPI) {
        const tIds = Object.keys(translations);
        if (tIds.length) {
          const fetchedTranslations = await this.fetcher.translations(tIds);
          translations = await this.setTranslations(fetchedTranslations, translations);
        }
        await this.setTranslationsVersion(versionAPI);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async setTranslations(fetchedTranslations, translations) {
    try {
      const translationsToSave = {};
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

  async getTranslations() {
    try {
      return await this.get(this.translationsKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setKeywords() {
    try {
      const keywords = await this.fetcher.keywords();
  
      const keywordsToSave = {};
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

  async getKeywords() {
    try {
      return await this.get(this.keywordsKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setTranslationsVersion(version) {
    try {
      await this.set(this.translationsVersionKey, version);
    } catch (e) {
      console.error(e);
    }
  }

  async getTranslationsVersion() {
    try {
      return await this.get(this.translationsVersionKey);
    } catch (e) {
      console.error(e);
    }
  }

  async setKeywordsVersion(version) {
    try {
      await this.set(this.keywordsVersionKey, version);
    } catch (e) {
      console.error(e);
    }
  }

  async getKeywordsVersion() {
    try {
      return await this.get(this.keywordsVersionKey);
    } catch (e) {
      console.error(e);
    }
  }
}