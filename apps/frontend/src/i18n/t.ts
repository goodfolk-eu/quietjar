import enCompare from "./en/compare.json";
import enDashboardFeedback from "./en/dashboard/feedback.json";
import enDashboardGoals from "./en/dashboard/goals.json";
import enDashboardHome from "./en/dashboard/home.json";
import enDashboard from "./en/dashboard/index.json";
import enDashboardPage from "./en/dashboard/page.json";
import enDashboardPayout from "./en/dashboard/payout.json";
import enDashboardProfile from "./en/dashboard/profile.json";
import enDashboardWidget from "./en/dashboard/widget.json";
import enDevelopers from "./en/developers.json";
import enFeatures from "./en/features.json";
import enHome from "./en/home.json";
import enHosted from "./en/hosted.json";
import enLegal from "./en/legal.json";
import enPricing from "./en/pricing.json";
import enShared from "./en/shared.json";

const dictionaries = {
  en: {
    ...enShared,
    ...enHome,
    ...enHosted,
    ...enDashboard,
    ...enDashboardHome,
    ...enDashboardWidget,
    ...enDashboardGoals,
    ...enDashboardPage,
    ...enDashboardPayout,
    ...enDashboardProfile,
    ...enDashboardFeedback,
    ...enLegal,
    ...enDevelopers,
    ...enFeatures,
    ...enCompare,
    ...enPricing,
  },
} as const;

export type LocaleKey = keyof typeof dictionaries;

export type Dictionary = (typeof dictionaries)[LocaleKey];

export function dictionary(locale: string): Dictionary {
  return dictionaries[(locale as LocaleKey) in dictionaries ? (locale as LocaleKey) : "en"];
}
