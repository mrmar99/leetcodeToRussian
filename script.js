window.addEventListener("load", function f() {
  const isReady = document.querySelector(".flexlayout__layout");
  isReady ? main() : setTimeout(f, 300);
});

const KEYWORDS_VERSION = "leetcodeToRussianKeywordsVersion";
const KEYWORD = "leetcodeToRussianKeyword_";
const TRANSLATIONS_VERSION = "leetcodeToRussianTranslationsVersion";
const TRANSLATIONS_IDS = "leetcodeToRussianTranslationsIds";
const TRANSLATION = "leetcodeToRussianTranslation_";

async function main() {
  try {
    const title = document.querySelector(".text-title-large");
    if (!title) return;
    const id = parseInt(title.textContent);

    const kVersionAPI = await fetchVersion("keywords");
    const kVersionLocal = (await chrome.storage.local.get(KEYWORDS_VERSION))[KEYWORDS_VERSION];

    if (!kVersionLocal || kVersionLocal < kVersionAPI) {
      await keywordsSaver();
      await chrome.storage.local.set({ [KEYWORDS_VERSION]: kVersionAPI });
    }

    const tVersionAPI = await fetchVersion("translations");
    const tVersionLocal = (await chrome.storage.local.get(TRANSLATIONS_VERSION))[TRANSLATIONS_VERSION];

    const tIdsCheck = (await chrome.storage.local.get(TRANSLATIONS_IDS))[TRANSLATIONS_IDS];
    if (!tIdsCheck) await chrome.storage.local.set({ [TRANSLATIONS_IDS]: {} });

    let t = (await chrome.storage.local.get(`${TRANSLATION}${id}`))[`${TRANSLATION}${id}`];

    if (!t) {
      t = await fetchTranslation(id);
      if (t) await translationSaver(id, t);
    }

    const tIds = (await chrome.storage.local.get(TRANSLATIONS_IDS))[TRANSLATIONS_IDS];
    if (!tVersionLocal || tVersionLocal < tVersionAPI) {
      for (const tId of Object.values(tIds)) {
        const tData = await fetchTranslation(tId);
        await translationSaver(tId, tData);
      }
      await chrome.storage.local.set({ [TRANSLATIONS_VERSION]: tVersionAPI }); 
    }

    if (t) {
      console.log("tIds:", tIds);
      tIds[id] = id;
      await chrome.storage.local.set({ [TRANSLATIONS_IDS]: tIds });
      
      const { rusTitle, description } = t;
      const ui = new UIEditor(rusTitle, description.replace(/\\n/g, '\n'));
      await ui.setRus();

      // setTimeout(() => ui.setEng(), 8000);
    } else {
      console.log("Эта задача еще не переведена");
    }
  } catch (e) {
    console.error(e);
  }
}

async function fetchTranslation(id) {
  try {
    const res = await fetch(`https://leetcode-to-russian-api.vercel.app/api/translations/${id}`);
    const resJson = await res.json();
    return resJson.data;
  } catch (e) {
    console.error(e);
  }
}

async function fetchVersion(vId) {
  try {
    const res = await fetch(`https://leetcode-to-russian-api.vercel.app/api/versions/${vId}`);
    const resJson = await res.json();
    return resJson.data;
  } catch (e) {
    console.error(e);
  }
}

async function keywordsSaver() {
  try {
    const res = await fetch("https://leetcode-to-russian-api.vercel.app/api/keywords");
    const resJson = await res.json();
    const keywords = resJson.data;

    for (const k of keywords) {
      const { id, rusName, description } = k;
      await chrome.storage.local.set({ [`${KEYWORD}${id}`]: {
        rusName,
        description
      }});
    }
    
    console.log("Keywords updated in chrome storage");
  } catch (e) {
    console.error(e);
  }
}

async function translationSaver(id, data, tIds) {
  try {
    await chrome.storage.local.set({ [`${TRANSLATION}${id}`]: data });
    console.log(`Translation ${id} saved to chrome storage`);
  } catch (e) {
    console.error(e);
  }
}

async function fetchDataFromJson(path) {
  try {
    const translationsUrl = chrome.runtime.getURL(path);
    const response = await fetch(translationsUrl);
    const data = await response.json();
    return data;
  } catch (e) {
    console.error(e);
  }
}

class UIEditor {
  constructor(rusTitle, rusDescription) {
    if (arguments.length < 2)
      throw new Error("Необходимо передать все аргументы");

    this.isRussian = false;

    this.rusTitle = rusTitle;
    this.rusDescription = rusDescription.replace(/ /g, ' ');

    this.engTitle = document.querySelector(".text-title-large");
    this.engDescription = document.querySelector(
      '[data-track-load="description_content"]'
    );

    this.saveImages();
  }

