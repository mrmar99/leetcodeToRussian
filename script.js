window.addEventListener('load', function f() {
  const isReady = document.querySelector('.flexlayout__layout');
  isReady ? main() : setTimeout(f, 300);
});

function main() {
  const ui = new UIEditor("Сумма двух", '');
  ui.setRus();

  setTimeout(() => ui.setEng(), 10000);
}

class UIEditor {
  constructor(rusTitle, rusDescription) {
    if (arguments.length < 2) throw new Error("Необходимо передать все аргументы");

    this.rusTitle = rusTitle;
    this.rusDescription = rusDescription;

    this.engTitle = document.querySelector('.text-title-large');
    this.engDescription = document.querySelector('[data-track-load="description_content"]');
  }

  setRus() {
    this.changeTitle(this.rusTitle);
    this.changeDescription(this.rusDescription);
  }

  setEng() {
    const currTitle = document.querySelector('.text-title-large');
    const currDescription = document.querySelector('[data-track-load="description_content"]');

    currTitle.nextElementSibling.remove();
    currTitle.parentNode.replaceChild(this.engTitle, currTitle);
    currDescription.parentNode.replaceChild(this.engDescription, currDescription);
  }

  changeTitle(rusTitle) {
    const title = this.engTitle.cloneNode(true);
    this.engTitle.insertAdjacentElement("beforebegin", title);
    title.parentElement.removeChild(this.engTitle);

    title.parentElement.style = `flex-direction:column;`;
  
    const oldText = title.textContent;
    const newText = oldText.split(' ')[0] + ' ' + rusTitle;
  
    const newTitle = document.createElement('div');
    newTitle.classList.add(...title.classList);
    newTitle.textContent = newText;
    
    title.insertAdjacentElement("beforebegin", newTitle);
    title.style = `font-size:16px;opacity:0.5;font-weight:400;`;
    title.childNodes[0].textContent = oldText.split(' ').slice(1).join(' ');
  }
  
  changeDescription() {
    return '';
  }
}