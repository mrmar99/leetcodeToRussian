const baseUrl = "https://leetcode.com/problems/";
let lastProblem = "";
let newProblem = "";

const loadEventDispatcher = ({ target }) => {
  newProblem = target.location.href.slice(baseUrl.length).split("/")[0];
  if (lastProblem.length && lastProblem !== newProblem) {
    window.location.href = baseUrl + newProblem;
    window.dispatchEvent(new Event("load"));
  }
};
window.addEventListener("locationchange", loadEventDispatcher);

window.addEventListener("load", function f() {
  console.log("LOADING...");
  const isReady = document.querySelector(".flexlayout__layout");
  isReady ? main() : setTimeout(f, 400);
});

const TRANSLATIONS = "leetcodeToRussianTranslations";
const KEYWORDS = "leetcodeToRussianKeywords";
const KEYWORDS_VERSION = "leetcodeToRussianKeywordsVersion";
const TRANSLATIONS_VERSION = "leetcodeToRussianTranslationsVersion";

async function main() {
  try {
    const title = document.querySelector(".text-title-large");
    if (!title) return;
    lastProblem = window.location.href.slice(baseUrl.length).split("/")[0];

    const id = parseInt(title.textContent);

    const kVersionAPI = await fetchVersion("keywords");
    const kVersionLocal = (await chrome.storage.local.get(KEYWORDS_VERSION))[
      KEYWORDS_VERSION
    ];

    if (!kVersionLocal || kVersionLocal < kVersionAPI) {
      await keywordsSaver();
      await chrome.storage.local.set({ [KEYWORDS_VERSION]: kVersionAPI });
    }

    const tVersionAPI = await fetchVersion("translations");
    const tVersionLocal = (
      await chrome.storage.local.get(TRANSLATIONS_VERSION)
    )[TRANSLATIONS_VERSION];

    let translations = (await chrome.storage.local.get(TRANSLATIONS))[
      TRANSLATIONS
    ];
    if (!translations) await chrome.storage.local.set({ [TRANSLATIONS]: {} });
    translations = (await chrome.storage.local.get(TRANSLATIONS))[TRANSLATIONS];

    let t = translations[id];

    if (!t) {
      t = await fetchTranslation(id);
      if (t) translations = await translationsSaver([t], translations);
    }

    if (!tVersionLocal || tVersionLocal < tVersionAPI) {
      const translationsIds = Object.keys(translations);
      if (translationsIds.length) {
        const fetchedTranslations = await fetchTranslations(translationsIds);
        translations = await translationsSaver(
          fetchedTranslations,
          translations
        );
      }
      await chrome.storage.local.set({ [TRANSLATIONS_VERSION]: tVersionAPI });
    }

    t = translations[id];
    if (t) {
      const { rusTitle, description } = t;
      const ui = new UIEditor(rusTitle, description.replace(/\\n/g, "\n"));
      await ui.setRus();

      const bar = document.querySelector(
        '[data-track-load="description_content"]'
      ).previousElementSibling;
      const toggler = document.createElement("div");
      toggler.className =
        "relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary cursor-pointer transition-colors hover:bg-fill-primary hover:text-text-primary text-sd-secondary-foreground hover:opacity-80";
      toggler.style =
        "background:linear-gradient(to left, rgb(13, 162, 145) 50%, rgb(48 48 48) 50%);font-weight:700;transition:background 0.3s ease;";
      toggler.textContent = "EN | RU";
      bar.append(toggler);

      toggler.addEventListener("click", async () => {
        if (ui.isRussian) {
          ui.setEng();
          toggler.style =
            "background:linear-gradient(to right, rgb(13, 162, 145) 50%, rgb(48 48 48) 50%);font-weight:700;transition:background 0.3s ease;";
        } else {
          await ui.setRus();
          toggler.style =
            "background:linear-gradient(to left, rgb(13, 162, 145) 50%, rgb(48 48 48) 50%);font-weight:700;transition:background 0.3s ease;";
        }
      });
    } else {
      console.log("Эта задача еще не переведена");
    }
  } catch (e) {
    console.error(e);
  }
}

async function fetchTranslations(ids) {
  try {
    const res = await fetch(
      `https://leetcode-to-russian-api.vercel.app/api/translations/?ids=${ids.join(
        ","
      )}`
    );
    const resJson = await res.json();
    return resJson.data;
  } catch (e) {
    console.error(e);
  }
}

async function fetchTranslation(id) {
  try {
    const res = await fetch(
      `https://leetcode-to-russian-api.vercel.app/api/translations/${id}`
    );
    const resJson = await res.json();
    return resJson.data;
  } catch (e) {
    console.error(e);
  }
}

async function fetchVersion(vId) {
  try {
    const res = await fetch(
      `https://leetcode-to-russian-api.vercel.app/api/versions/${vId}`
    );
    const resJson = await res.json();
    return resJson.data;
  } catch (e) {
    console.error(e);
  }
}

