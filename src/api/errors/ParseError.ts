import { ApiError } from "./ApiError";

/** Ответ пришёл, но это не тот JSON, которого ждали. */
export class ParseError extends ApiError {
  constructor(url: string, options?: ErrorOptions) {
    super(`Ответ ${url} не разобран`, url, options);
  }
}
