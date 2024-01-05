window.addEventListener("load", function f() {
  const isReady = document.querySelector(".flexlayout__layout");
  isReady ? main() : setTimeout(f, 300);
});

async function main() {
  try {
    await translationsLoader();
    await keywordsLoader();

    const title = document.querySelector(".text-title-large");
    if (!title) return;

    const id = parseInt(title.textContent);
    const t = await getFromStorage("leetcodeToRussianTranslations", id);
    if (t) {
      const { rusTitle, description, keywords } = t;
      const ui = new UIEditor(rusTitle, description, keywords);
      await ui.setRus();

      // setTimeout(() => ui.setEng(), 8000);
    } else {
      console.log("Эта задача еще не переведена");
    }
  } catch (e) {
    console.error(e);
  }
}

async function getFromStorage(key, el) {
  try {
    const response = await chrome.storage.local.get(key);
    const data = response[key];
    const result = data[el];
    return result;
  } catch (e) {
    console.error(e);
  }
}

async function translationsLoader() {
  try {
    const data = await fetchDataFromJson("data/translations.json");
    await chrome.storage.local.set({ leetcodeToRussianTranslations: data });
    console.log("Translations loaded to chrome storage");
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
  constructor(rusTitle, rusDescription, keywords) {
    if (arguments.length < 2)
      throw new Error("Необходимо передать все аргументы");

    this.isRussian = false;

    this.rusTitle = rusTitle;
    this.rusDescription = rusDescription;
    this.keywords = keywords;

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
      }
    }
  }

  keywordListener(keyword) {
    console.log(keyword, keyword.firstElementChild.lastElementChild);
  }

  async saveKeywords() {
    try {
      this.descriptionKeywords = {};
      const keywords = document.querySelectorAll("[data-keyword]");
      for (const keyword of keywords) {
        const id = keyword.dataset.keyword;
        const k = await getFromStorage("leetcodeToRussianKeywords", id);
        this.descriptionKeywords[id] = { ...k, keywordElement: keyword };

        // УБРАТЬ И ПЕРЕНЕСТИ В setRus, а в setEng поставить removeEventListener
        keyword.addEventListener("mouseenter", this.keywordListener(keyword));
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

  changeDescription(rusDescription) {
    const description = this.engDescription.cloneNode(true);
    const tmpEl = document.createElement("div");
    tmpEl.innerHTML = rusDescription;

    for (const i in this.descriptionImages) {
      const img = this.descriptionImages[i];
      tmpEl.insertBefore(img, tmpEl.children[i]);
    }

    const tmpElKeywords = tmpEl.querySelectorAll("[data-keyword]");
    this.rusDescriptionKeywords = {};
    for (const keyword of tmpElKeywords) {
      const id = keyword.dataset.keyword;
      this.rusDescriptionKeywords[id] = keyword.textContent;
    }
    
    for (const k in this.descriptionKeywords) {
      const { keywordElement } = this.descriptionKeywords[k];
      const tmpKeywordElement = keywordElement.cloneNode(true);
      const keywordInText = this.keywords[k];
      const textEl = Array.from(
        tmpKeywordElement.querySelectorAll("em, strong")
      ).findLast((el) => el.textContent.trim() === keywordInText);
      textEl.textContent = this.rusDescriptionKeywords[k];
      this.descriptionKeywords[k]["rusKeywordElement"] = tmpKeywordElement;
      
      const keyword = tmpEl.querySelector(`[data-keyword=${k}]`);
      const parent = keyword.parentElement;
      parent.replaceWith(tmpKeywordElement);

      // Вставить новый элемент после текущего элемента
      parent.insertAdjacentElement('afterend', tmpKeywordElement);
      // keyword.replaceWith(tmpKeywordElement);
      // console.log(keyword.parentElement, keyword.parentNode)
      // const parent = keyword.parentElement;
      // parent.replaceChild(tmpKeywordElement, keyword);
    }

    this.engDescription.innerHTML = tmpEl.innerHTML;
    this.engDescription = description;
  }
}

async function keywordsLoader() {
  try {
    const data = await fetchDataFromJson("data/keywords.json");
    await chrome.storage.local.set({ leetcodeToRussianKeywords: data });
    console.log("Keywords loaded to chrome storage");
  } catch (e) {
    console.error(e);
  }
}
