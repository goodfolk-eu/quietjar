import enCompare from "./en/compare.json";
import enDashboardHome from "./en/dashboard/home.json";
import enDashboard from "./en/dashboard/index.json";
import enDashboardPayments from "./en/dashboard/payments.json";
import enDashboardWidget from "./en/dashboard/widget.json";
import enDevelopers from "./en/developers.json";
import enHome from "./en/home.json";
import enLegal from "./en/legal.json";
import enPricing from "./en/pricing.json";
import enShared from "./en/shared.json";

const dictionaries = {
  en: {
    ...enShared,
    ...enHome,
    ...enDashboard,
    ...enDashboardHome,
    ...enDashboardWidget,
    ...enDashboardPayments,
    ...enLegal,
    ...enDevelopers,
    ...enCompare,
    ...enPricing,
  },
} as const;

export type LocaleKey = keyof typeof dictionaries;

export type Dictionary = (typeof dictionaries)[LocaleKey];

export function dictionary(locale: string): Dictionary {
  return dictionaries[(locale as LocaleKey) in dictionaries ? (locale as LocaleKey) : "en"];
}
