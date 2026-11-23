import "server-only";
import type { Locale } from "./config";
import fr, { type Dictionary } from "./dictionaries/fr";
import en from "./dictionaries/en";
import ar from "./dictionaries/ar";
import { getTranslationOverrides } from "@/server/content/queries";
import { applyOverrides } from "./flatten";

export const baseDictionaries: Record<Locale, Dictionary> = { fr, en, ar };

/** Code dictionary merged with admin overrides from the `translations` table. */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const overrides = await getTranslationOverrides(locale);
  return applyOverrides(baseDictionaries[locale], overrides);
}

export type { Dictionary };
