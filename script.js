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
    const nextApp = document.querySelector("#__next");
    if (nextApp) nextApp.innerHTML = "";
    window.location.href = baseUrl + currProblem;
    dispatchLoadEvent();
  }
};
window.addEventListener("locationchange", locationChangeEvent);

window.addEventListener("load", function f() {
  triesCnt++;

  const title = document.querySelector(".text-title-large");
  const description = document.querySelector('[data-track-load="description_content"]');

  const topicBtnLink = "/problemset/all-code-essentials";
  const topicBtnEl = document.querySelector(`a[href="${topicBtnLink}"]`);

  if (title && description) {
    problemPage();
  } else if (topicBtnEl) {
    problemsetPage(topicBtnEl.parentNode);
  } else {
    triesCnt <= MAX_TRIES ? setTimeout(dispatchLoadEvent, DELAY) : authOrOldAlert();
  }
});

async function problemPage() {
  try {
    lastProblem = window.location.href.slice(baseUrl.length).split("/")[0];

    const title = document.querySelector(".text-title-large");
    const id = parseInt(title.textContent);

    const fetcher = new Fetcher();
    const LSM = new LocalStorageManager(fetcher);
    await LSM.initOrUpdateKeywords();
    await LSM.initOrUpdateTranslations();
    await LSM.setAnonymousUserId(id);

    let translations = await LSM.getTranslations();
    let t = translations[id] ?? await fetcher.translation(id);

    if (!t) {
      problemNotFoundAlert();
      return;
    }

    translations = await LSM.setTranslations([t], translations);
    t = translations[id];

    const { rusTitle, description } = t;
    const ui = new UIEditor();
    ui.initProblemPage(rusTitle, description.replace(/\\n/g, "\n"));
    await ui.setRus();
    await ui.setToggler();
  } catch (e) {
    console.error(e);
  }
}

function problemsetPage(topicBtnsEl) {
  const ui = new UIEditor();
  ui.initProblemsetPage(topicBtnsEl);
}
