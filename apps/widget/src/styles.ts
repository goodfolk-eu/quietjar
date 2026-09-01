export function widgetStyles(color: string): string {
  return `
    :host {
      all: initial;
    }
    .quietjar-widget {
      position: fixed;
      z-index: 2147483000;
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border: none;
      border-radius: 9999px;
      background: ${color};
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
      transition: transform 0.15s ease;
    }
    .quietjar-widget--labeled {
      grid-auto-flow: column;
      align-items: center;
      gap: 10px;
      width: auto;
      max-width: min(320px, calc(100vw - 48px));
      padding: 0 22px;
    }
    .quietjar-widget__label {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .quietjar-widget:hover {
      transform: scale(1.05);
    }
    .quietjar-widget svg {
      width: 26px;
      height: 26px;
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
    /* The centered variants own the transform property for their offset, so
       they repeat the hover scale on top of it. */
    .quietjar-widget--bottom-center,
    .quietjar-widget--top-center {
      left: 50%;
      transform: translateX(-50%);
    }
    .quietjar-widget--bottom-center:hover,
    .quietjar-widget--top-center:hover {
      transform: translateX(-50%) scale(1.05);
    }
    .quietjar-widget--bottom-center {
      bottom: 24px;
    }
    .quietjar-widget--top-center {
      top: 24px;
    }
  `;
}
