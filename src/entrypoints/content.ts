import { defineContentScript } from "wxt/utils/define-content-script";
import { Fetcher } from "@/lib/Fetcher";
import { LocalStorageManager } from "@/lib/LocalStorageManager";
import { UIEditor } from "@/lib/UIEditor";
import { authOrOldAlert, problemNotFoundAlert } from "@/lib/alerts";
import "@/assets/style.css";

const baseUrl = "https://leetcode.com/problems/";
let lastProblem = '';
let currProblem = '';

const DELAY = 100;
const MAX_TIME = 8000;
const MAX_TRIES = MAX_TIME / DELAY;
let triesCnt = 0;

const dispatchLoadEvent = () => window.dispatchEvent(new Event("load"));

const locationChangeEvent = (event: Event) => {
  const target = event.target as Window;

  currProblem = target.location.href.slice(baseUrl.length).split("/")[0]!;

  if (target.location.href.startsWith(baseUrl) && lastProblem.length && lastProblem !== currProblem) {
    const nextApp = document.querySelector("#__next");

    if (nextApp) nextApp.innerHTML = "";
    window.location.href = baseUrl + currProblem;
    dispatchLoadEvent();
  }
};

async function problemPage() {
  try {
    lastProblem = window.location.href.slice(baseUrl.length).split("/")[0]!;

    const title = document.querySelector(".text-title-large")!;
    const id = parseInt(title.textContent!);

    const fetcher = new Fetcher();
    const LSM = new LocalStorageManager(fetcher);

    await LSM.initOrUpdateKeywords();
    await LSM.initOrUpdateTranslations();
    await LSM.setAnonymousUserId(id);

    let translations = await LSM.getTranslations();
    let t = translations![id] ?? await fetcher.translation(id);

    if (!t) {
      problemNotFoundAlert();

      return;
    }

    translations = await LSM.setTranslations([t], translations!);
    t = translations![id]!;

    const { rusTitle, description } = t;
    const ui = new UIEditor();

    ui.initProblemPage(rusTitle, description.replace(/\\n/g, "\n"));
    await ui.setRus();
    await ui.setToggler();
  } catch (e) {
    console.error(e);
  }
}

function problemsetPage(topicBtnsEl: Element) {
  const ui = new UIEditor();

  ui.initProblemsetPage(topicBtnsEl);
}

export default defineContentScript({
  matches: ["https://*.leetcode.com/problems/*", "https://*.leetcode.com/problemset/"],
  main() {
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
        problemsetPage(topicBtnEl.parentNode as Element);
      } else {
        if (triesCnt <= MAX_TRIES) {
          setTimeout(dispatchLoadEvent, DELAY);
        } else {
          authOrOldAlert();
        }
      }
    });

    // При обычной загрузке страницы content script успевает подписаться до события
    // load. Но при инжекте в уже загруженную страницу (wxt dev, перезагрузка
    // расширения) load уже прошёл — стартуем цикл вручную.
    if (document.readyState === "complete") dispatchLoadEvent();
  },
});
