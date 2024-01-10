const baseUrl = "https://leetcode.com/problems/";
let lastProblem = "";
let newProblem = "";

const delay = 100;
const maxTime = 8000;
const maxTries = maxTime / delay;
let triesCnt = 0;

const loadEventDispatcher = ({ target }) => {
  newProblem = target.location.href.slice(baseUrl.length).split("/")[0];
  if (lastProblem.startsWith(baseUrl) && lastProblem.length && lastProblem !== newProblem) {
    window.location.href = baseUrl + newProblem;
    window.dispatchEvent(new Event("load"));
  }
};
window.addEventListener("locationchange", loadEventDispatcher);

window.addEventListener("load", function f() {
  console.log("TRY")
  const isReady = document.querySelector('[data-track-load="description_content"]') && document.querySelector(".text-title-large");
  if (isReady) {
    triesCnt = 0;
    main();
  } else if (triesCnt <= maxTries) {
    triesCnt++;
    setTimeout(() => window.dispatchEvent(new Event("load")), delay);
  } else {
    triesCnt = 0;
    showAuthRequiredOrOldVersion();
  }
});

async function main() {
  try {
    const title = document.querySelector(".text-title-large");
    lastProblem = window.location.href.slice(baseUrl.length).split("/")[0];

    const fetcher = new Fetcher();
    const LSM = new LocalStorageManager(fetcher);
    await LSM.initTranslationsIfNotExists();
    await LSM.initOrUpdateKeywords();

    const id = parseInt(title.textContent);
    await LSM.updateTranslations(id);
    const translations = await LSM.getTranslations();
    
    const t = translations[id];

    if (t) {
      const { rusTitle, description } = t;
      const ui = new UIEditor(rusTitle, description.replace(/\\n/g, "\n"));
      await ui.setRus();
      await ui.setToggler();
    } else {
      showNotFoundError();
    }
  } catch (e) {
    console.error(e);
  }
}

function showAuthRequiredOrOldVersion() {
  const body = document.querySelector("body");
  const authOrOldElement = document.createElement("div");
  authOrOldElement.classList.add("auth-or-old-element");
  authOrOldElement.innerHTML = "<p>Не удается загрузить перевод. Это могло случиться по 3 причинам:</p><ol><li>Вы заходите со старого интерфейса;</li><li>Вы не авторизованы;</li><li>Превышено максимальное количество попыток поиска элементов для рендеринга.</li></ol>";
  body.append(authOrOldElement);
  authOrOldElement.addEventListener("click", () => authOrOldElement.remove());
  setTimeout(() => {
    authOrOldElement.style.opacity = "0";
    authOrOldElement.remove();
  }, 15000);
}

