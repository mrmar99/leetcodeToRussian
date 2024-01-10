function authOrOldAlert() {
  const body = document.querySelector("body");
  const authOrOldAlert = document.createElement("div");
  authOrOldAlert.classList.add("auth-or-old-alert", "alert");
  authOrOldAlert.innerHTML = "<p>Не удается загрузить перевод. Это могло случиться по 3 причинам:</p><p>1. Вы заходите со старого интерфейса;</p><p>2. Вы не авторизованы;</p><p>3. Превышено максимальное количество попыток поиска элементов для рендеринга.</p>";
  body.append(authOrOldAlert);
  authOrOldAlert.addEventListener("click", () => authOrOldAlert.remove());
  setTimeout(() => {
    authOrOldAlert.style.opacity = "0";
    authOrOldAlert.remove();
  }, 15000);
}

function problemNotFoundAlert() {
  const body = document.querySelector("body");
  const errorAlert = document.createElement("div");
  errorAlert.classList.add("error-alert", "alert");
  errorAlert.textContent = "Эта задача еще не переведена";
  body.append(errorAlert);
  errorAlert.addEventListener("click", () => errorAlert.remove());
  setTimeout(() => {
    errorAlert.style.opacity = "0";
    errorAlert.remove();
  }, 6000);
}