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
    this.descriptionImages = [];
    const imgs = this.engDescription.querySelectorAll("img");

    for (const img of imgs) {
      const imgPath = [];

      let tmpParent = img.parentNode, tmpChild = img;
      while (tmpParent !== this.engDescription) {
        const index = Array.from(tmpParent.children).indexOf(tmpChild);
        imgPath.push(index);
        tmpChild = tmpParent;
        tmpParent = tmpParent.parentNode;
      }

      const index = Array.from(tmpParent.children).indexOf(tmpChild);
      imgPath.push(index);

      this.descriptionImages.push({ img: img.cloneNode(true), imgPath: imgPath.reverse() });
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
    const nonBlockTags = new Set(["STRONG", "EM", "B", "I", "U"]);
    const currKeywords = this.engDescription.querySelectorAll("[data-keyword]");
    for (const currK of currKeywords) {
      let textEl = currK;
      while (!(textEl instanceof Text) && !nonBlockTags.has(textEl.tagName)) {
        textEl = textEl.childNodes[0];
      }
      currK.replaceWith(textEl);
    }

    for (const descriptionImage of this.descriptionImages) {
      const { img, imgPath } = descriptionImage;

      let parent = this.rusDescription;
      for (let i = 0; i < imgPath.length - 1; i++) {
        parent = parent.children[imgPath[i]];
      }
      
      const idx = imgPath.at(-1);
      if (parent !== this.rusDescription) {
        const textNodesCnt = Array.from(parent.childNodes)
          .reduce((a, e) => a += e instanceof Text ? 1 : 0, 0);
        parent.insertBefore(img, parent.childNodes[idx + textNodesCnt - 1]);
      } else {
        parent.insertBefore(img, parent.children[idx]);
      }
    }

    const description = this.engDescription.cloneNode(true);
    this.engDescription.innerHTML = this.rusDescription.innerHTML;
    this.rusDescription = this.engDescription;
    this.createListenersForKeywords(this.rusDescription);
    this.engDescription = description;

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