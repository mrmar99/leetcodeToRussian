import { ApiException } from "./ApiException";

/** Сервер ответил, но статусом об ошибке. */
export class HttpException extends ApiException {
  readonly status: number;

  constructor(url: string, status: number) {
    super(`Ответ ${status} на запрос ${url}`, url);

    this.status = status;
  }
}
