interface AlertOptions {
  /** Класс оформления из style.css. */
  variant: "error-alert" | "auth-or-old-alert";
  html: string;
  /** Через сколько мс убрать, если не закрыли кликом. */
  ttl: number;
}

function showAlert({ variant, html, ttl }: AlertOptions) {
  const alert = document.createElement("div");

  alert.classList.add(variant, "alert");
  alert.innerHTML = html;
  document.body.append(alert);

  alert.addEventListener("click", () => alert.remove());
  setTimeout(() => alert.remove(), ttl);
}

export function authOrOldAlert() {
  showAlert({
    variant: "auth-or-old-alert",
    html:
      "<p>Не удается загрузить перевод. Это могло случиться по 3 причинам:</p>"
      + "<p>1. Вы заходите со старого интерфейса;</p>"
      + "<p>2. Вы не авторизованы;</p>"
      + "<p>3. Страница не успела загрузиться за отведённое время.</p>",
    ttl: 15000,
  });
}

export function problemNotFoundAlert() {
  showAlert({
    variant: "error-alert",
    html: "Эта задача еще не переведена",
    ttl: 6000,
  });
}

export function networkErrorAlert() {
  showAlert({
    variant: "error-alert",
    html: "Не удалось связаться с сервером переводов. Проверьте соединение.",
    ttl: 6000,
  });
}
