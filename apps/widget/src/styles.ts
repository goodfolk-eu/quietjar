export function widgetStyles(color: string, labelFontFamily: string): string {
  return `
    :host {
      all: initial;
    }
    .quietjar-widget {
      position: fixed;
      z-index: 2147483000;
    }
    .quietjar-widget__button {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border: none;
      border-radius: 9999px;
      background: ${color};
      color: #ffffff;
      cursor: pointer;
      padding: 0;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
      transition: transform 0.15s ease;
    }
    .quietjar-widget__button:hover {
      transform: scale(1.05);
    }
    .quietjar-widget__button--labeled {
      grid-auto-flow: column;
      align-items: center;
      gap: 10px;
      width: auto;
      max-width: min(320px, calc(100vw - 48px));
      padding: 0 22px;
    }
    .quietjar-widget__label {
      font-family: ${labelFontFamily};
      font-size: 17px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .quietjar-widget__icon {
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif;
      font-size: 24px;
      line-height: 1;
    }
    .quietjar-widget__close {
      position: absolute;
      top: -8px;
      right: -8px;
      display: grid;
      place-items: center;
      width: 25px;
      height: 25px;
      padding: 0;
      border: none;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.5);
      color: #000;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }
    .quietjar-widget:hover .quietjar-widget__close,
    .quietjar-widget:focus-within .quietjar-widget__close {
      opacity: 1;
      pointer-events: auto;
    }
    .quietjar-widget__close:hover {
      background: rgba(255, 255, 255, 0.45);
    }
    /* Touch devices never hover, so the close control stays visible there. */
    @media (hover: none) {
      .quietjar-widget__close {
        opacity: 1;
        pointer-events: auto;
      }
    }
    .quietjar-widget--bottom-right {
      right: 24px;
      bottom: 24px;
    }
    .quietjar-widget--bottom-left {
      left: 24px;
      bottom: 24px;
    }
    .quietjar-widget--top-right {
      right: 24px;
      top: 24px;
    }
    .quietjar-widget--top-left {
      left: 24px;
      top: 24px;
    }
    .quietjar-widget--bottom-center,
    .quietjar-widget--top-center {
      left: 50%;
      transform: translateX(-50%);
    }
    .quietjar-widget--bottom-center {
      bottom: 24px;
    }
    .quietjar-widget--top-center {
      top: 24px;
    }
  `;
}
