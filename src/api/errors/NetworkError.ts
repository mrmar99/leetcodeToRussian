import { ApiError } from "./ApiError";

/** Запрос не дошёл до сервера: нет сети, не разрешился DNS, CORS или истёк таймаут. */
export class NetworkError extends ApiError {
  constructor(url: string, options?: ErrorOptions) {
    super(`Запрос к ${url} не выполнен`, url, options);
  }
}
