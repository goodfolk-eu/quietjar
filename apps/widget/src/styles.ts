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
  `;
}