  saveImages() {
    this.descriptionImages = {};
    for (let i = 0; i < this.engDescription.children.length; i++) {
      if (this.engDescription.children[i].tagName === "IMG") {
        this.descriptionImages[i] = this.engDescription.children[i];
      } else {
        const img = this.engDescription.children[i].querySelector('img');
        if (img) {
          this.descriptionImages[i] = this.engDescription.children[i];
        }
      }
    }
  }

  async saveKeywords() {
    try {
      this.descriptionKeywords = {};
      const keywords = document.querySelectorAll("[data-keyword]");
      for (const keyword of keywords) {
        const id = keyword.dataset.keyword;
        const k = (await chrome.storage.local.get(`${KEYWORD}${id}`))[`${KEYWORD}${id}`];
        this.descriptionKeywords[id] = { ...k, keywordElement: keyword };
      }
    } catch (e) {
      console.error(e);
    }
  }

  async setRus() {
    if (!this.isRussian) {
      await this.saveKeywords();
      this.changeTitle(this.rusTitle);
      this.changeDescription(this.rusDescription);
      this.isRussian = true;
    }
  }

  setEng() {
    if (this.isRussian) {
      const currTitle = document.querySelector(".text-title-large");
      const currDescription = document.querySelector(
        '[data-track-load="description_content"]'
      );
      currTitle.nextElementSibling.remove();
      currTitle.parentNode.replaceChild(this.engTitle, currTitle);
      currDescription.innerHTML = this.engDescription.innerHTML;
      this.isRussian = false;
    }
  }

  changeTitle(rusTitle) {
    const title = this.engTitle.cloneNode(true);
    this.engTitle.insertAdjacentElement("beforebegin", title);
    title.parentElement.removeChild(this.engTitle);

    title.parentElement.style = `flex-direction:column;`;

    const oldText = title.textContent;
    const newText = oldText.split(" ")[0] + " " + rusTitle;

    const newTitle = document.createElement("div");
    newTitle.classList.add(...title.classList);
    newTitle.textContent = newText;

    title.insertAdjacentElement("beforebegin", newTitle);
    title.style = `font-size:16px;opacity:0.5;font-weight:400;`;
    title.childNodes[0].textContent = oldText.split(" ").slice(1).join(" ");
  }

  keywordListener(keyword, popupEl) {
    const keywordRect = keyword.getBoundingClientRect();
    const popupRect = popupEl.getBoundingClientRect();

    const center = keywordRect.left + keywordRect.width / 2;

    let popupX = center - popupRect.width / 2;
    let popupY = keywordRect.top - popupRect.height - 10;

    if (popupX < 11) popupX = 11;
    if (popupY < 0) popupY = keywordRect.bottom + 10;

    popupEl.style.left = `${popupX}px`;
    popupEl.style.top = `${popupY}px`;
    popupEl.style.opacity = '1';
    popupEl.style.visibility = 'visible';
  }

  changeDescription(rusDescription) {
    const description = this.engDescription.cloneNode(true);
    const tmpEl = document.createElement("div");
    tmpEl.innerHTML = rusDescription;

    for (const i in this.descriptionImages) {
      const img = this.descriptionImages[i];
      tmpEl.insertBefore(img, tmpEl.children[i]);
    }

    this.engDescription.innerHTML = tmpEl.innerHTML;

    const rusKeywords = this.engDescription.querySelectorAll("[data-keyword]");
    const relative = document.querySelector("#__next");
    for (const rusKeyword of rusKeywords) {
      const el = document.createElement("div");
      const elStyle = `
        z-index: 40;
        display: block;
        opacity: 0;
        visibility: hidden;
        position: fixed;
        box-shadow: 0 0 #0000,0 0 #0000,0 0 #0000,0 0 #0000,0px 1px 3px #0000003d,0px 6px 16px #00000029;
        transition: opacity 0.15s ease;
        font-weight: initial;
        font-style: initial;
        color: initial;
      `;
      el.style = elStyle;

      const k = rusKeyword.dataset.keyword;
      const { rusName, description } = this.descriptionKeywords[k];
      el.innerHTML = `<div class="custom-keyword-popup" style="background-color: #363636;border: 1px solid rgb(255,255,255,.1);border-radius: 7px;max-width: 385px;">  <div class="popup-title" style="font-weight: 600;padding: 16px;border-bottom: 1px solid rgb(255,255,255,.1);">${rusName}</div>  <div class="popup-content" style="padding: 16px;">${description}</div></div>`;
      relative.insertAdjacentElement("beforeend", el);

      let timer;
      rusKeyword.addEventListener("pointerenter", () => {
        timer = setTimeout(() => {
          this.keywordListener(rusKeyword, el);
        }, 500);
      });
      rusKeyword.addEventListener("pointerleave", () => {
        clearTimeout(timer);
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.visibility = 'hidden';
        }, 500);
      });
    }

    this.engDescription = description;
  }
}
