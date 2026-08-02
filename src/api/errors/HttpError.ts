import { ApiError } from "./ApiError";

/** Сервер ответил, но статусом об ошибке. */
export class HttpError extends ApiError {
  readonly status: number;

  constructor(url: string, status: number) {
    super(`Ответ ${status} на запрос ${url}`, url);

    this.status = status;
  }
}
