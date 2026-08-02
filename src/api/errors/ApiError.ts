/**
 * Базовый сбой обращения к API переводов.
 *
 * Отдельный класс нужен, чтобы отличать проблемы связи от штатного «перевода нет»:
 * второе показывает пользователю совсем другое сообщение.
 */
export class ApiError extends Error {
  readonly url: string;

  constructor(message: string, url: string, options?: ErrorOptions) {
    super(message, options);

    this.name = new.target.name;
    this.url = url;
  }
}