async function keywordsSaver() {
  try {
    const res = await fetch(
      "https://leetcode-to-russian-api.vercel.app/api/keywords"
    );
    const resJson = await res.json();
    const keywords = resJson.data;

    const keywordsToSave = {};
    for (const k of keywords) {
      const { id, rusName, description } = k;
      keywordsToSave[id] = { rusName, description };
    }

    await chrome.storage.local.set({ [KEYWORDS]: keywordsToSave });
    console.log("Keywords updated in chrome storage");
  } catch (e) {
    console.error(e);
  }
}

async function translationsSaver(fetchedTranslations, translations) {
  try {
    const translationsToSave = {};
    for (const t of fetchedTranslations) {
      translationsToSave[t.id] = t;
    }

    translations = { ...translations, ...translationsToSave };
    await chrome.storage.local.set({ [TRANSLATIONS]: translations });
    console.log(`Translations saved to chrome storage`);
    return translations;
  } catch (e) {
    console.error(e);
  }
}

class UIEditor {
  constructor(rusTitle, rusDescription) {
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
      this.localKeywords = (await chrome.storage.local.get(KEYWORDS))[
        KEYWORDS
      ];

      console.log("keywords", keywords)

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
    for (const i in this.descriptionImages) {
      const img = this.descriptionImages[i];
      this.rusDescription.insertBefore(img, this.rusDescription.children[i]);
    }

    const description = this.engDescription.cloneNode(true);
    this.engDescription.innerHTML = this.rusDescription.innerHTML;
    this.rusDescription = this.engDescription;
    this.createListenersForKeywords(this.rusDescription);
    this.engDescription = description;

    for (let i = 0; i < this.engDescription.children.length; i++) {
      if (this.descriptionImages[i]) {
        const img = this.descriptionImages[i];
        this.engDescription.insertBefore(img, this.engDescription.children[i]);
      }

      const currKeywords = this.engDescription.querySelectorAll("[data-keyword]");
      for (const currK of currKeywords) {
        const k = document.createElement("span");
        k.innerHTML = currK.querySelector("strong, em, b, i, u");
        this.engDescription.insertBefore(k, this.engDescription.children[i]);
      }
    }

    // for (const i in this.descriptionImages) {
    //   const img = this.descriptionImages[i];
    //   this.engDescription.insertBefore(img, this.engDescription.children[i]);
    // }

    this.isRussianSaved = true;
  }

  createPopupElement(rusName, description) {
    const relative = document.querySelector("#__next");
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
    
    el.innerHTML = `<div class="custom-keyword-popup" style="background-color: #363636;border: 1px solid rgb(255,255,255,.1);border-radius: 7px;max-width: 385px;">  <div class="popup-title" style="font-weight: 600;padding: 16px;border-bottom: 1px solid rgb(255,255,255,.1);">${rusName}</div>  <div class="popup-content" style="padding: 16px;">${description}</div></div>`;
    const pElements = el.querySelectorAll("p");
    for (let i = 0; i < pElements.length - 1; i++) {
      pElements[i].style = "margin-bottom: 0.5rem;";
    }
    const codeElements = el.querySelectorAll("code");
    for (const codeEl of codeElements) {
      codeEl.style = `
        background-color: #ffffff1a;
        color: #eff1f6bf;
        border: 1px solid #f7faff1f;
        padding: 0.25rem;
        border-radius: 0.5rem;
        font-family: Menlo,sans-serif;
        font-size: .75rem;
        line-height: 1.5rem;
      `;
    }
    relative.insertAdjacentElement("beforeend", el);

    return el;
  }

  createListenersForKeywords(descriptionContainer) {
    const keywords = descriptionContainer.querySelectorAll("[data-keyword]");

    for (const keywordElement of keywords) {
      const id = keywordElement.dataset.keyword;
      const k = this.localKeywords[id];
      const { rusName, description } = k;
      const popupElement = this.createPopupElement(rusName, description);

      let timer;
      keywordElement.addEventListener("pointerenter", () => {
        timer = setTimeout(() => {
          this.keywordListener(keywordElement, popupElement);
        }, 500);
      });
      keywordElement.addEventListener("pointerleave", () => {
        clearTimeout(timer);
        setTimeout(() => {
          popupElement.style.opacity = "0";
          popupElement.style.visibility = "hidden";
        }, 500);
      });
    }
  }

  keywordListener(keywordElement, popupElement) {
    const keywordRect = keywordElement.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect();

    const center = keywordRect.left + keywordRect.width / 2;

    let popupX = center - popupRect.width / 2;
    let popupY = keywordRect.top - popupRect.height - 10;

    if (popupX < 11) popupX = 11;
    if (popupY < 0) popupY = keywordRect.bottom + 10;

    popupElement.style.left = `${popupX}px`;
    popupElement.style.top = `${popupY}px`;
    popupElement.style.opacity = "1";
    popupElement.style.visibility = "visible";
  }
}
