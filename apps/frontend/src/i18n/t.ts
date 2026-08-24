import enDashboard from "./en/dashboard.json";
import enHome from "./en/home.json";
import enShared from "./en/shared.json";

const dictionaries = {
  en: {
    ...enShared,
    ...enHome,
    ...enDashboard,
  },
} as const;

export type LocaleKey = keyof typeof dictionaries;

export type Dictionary = (typeof dictionaries)[LocaleKey];

export function dictionary(locale: string): Dictionary {
  return dictionaries[(locale as LocaleKey) in dictionaries ? (locale as LocaleKey) : "en"];
}
