window.addEventListener('load', function f() {
  const isReady = document.querySelector('.flexlayout__layout');
  isReady ? main() : setTimeout(f, 300);
});

async function main() {
  try {
    await translationsLoader();
  
    const title = document.querySelector('.text-title-large');
    if (!title) return;

    const id = parseInt(title.textContent);
    const t = await getTranslation(id);
    console.log(t)
    if (t) {
      const { rusTitle, description } = t;
      const ui = new UIEditor(rusTitle, description);
      ui.setRus();
    
      // setTimeout(() => ui.setEng(), 8000);
    } else {
      console.log("Эта задача еще не переведена");
    }
  } catch (e) {
    console.error(e);
  }
}

async function getTranslation(id) {
  try {
    const res = await chrome.storage.local.get("leetcodeToRussianTranslations");
    const translations = res.leetcodeToRussianTranslations;
    const t = translations[id];
    return t;
  } catch (e) {
    console.error(e);
  }
}

async function translationsLoader() {
  try {
    const translationsUrl = chrome.runtime.getURL('data/translations.json');
    const response = await fetch(translationsUrl);
    const data = await response.json();
    await chrome.storage.local.set({ "leetcodeToRussianTranslations": data });
    console.log("Translations loaded to chrome storage");
  } catch (e) {
    console.error(e);
  }
}

class UIEditor {
  constructor(rusTitle, rusDescription) {
    if (arguments.length < 2) throw new Error("Необходимо передать все аргументы");

    this.isRussian = false;

    this.rusTitle = rusTitle;
    this.rusDescription = rusDescription;

    this.engTitle = document.querySelector('.text-title-large');
    this.engDescription = document.querySelector('[data-track-load="description_content"]');
  }

  setRus() {
    if (!this.isRussian) {
      this.changeTitle(this.rusTitle);
      this.changeDescription(this.rusDescription);
      this.isRussian = true;
    }
  }

  setEng() {
    if (this.isRussian) {
      const currTitle = document.querySelector('.text-title-large');
      const currDescription = document.querySelector('[data-track-load="description_content"]');
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
    const newText = oldText.split(' ')[0] + ' ' + rusTitle;
  
    const newTitle = document.createElement('div');
    newTitle.classList.add(...title.classList);
    newTitle.textContent = newText;
    
    title.insertAdjacentElement("beforebegin", newTitle);
    title.style = `font-size:16px;opacity:0.5;font-weight:400;`;
    title.childNodes[0].textContent = oldText.split(' ').slice(1).join(' ');
  }
  
  changeDescription(rusDescription) {
    const description = this.engDescription.cloneNode(true);
    this.engDescription.innerHTML = rusDescription;
    this.engDescription = description;
  }
}