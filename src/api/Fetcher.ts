import { HttpException, NetworkException, ParseException } from "./exceptions";
import type { Bootstrap, Keyword, TelemetryResult, Translation } from "./types";

const BASE_URL = "https://leetcode-to-russian-api.vercel.app/api";
const TIMEOUT = 8000;
/** Сервер принимает не больше 50 результатов за запрос. */
const TELEMETRY_LIMIT = 50;

const URLS = {
  translation: `${BASE_URL}/translations/`,
  translationsBatch: `${BASE_URL}/translations/batch`,
  keywords: `${BASE_URL}/keywords/`,
  bootstrap: `${BASE_URL}/bootstrap`,
  visits: `${BASE_URL}/visits`,
  telemetry: `${BASE_URL}/layout/telemetry`,
};

/** Разбирает конверт `{message, data}`. Пустой ответ (202, 204) отдаёт как `undefined`. */
async function unwrap<T>(res: Response, url: string): Promise<T | undefined> {
  if (!res.ok) throw new HttpException(url, res.status);

  if (res.status === 202 || res.status === 204) return undefined;

  try {
    const { data } = await res.json();

    return data as T;
  } catch (cause) {
    throw new ParseException(url, { cause });
  }
}

/**
 * Запрос к API. Бросает `NetworkException`, `HttpException` или `ParseException` —
 * решение, что показать пользователю, принимает вызывающий код.
 */
async function get<T>(url: string): Promise<T | undefined> {
  let res: Response;

  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  } catch (cause) {
    throw new NetworkException(url, { cause });
  }

  return unwrap<T>(res, url);
}

async function post<T>(url: string, body: unknown): Promise<T | undefined> {
  let res: Response;

  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch (cause) {
    throw new NetworkException(url, { cause });
  }

  return unwrap<T>(res, url);
}

export class Fetcher {
  /** Версии кешей и конфиг разметки одним запросом. Сервер кеширует ответ на 5 минут. */
  async bootstrap(): Promise<Bootstrap> {
    const data = await get<Bootstrap>(URLS.bootstrap);

    if (!data) throw new ParseException(URLS.bootstrap);

    return data;
  }

  /** `null` означает, что задача ещё не переведена, а не сбой запроса. */
  async translation(id: number): Promise<Translation | null> {
    try {
      return (await get<Translation>(URLS.translation + id)) ?? null;
    } catch (e) {
      if (e instanceof HttpException && e.status === 404) return null;

      throw e;
    }
  }

  /** Список в теле, а не в URL: пара сотен id уже не влезает в лимит длины адреса. */
  async translations(ids: string[]): Promise<Translation[]> {
    const numericIds = ids.map(Number).filter(Number.isInteger);

    return (await post<Translation[]>(URLS.translationsBatch, { ids: numericIds })) ?? [];
  }

  async keywords(): Promise<Keyword[]> {
    return (await get<Keyword[]>(URLS.keywords)) ?? [];
  }

  async visit(uuid: string, problemId: number): Promise<void> {
    await post(URLS.visits, { uuid, problemId });
  }

  async layoutTelemetry(layoutVersion: number, results: TelemetryResult[]): Promise<void> {
    if (!results.length) return;

    await post(URLS.telemetry, { layoutVersion, results: results.slice(0, TELEMETRY_LIMIT) });
  }
}
