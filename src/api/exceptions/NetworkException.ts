import { ApiException } from "./ApiException";

/** Запрос не дошёл до сервера: нет сети, не разрешился DNS, CORS или истёк таймаут. */
export class NetworkException extends ApiException {
  constructor(url: string, options?: ErrorOptions) {
    super(`Запрос к ${url} не выполнен`, url, options);
  }
}