function showNotFoundError() {
  const body = document.querySelector("body");
  const errorElement = document.createElement("div");
  errorElement.classList.add("error-element");
  errorElement.textContent = "Эта задача еще не переведена";
  body.append(errorElement);
  errorElement.addEventListener("click", () => errorElement.remove());
  setTimeout(() => {
    errorElement.style.opacity = "0";
    errorElement.remove();
  }, 3000);
}

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

  async initTranslationsIfNotExists() {
    try {
      const translations = await this.getTranslations();
      if (!translations) await this.set(this.translationsKey, {});
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

  async updateTranslations(id) {
    try {
      let translations = await this.getTranslations();
      let t = translations[id];
  
      if (!t) {
        t = await this.fetcher.translation(id);
        if (t) translations = await this.setTranslations([t], translations);
      }
  
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
      console.log(`Translations сохранены в локальное хранилище`);
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
      console.log("Keywords обновлены и сохранены в локальное хранилище");
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

class Fetcher {
  constructor() {
    this.translationsUrl = "https://leetcode-to-russian-api.vercel.app/api/translations/";
    this.keywordsUrl = "https://leetcode-to-russian-api.vercel.app/api/keywords/";
    this.versionsUrl = "https://leetcode-to-russian-api.vercel.app/api/versions/";
  }

  async fetchData(url) {
    try {
      const res = await fetch(url);
      const resJson = res.json();
      return resJson.data;
    } catch (e) {
      console.error(e);
    }
  }

  async translations(ids) {
    try {
      return await this.fetchData(this.translationsUrl + `?ids=${ids}`)
    } catch (e) {
      console.error(e);
    }
  }

  async translation(id) {
    try {
      return await this.fetchData(this.translationsUrl + id);
    } catch (e) {
      console.error(e);
    }
  }

  async keywords() {
    try {
      return await this.fetchData(this.keywordsUrl);
    } catch (e) {
      console.error(e);
    }
  }

  async version(id) {
    try {
      return await this.fetchData(this.versionsUrl + id);
    } catch (e) {
      console.error(e);
    }
  }
}

class UIEditor {
  constructor(rusTitle, rusDescription) {
    this.LSM = new LocalStorageManager();

    if (arguments.length < 2)
      throw new Error("Необходимо передать все аргументы");

    this.isRussianSaved = false;
    this.isRussian = false;

    this.rusTitle = rusTitle;
    this.rusDescription = document.createElement("div");
    this.rusDescription.innerHTML = rusDescription.replace(/ /g, " ");

    this.engTitle = document.querySelector(".text-title-large");
    this.engDescription = document.querySelector(
      '[data-track-load="description_content"]'
    );

    this.saveImages();
  }

  async setToggler() {
    const bar = document.querySelector(
      '[data-track-load="description_content"]'
    ).previousElementSibling;
    const toggler = document.createElement("div");
    toggler.className = "LTR-toggler relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full";
    toggler.textContent = "EN | RU";
    bar.append(toggler);

    toggler.addEventListener("click", async () => {
      if (this.isRussian) {
        this.setEng();
        toggler.classList.remove("LTR-toggler__active-RU");
        toggler.classList.add("LTR-toggler__active-EN");
      } else {
        await this.setRus();
        toggler.classList.remove("LTR-toggler__active-EN");
        toggler.classList.add("LTR-toggler__active-RU");
      }
    });
  }

  saveImages() {
    this.descriptionImages = {};
    for (let i = 0; i < this.engDescription.children.length; i++) {
      if (this.engDescription.children[i].tagName === "IMG") {
        this.descriptionImages[i] = this.engDescription.children[i];
      } else {
        const img = this.engDescription.children[i].querySelector("img");
        if (img) {
          this.descriptionImages[i] = this.engDescription.children[i];
        }
      }
    }
  }

  async saveKeywords() {
    try {
      this.descriptionKeywords = {};
      const keywords = this.rusDescription.querySelectorAll("[data-keyword]");
      this.localKeywords = await this.LSM.getKeywords();

      for (const keyword of keywords) {
        const id = keyword.dataset.keyword;
        const k = this.localKeywords[id];
        this.descriptionKeywords[id] = { ...k, keywordElement: keyword };
      }
    } catch (e) {
      console.error(e);
    }
  }

  async setRus() {
    try {
      await this.saveKeywords();

      if (this.isRussianSaved) {
        const currTitle = document.querySelector(".text-title-large");
        const currDescription = document.querySelector(
          '[data-track-load="description_content"]'
        );
        currTitle.textContent = this.rusTitle;
        currDescription.innerHTML = this.rusDescription.innerHTML;
        this.createListenersForKeywords(currDescription);
      } else {
        this.changeTitle();
        this.changeDescription();
      }
  
      this.isRussian = true;
    } catch (e) {
      console.error(e);
    }
  }

  setEng() {
    const currTitle = document.querySelector(".text-title-large");
    const currDescription = document.querySelector(
      '[data-track-load="description_content"]'
    );
    currTitle.textContent = this.engTitle.textContent;
    this.rusDescription = this.rusDescription.cloneNode(true);
    currDescription.innerHTML = this.engDescription.innerHTML;
    this.isRussian = false;
  }

  changeTitle() {
    const title = this.engTitle.cloneNode(true);
    const oldText = title.textContent;
    this.engTitle.textContent = oldText.split(" ")[0] + " " + this.rusTitle;
    this.rusTitle = this.engTitle.textContent;
    this.engTitle = title;
  }

  changeDescription() {
    for (const dChild of this.engDescription.children) {
      const currKeywords = dChild.querySelectorAll("[data-keyword]");
      if (currKeywords.length) {
        for (const currK of currKeywords) {
          const textEl = currK.querySelector("strong, em, b, i, u");
          dChild.replaceChild(textEl, currK);
        }
      }
    }

    for (const i in this.descriptionImages) {
      const img = this.descriptionImages[i];
      this.rusDescription.insertBefore(img, this.rusDescription.children[i]);
    }

    const description = this.engDescription.cloneNode(true);
    this.engDescription.innerHTML = this.rusDescription.innerHTML;
    this.rusDescription = this.engDescription;
    this.createListenersForKeywords(this.rusDescription);
    this.engDescription = description;

    for (const i in this.descriptionImages) {
      const img = this.descriptionImages[i];
      this.engDescription.insertBefore(img, this.engDescription.children[i]);
    }

    this.isRussianSaved = true;
  }

  createTooltipElement(rusName, description) {
    const relative = document.querySelector("#__next");
    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip-container");

    const tooltipTitle = document.createElement("div");
    tooltipTitle.classList.add("tooltip-title");
    tooltipTitle.textContent = rusName;

    const tooltipDescription = document.createElement("div");
    tooltipDescription.classList.add("tooltip-description");
    tooltipDescription.innerHTML = description;
    
    tooltip.append(tooltipTitle, tooltipDescription);

    relative.insertAdjacentElement("beforeend", tooltip);

    return tooltip;
  }

  createListenersForKeywords(descriptionContainer) {
    const keywords = descriptionContainer.querySelectorAll("[data-keyword]");

    for (const keywordElement of keywords) {
      const id = keywordElement.dataset.keyword;
      const k = this.localKeywords[id];
      const { rusName, description } = k;
      const tooltipElement = this.createTooltipElement(rusName, description);

      let timer;
      keywordElement.addEventListener("pointerenter", () => {
        timer = setTimeout(() => {
          this.keywordListener(keywordElement, tooltipElement);
        }, 500);
      });
      keywordElement.addEventListener("pointerleave", () => {
        clearTimeout(timer);
        setTimeout(() => {
          tooltipElement.style.opacity = "0";
          tooltipElement.style.visibility = "hidden";
        }, 500);
      });
    }
  }

  keywordListener(keywordElement, tooltipElement) {
    const keywordRect = keywordElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    const center = keywordRect.left + keywordRect.width / 2;

    let tooltipX = center - tooltipRect.width / 2;
    let tooltipY = keywordRect.top - tooltipRect.height - 10;

    if (tooltipX < 11) tooltipX = 11;
    if (tooltipY < 0) tooltipY = keywordRect.bottom + 10;

    tooltipElement.style.left = `${tooltipX}px`;
    tooltipElement.style.top = `${tooltipY}px`;
    tooltipElement.style.opacity = "1";
    tooltipElement.style.visibility = "visible";
  }
}
