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
    .quietjar-widget__panel {
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: min(360px, calc(100vw - 48px));
      padding: 14px 16px;
      border-radius: 8px;
      background: ${color};
      color: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
    }
    .quietjar-widget__text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .quietjar-widget__headline {
      font-family: ${labelFontFamily};
      font-size: 17px;
      font-weight: 700;
      line-height: 1.2;
    }
    .quietjar-widget__body {
      font-family: ${labelFontFamily};
      font-size: 14px;
      font-weight: 400;
      line-height: 1.4;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    .quietjar-widget__action {
      flex: none;
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: #ffffff;
      color: ${color};
      font-family: ${labelFontFamily};
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
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
      /* Opaque: the control overhangs the widget, so its backdrop is partly
         the host page and translucent fills shift with unpredictable colors. */
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.35);
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
      background: #e2e8f0;
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
