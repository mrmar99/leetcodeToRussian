import { HttpException, NetworkException, ParseException } from "./exceptions";
import type { Keyword, Translation } from "./types";

const BASE_URL = "https://leetcode-to-russian-api.vercel.app/api";
const TIMEOUT = 8000;

const URLS = {
  translations: `${BASE_URL}/translations/`,
  keywords: `${BASE_URL}/keywords/`,
  versions: `${BASE_URL}/versions/`,
  user: `${BASE_URL}/user/`,
};

/**
 * Один запрос к API. Бросает `NetworkException`, `HttpException` или `ParseException` —
 * решение, что показать пользователю, принимает вызывающий код.
 */
async function request<T>(url: string): Promise<T> {
  let res: Response;

  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  } catch (cause) {
    throw new NetworkException(url, { cause });
  }

  if (!res.ok) throw new HttpException(url, res.status);

  try {
    const { data } = await res.json();

    return data as T;
  } catch (cause) {
    throw new ParseException(url, { cause });
  }
}

export class Fetcher {
  /** `null` означает, что задача ещё не переведена, а не сбой запроса. */
  async translation(id: number): Promise<Translation | null> {
    try {
      return (await request<Translation | null>(URLS.translations + id)) ?? null;
    } catch (e) {
      if (e instanceof HttpException && e.status === 404) return null;

      throw e;
    }
  }

  async translations(ids: string[]): Promise<Translation[]> {
    return request<Translation[]>(`${URLS.translations}?ids=${ids}`);
  }

  async keywords(): Promise<Keyword[]> {
    return request<Keyword[]>(URLS.keywords);
  }

  async version(id: "keywords" | "translations"): Promise<number> {
    return request<number>(URLS.versions + id);
  }

  async anonymousUser(uuid: string, problemId: number): Promise<void> {
    await request(`${URLS.user}${uuid}/${problemId}`);
  }
}
