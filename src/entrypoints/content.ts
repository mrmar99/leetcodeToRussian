import { defineContentScript } from "wxt/utils/define-content-script";
import { Fetcher } from "@/lib/Fetcher";
import { LocalStorageManager } from "@/lib/LocalStorageManager";
import { UIEditor } from "@/lib/UIEditor";
import { authOrOldAlert, problemNotFoundAlert } from "@/lib/alerts";
import { waitFor } from "@/lib/waitFor";
import "@/assets/style.css";

const baseUrl = "https://leetcode.com/problems/";
const topicBtnLink = "/problemset/all-code-essentials";
const PAGE_TIMEOUT = 8000;

let lastProblem = '';
let currProblem = '';

type Page =
  | { kind: "problem" }
  | { kind: "problemset"; topicBtnsEl: Element };

function detectPage(): Page | null {
  const title = document.querySelector(".text-title-large");
  const description = document.querySelector('[data-track-load="description_content"]');

  if (title && description) {
    return { kind: "problem" };
  }

  const topicBtnEl = document.querySelector(`a[href="${topicBtnLink}"]`);

  if (topicBtnEl) {
    return { kind: "problemset", topicBtnsEl: topicBtnEl.parentNode as Element };
  }

  return null;
}

async function init() {
  const page = await waitFor(detectPage, { timeout: PAGE_TIMEOUT });

  if (!page) {
    authOrOldAlert();

    return;
  }

  if (page.kind === "problem") {
    await problemPage();
  } else {
    problemsetPage(page.topicBtnsEl);
  }
}

const locationChangeEvent = (event: Event) => {
  const target = event.target as Window;

  currProblem = target.location.href.slice(baseUrl.length).split("/")[0]!;

  if (target.location.href.startsWith(baseUrl) && lastProblem.length && lastProblem !== currProblem) {
    const nextApp = document.querySelector("#__next");

    if (nextApp) nextApp.innerHTML = "";
    window.location.href = baseUrl + currProblem;
    init();
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

    init();
  },
});
