const baseUrl = "https://leetcode.com/problems/";
let lastProblem = '';
let currProblem = '';

const DELAY = 100;
const MAX_TIME = 8000;
const MAX_TRIES = MAX_TIME / DELAY;
let triesCnt = 0;

const dispatchLoadEvent = () => window.dispatchEvent(new Event("load"));
const locationChangeEvent = ({ target }) => {
  currProblem = target.location.href.slice(baseUrl.length).split("/")[0];
  if (target.location.href.startsWith(baseUrl) && lastProblem.length && lastProblem !== currProblem) {
    window.location.href = baseUrl + currProblem;
    dispatchLoadEvent();
  }
};
window.addEventListener("locationchange", locationChangeEvent);

window.addEventListener("load", function f() {
  triesCnt++;

  const title = document.querySelector(".text-title-large");
  const description = document.querySelector('[data-track-load="description_content"]');

  if (title && description) {
    main();
  } else {
    triesCnt <= MAX_TRIES ? setTimeout(dispatchLoadEvent, DELAY) : authOrOldAlert();
  }
});

async function main() {
  try {
    lastProblem = window.location.href.slice(baseUrl.length).split("/")[0];

    const fetcher = new Fetcher();
    const LSM = new LocalStorageManager(fetcher);
    await LSM.initTranslationsIfNotExists();
    await LSM.initOrUpdateKeywords();

    const title = document.querySelector(".text-title-large");
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
      problemNotFoundAlert();
    }
  } catch (e) {
    console.error(e);
  }
}
