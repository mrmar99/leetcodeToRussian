type Variant = "warning" | "danger";

interface AlertOptions {
  variant: Variant;
  title: string;
  description?: string;
  /** Через сколько мс убрать, если не закрыли крестиком. */
  ttl: number;
}

const ICONS: Record<Variant, string> = {
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M10.363 3.591 2.257 17.125A1.914 1.914 0 0 0 3.893 20h16.214a1.914 1.914 0 0 0 1.636-2.875L13.637 3.591a1.914 1.914 0 0 0-3.274 0Z"/>'
    + '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  danger:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/>'
    + '<path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/>'
    + '<path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg>',
};

const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
  + '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function showAlert({ variant, title, description, ttl }: AlertOptions) {
  const alert = document.createElement("div");

  alert.className = `LTR-alert LTR-alert--${variant}`;
  alert.innerHTML =
    `<div class="LTR-alert__icon">${ICONS[variant]}</div>`
    + '<div class="LTR-alert__body">'
    + `<div class="LTR-alert__title">${title}</div>`
    + (description ? `<div class="LTR-alert__description">${description}</div>` : "")
    + "</div>"
    + `<button class="LTR-alert__close" type="button" aria-label="Закрыть">${CLOSE_ICON}</button>`;

  document.body.append(alert);

  alert.querySelector(".LTR-alert__close")?.addEventListener("click", () => alert.remove());
  setTimeout(() => alert.remove(), ttl);
}

export function authOrOldAlert() {
  showAlert({
    variant: "warning",
    title: "Не удалось загрузить перевод",
    description:
      "<ul><li>вы заходите со старого интерфейса;</li>"
      + "<li>вы не авторизованы;</li>"
      + "<li>страница не успела загрузиться.</li></ul>",
    ttl: 15000,
  });
}

export function networkErrorAlert() {
  showAlert({
    variant: "danger",
    title: "Нет связи с сервером переводов",
    description: "Проверьте подключение к интернету.",
    ttl: 6000,
  });
}
