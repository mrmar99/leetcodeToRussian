import { ApiException } from "./ApiException";

/** Ответ пришёл, но это не тот JSON, которого ждали. */
export class ParseException extends ApiException {
  constructor(url: string, options?: ErrorOptions) {
    super(`Ответ ${url} не разобран`, url, options);
  }
}
