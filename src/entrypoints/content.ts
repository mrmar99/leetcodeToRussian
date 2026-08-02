import { defineContentScript } from "wxt/utils/define-content-script";
import { Fetcher } from "@/api/Fetcher";
import type { Translation } from "@/api/types";
import { LocalStorageManager } from "@/storage/LocalStorageManager";
import { observeDom } from "@/dom/observeDom";
import { onLocationChange } from "@/dom/watchLocation";
import { waitFor } from "@/dom/waitFor";
import { UIEditor } from "@/ui/UIEditor";
import { authOrOldAlert, problemNotFoundAlert } from "@/ui/alerts";
import * as S from "@/ui/selectors";
import "@/assets/style.css";

const PROBLEM_PATH = /^\/problems\/([^/]+)/;
const PAGE_TIMEOUT = 8000;
/** Предел подряд идущих неудачных попыток перемонтирования. */
const MAX_MOUNT_FAILURES = 5;

type Route =
  | { kind: "problem"; slug: string }
  | { kind: "problemset" }
  | null;

/** Текущая страница определяется по URL, а не по разметке. */
function currentRoute(): Route {
  const slug = PROBLEM_PATH.exec(location.pathname)?.[1];

  if (slug) {
    return { kind: "problem", slug };
  }

  if (location.pathname.startsWith("/problemset")) {
    return { kind: "problemset" };
  }

  return null;
}

function routeKey(route: Route): string | null {
  if (!route) return null;

  return route.kind === "problem" ? `problem:${route.slug}` : "problemset";
}

/**
 * Ищет заголовок и описание задачи, но только если они уже относятся к `slug`:
 * при клиентском переходе разметка предыдущей задачи какое-то время ещё висит в DOM.
 */
function detectProblemPage(slug: string) {
  const title = document.querySelector(S.TITLE);
  const description = document.querySelector(S.DESCRIPTION);

  if (!title || !description) return null;

  // Заголовок — ссылка на саму задачу. Если разметка изменится и ссылки не окажется,
  // проверка пропускается, остаётся сам факт наличия заголовка.
  const link = title.querySelector("a[href*='/problems/']");
  const href = link?.getAttribute("href");

  if (href && !href.includes(`/problems/${slug}`)) return null;

  return { title, description };
}

let mountedKey: string | null = null;
let pending: AbortController | null = null;

async function route() {
  const current = currentRoute();
  const key = routeKey(current);

  // Переключение вкладок внутри одной задачи (описание / решения / отправки)
  // меняет URL, но заново загружать перевод не нужно.
  if (key === mountedKey) return;

  mountedKey = key;

  // Работа по предыдущей странице отменяется: пользователь мог уйти, пока
  // грузилась разметка или шёл запрос.
  pending?.abort();

  const abort = new AbortController();

  pending = abort;

  const isCurrent = () => !abort.signal.aborted;

  UIEditor.removeInjectedUI();

  if (!current) return;

  if (current.kind === "problem") {
    const found = await waitFor(() => detectProblemPage(current.slug), {
      timeout: PAGE_TIMEOUT,
      signal: abort.signal,
    });

    if (!isCurrent()) return;

    if (!found) {
      authOrOldAlert();

      return;
    }

    await problemPage(isCurrent, abort.signal);
  } else {
    const topicBtn = await waitFor(() => document.querySelector(S.TOPIC_BTN), {
      timeout: PAGE_TIMEOUT,
      signal: abort.signal,
    });

    if (!isCurrent()) return;

    if (!topicBtn) {
      authOrOldAlert();

      return;
    }

    problemsetPage(abort.signal);
  }
}

async function problemPage(isCurrent: () => boolean, signal: AbortSignal) {
  try {
    const title = document.querySelector(S.TITLE)!;
    const id = parseInt(title.textContent!);

    const fetcher = new Fetcher();
    const LSM = new LocalStorageManager(fetcher);

    await LSM.initOrUpdateKeywords();
    await LSM.initOrUpdateTranslations();
    await LSM.setAnonymousUserId(id);

    let translations = await LSM.getTranslations();
    let t = translations![id] ?? await fetcher.translation(id);

    // Пока шёл запрос, пользователь мог уйти на другую задачу.
    if (!isCurrent()) return;

    if (!t) {
      problemNotFoundAlert();

      return;
    }

    translations = await LSM.setTranslations([t], translations!);
    t = translations![id]!;

    if (!isCurrent()) return;

    await keepProblemMounted(t, signal);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Рисует перевод и следит, чтобы он не пропал: React пересоздаёт описание при
 * возврате с вкладки решений, унося с собой и текст перевода, и тумблер.
 */
async function keepProblemMounted(t: Translation, signal: AbortSignal) {
  const rusDescription = t.description.replace(/\\n/g, "\n");

  const render = async (inRussian: boolean) => {
    const editor = new UIEditor();

    editor.initProblemPage(t.rusTitle, rusDescription);

    if (inRussian) await editor.setRus();

    await editor.setToggler();

    return editor;
  };

  let ui = await render(true);
  let busy = false;
  let failures = 0;

  observeDom(() => {
    if (busy) return;

    if (ui.isMounted()) {
      failures = 0;

      return;
    }

    if (failures >= MAX_MOUNT_FAILURES) return;

    const live = document.querySelector(S.DESCRIPTION);

    // Описания нет вовсе — открыта другая вкладка задачи.
    if (!live) return;

    failures++;

    if (live === ui.mountedDescription) {
      // Описание на месте, пропал только тумблер: текст перерисовывать не нужно.
      ui.setToggler().catch((e) => console.error(e));

      return;
    }

    busy = true;

    const inRussian = ui.isRussian;

    UIEditor.removeInjectedUI();
    render(inRussian)
      .then((next) => { ui = next; })
      .catch((e) => console.error(e))
      .finally(() => { busy = false; });
  }, { signal });
}

function problemsetPage(signal: AbortSignal) {
  const mount = () => {
    if (document.querySelector(`.${S.TRANSLATIONS_BTN_CLASS}`)) return;

    const topicBtn = document.querySelector(S.TOPIC_BTN);

    if (!topicBtn) return;

    new UIEditor().initProblemsetPage(topicBtn.parentNode as Element);
  };

  mount();
  observeDom(mount, { signal });
}

export default defineContentScript({
  matches: ["https://*.leetcode.com/problems/*", "https://*.leetcode.com/problemset/"],
  main() {
    route();
    onLocationChange(route);
  },
});
