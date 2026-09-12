import { describe, expect, test } from "bun:test";
import { contrastText, textColorOnWhite } from "../src/contrast";

describe("contrastText", () => {
  test("keeps white text on dark colors", () => {
    expect(contrastText("#0f172a")).toBe("#ffffff");
    expect(contrastText("#0284c7")).toBe("#ffffff");
  });

  test("switches to black text on light colors", () => {
    expect(contrastText("#f59e0b")).toBe("#000000");
  });

  test("reads shorthand and alpha hex", () => {
    expect(contrastText("#0af")).toBe("#ffffff");
    expect(contrastText("#f59e0b40")).toBe("#000000");
  });
});

describe("textColorOnWhite", () => {
  test("keeps a dark brand color", () => {
    expect(textColorOnWhite("#0284c7")).toBe("#0284c7");
    expect(textColorOnWhite("#0f172a")).toBe("#0f172a");
  });

  test("falls back to black when the color is too light to read on white", () => {
    expect(textColorOnWhite("#f59e0b")).toBe("#000000");
  });
});
