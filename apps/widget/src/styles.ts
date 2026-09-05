/**
 * The card face and the payment container share one width, so opening the
 * container in body mode grows the widget upwards rather than sideways.
 * border-box keeps that promise whatever padding either side carries.
 */
const FACE_WIDTH = "min(360px, calc(100vw - 24px))";

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
      box-sizing: border-box;
      width: ${FACE_WIDTH};
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
    .quietjar-panel {
      position: fixed;
      z-index: 2147483001;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
      width: ${FACE_WIDTH};
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      padding: 16px;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      font-family: ${labelFontFamily};
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.28);
      /* Rises into place on open and drops back towards the widget on close.
         A transition rather than a keyframe animation, because an animation
         with a forward fill outranks the closed state and the panel would
         snap away instead of leaving. The position itself is set inline, so
         only the transform and the opacity move. */
      transition:
        opacity 0.16s ease,
        transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .quietjar-panel[hidden] {
      display: none;
    }
    /* Held while the closed offset is committed, so laying the panel out for
       the first time does not animate on its way to the starting position. */
    .quietjar-panel--instant {
      transition: none;
    }
    .quietjar-panel[data-state="closed"] {
      opacity: 0;
      transform: translateY(14px);
      /* Nothing in a panel on its way out should be clickable. */
      pointer-events: none;
    }
    .quietjar-panel[data-state="open"] {
      opacity: 1;
      transform: translateY(0);
    }
    /* A docked sheet reads as sliding in from the edge it is attached to. */
    .quietjar-panel--sheet[data-state="closed"] {
      transform: translateY(100%);
    }
    @media (prefers-reduced-motion: reduce) {
      .quietjar-panel {
        transition: none;
      }
      .quietjar-panel[data-state="closed"] {
        transform: none;
      }
      .quietjar-widget__button {
        transition: none;
      }
    }
    .quietjar-panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .quietjar-panel__title {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    .quietjar-panel__minimize,
    .quietjar-panel__back {
      display: grid;
      place-items: center;
      flex: none;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #0f172a;
      cursor: pointer;
    }
    .quietjar-panel__minimize:hover,
    .quietjar-panel__back:hover {
      background: #e2e8f0;
    }
    .quietjar-panel__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .quietjar-panel__amounts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .quietjar-panel__amount {
      flex: 1 1 auto;
      min-width: 68px;
      padding: 10px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
    }
    .quietjar-panel__amount:hover {
      border-color: #cbd5e1;
    }
    .quietjar-panel__amount[aria-pressed="true"] {
      border-color: ${color};
      color: ${color};
    }
    .quietjar-panel__custom {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      font-family: inherit;
      font-size: 15px;
    }
    .quietjar-panel__submit {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      background: ${color};
      color: #ffffff;
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
    }
    .quietjar-panel__submit:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .quietjar-panel__back-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .quietjar-panel__amount-label {
      font-size: 15px;
      font-weight: 600;
    }
    .quietjar-panel__loading,
    .quietjar-panel__thanks,
    .quietjar-panel__error {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .quietjar-panel__error {
      color: #b91c1c;
    }
    .quietjar-panel__footer {
      display: flex;
      justify-content: center;
      padding-top: 4px;
      border-top: 1px solid #eef1f2;
    }
    .quietjar-panel__powered {
      padding-top: 8px;
      color: #6b747b;
      font-size: 12px;
      text-decoration: none;
    }
    .quietjar-panel__powered:hover {
      color: #0f172a;
      text-decoration: underline;
    }
    /* Docked to the bottom edge: on a phone there is no room to sit beside the
       button, and the button itself is hidden while the sheet is up. */
    .quietjar-panel--sheet {
      left: 0;
      right: 0;
      bottom: 0;
      top: auto;
      width: 100%;
      max-height: 85vh;
      border-radius: 16px 16px 0 0;
    }
    @media (max-width: 640px) {
      .quietjar-widget--open {
        display: none;
      }
    }
  `;
}
