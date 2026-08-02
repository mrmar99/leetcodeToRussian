import type { Keyword, Translation } from "./types";

export class Fetcher {
  translationsUrl = "https://leetcode-to-russian-api.vercel.app/api/translations/";
  keywordsUrl = "https://leetcode-to-russian-api.vercel.app/api/keywords/";
  versionsUrl = "https://leetcode-to-russian-api.vercel.app/api/versions/";
  userUrl = "https://leetcode-to-russian-api.vercel.app/api/user/";

  async fetchData<T>(url: string): Promise<T | undefined> {
    try {
      const res = await fetch(url);
      const resJson = await res.json();

      return resJson.data as T;
    } catch (e) {
      console.error(e);
    }
  }

  async translations(ids: string[]): Promise<Translation[] | undefined> {
    try {
      return await this.fetchData<Translation[]>(this.translationsUrl + `?ids=${ids}`);
    } catch (e) {
      console.error(e);
    }
  }

  async translation(id: number): Promise<Translation | undefined> {
    try {
      const res = await fetch(this.translationsUrl + id);
      const resJson = await res.json();

      return resJson.data as Translation;
    } catch (e) {
      console.error(e);
    }
  }

  async keywords(): Promise<Keyword[] | undefined> {
    try {
      return await this.fetchData<Keyword[]>(this.keywordsUrl);
    } catch (e) {
      console.error(e);
    }
  }

  async version(id: "keywords" | "translations"): Promise<number | undefined> {
    try {
      return await this.fetchData<number>(this.versionsUrl + id);
    } catch (e) {
      console.error(e);
    }
  }

  async anonymousUser(uuid: string, problemId: number): Promise<unknown> {
    try {
      return await this.fetchData(`${this.userUrl}${uuid}/${problemId}`);
    } catch (e) {
      console.error(e);
    }
  }
}
