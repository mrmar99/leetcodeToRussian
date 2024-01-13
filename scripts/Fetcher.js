class Fetcher {
  constructor() {
    this.translationsUrl = "https://leetcode-to-russian-api.vercel.app/api/translations/";
    this.keywordsUrl = "https://leetcode-to-russian-api.vercel.app/api/keywords/";
    this.versionsUrl = "https://leetcode-to-russian-api.vercel.app/api/versions/";
  }

  async fetchData(url) {
    try {
      const res = await fetch(url);
      const resJson = await res.json();
      return resJson.data;
    } catch (e) {
      console.error(e);
    }
  }

  async translations(ids) {
    try {
      return await this.fetchData(this.translationsUrl + `?ids=${ids}`);
    } catch (e) {
      console.error(e);
    }
  }

  async translation(id) {
    try {
      const res = await fetch(this.translationsUrl + id);
      const resJson = await res.json();
      return resJson.data;
    } catch (e) {
      console.error(e);
    }
  }

  async keywords() {
    try {
      return await this.fetchData(this.keywordsUrl);
    } catch (e) {
      console.error(e);
    }
  }

  async version(id) {
    try {
      return await this.fetchData(this.versionsUrl + id);
    } catch (e) {
      console.error(e);
    }
  }
}