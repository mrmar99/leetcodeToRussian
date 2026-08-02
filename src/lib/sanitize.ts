import DOMPurify from "dompurify";

/**
 * Теги и атрибуты, которые встречаются в условиях задач. Всё остальное вырезается.
 */
const ALLOWED_TAGS = [
  "p", "div", "span", "br", "hr", "blockquote",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "small", "font",
  "code", "pre", "kbd", "samp", "var",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "img", "a", "figure", "figcaption",
];

const ALLOWED_ATTR = [
  "class", "style", "align", "color", "face", "size",
  "src", "alt", "width", "height", "loading",
  "href", "target", "rel", "title",
  "colspan", "rowspan",
  "data-keyword",
];

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName !== "A") return;

  const anchor = node as HTMLAnchorElement;

  // Ссылки из перевода открываются в новой вкладке и не получают доступ к opener.
  if (anchor.hasAttribute("target")) {
    anchor.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Чистит HTML, пришедший из API, перед вставкой на страницу LeetCode.
 *
 * Без этого скомпрометированный или подменённый ответ API выполнил бы произвольный
 * код: `innerHTML` не запускает `<script>`, но запускает `<img onerror>` и подобное,
 * а content script имеет доступ к `chrome.storage`.
 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });
}
