// ============================================================
// AstroLight Weekly Horoscope
// Weekly Interpretation Layer
//
// IMPORTANT:
// - Daily interpretation remains canonical.
// - This file does NOT modify Daily logic.
// - Weekly interpretation consumes preserved Daily evidence.
// - No reconstruction of Daily prose from raw scores.
// ============================================================

const CATEGORY_NAMES = [
  "general",
  "love",
  "career",
  "money",
  "energy",
  "communication",
  "emotional",
  "opportunity",
  "guidance",
];

function normalizeTone(value) {
  if (value === "supportive") return "supportive";
  if (value === "challenging") return "challenging";
  return "balanced";
}


/**
 * Determine the dominant weekly tone from the
 * already-interpreted Daily category evidence.
 */
export function determineWeeklyTone(evidence) {
  const counts = {
    supportive: 0,
    challenging: 0,
    balanced: 0,
  };

  for (const categoryName of CATEGORY_NAMES) {
    const category = evidence.categories?.[categoryName];

    if (!category) continue;

    const supportive =
      Number(category.supportiveDays ?? 0);

    const challenging =
      Number(category.challengingDays ?? 0);

    const balanced =
      Number(category.balancedDays ?? 0);

    counts.supportive += supportive;
    counts.challenging += challenging;
    counts.balanced += balanced;
  }

  if (
    counts.supportive > counts.challenging &&
    counts.supportive > counts.balanced
  ) {
    return "supportive";
  }

  if (
    counts.challenging > counts.supportive &&
    counts.challenging > counts.balanced
  ) {
    return "challenging";
  }

  return "balanced";
}


/**
 * Find the category carrying the strongest recurring
 * interpretation across the week.
 *
 * Uses the aggregate `average` produced by
 * weekly-evidence.js.
 */
/**
 * Determine the primary Weekly focus from
 * recurring Daily interpretations.
 *
 * Daily interpretation remains canonical.
 *
 * We do NOT choose the focus by taking the
 * largest numerical category average.
 */
export function determineWeeklyFocus(
  categories,
  evidence
) {
  const samples =
    evidence?.samples ?? [];

  const focusCounts = {};


  /*
   * Daily interpretation is canonical.
   *
   * Each Weekly evidence sample contains
   * the complete Daily profile.
   */
  for (const sample of samples) {

    const dailyFocus =
      sample?.dailyProfile?.interpretation?.focus;


    if (!dailyFocus) {
      continue;
    }


    const focusCategory =
      typeof dailyFocus === "string"
        ? dailyFocus
        : dailyFocus?.category;


    if (!focusCategory) {
      continue;
    }


    const normalized =
      String(focusCategory)
        .trim()
        .toLowerCase();


    focusCounts[normalized] =
      (focusCounts[normalized] ?? 0) + 1;
  }


  /*
   * Select the focus that recurs most
   * frequently across the Daily profiles.
   */
  let primaryFocus = null;
  let primaryCount = 0;


  for (
    const [category, count]
    of Object.entries(focusCounts)
  ) {

    if (count > primaryCount) {
      primaryFocus = category;
      primaryCount = count;
    }
  }


  /*
   * Daily focus evidence exists.
   */
  if (primaryFocus) {

    const category =
      categories?.[primaryFocus];


    return {
      category:
        primaryFocus,

      strength:
        Number(category?.average ?? 0),

      average:
        Number(category?.average ?? 0),

      tone:
        category?.tone ?? "balanced",

      occurrence:
        primaryCount,

      sampleCount:
        samples.length,

      basis:
        "recurring-daily-focus",
    };
  }


  /*
   * Fallback only if Daily focus
   * cannot be found.
   */
  let strongest = null;


  for (const categoryName of CATEGORY_NAMES) {

    if (categoryName === "guidance") {
      continue;
    }


    const category =
      categories?.[categoryName];


    if (!category) {
      continue;
    }


    const average =
      Number(category.average ?? 0);

    const strength =
      Math.abs(average);


    if (
      !strongest ||
      strength > strongest.strength
    ) {

      strongest = {
        category:
          categoryName,

        strength,

        average,

        tone:
          category.tone || "balanced",

        basis:
          "category-average-fallback",
      };
    }
  }


  return strongest;
}
/**
 * Identify persistent themes.
 *
 * A theme is persistent when the same interpretation tone
 * appears on at least half of the sampled Daily profiles.
 */
export function determinePersistentThemes(categories) {
  const themes = [];

  for (const categoryName of CATEGORY_NAMES) {
    const category = categories?.[categoryName];

    if (!category) continue;

    const supportive =
      Number(category.supportiveDays ?? 0);

    const challenging =
      Number(category.challengingDays ?? 0);

    const balanced =
      Number(category.balancedDays ?? 0);

    const sampleCount =
      supportive +
      challenging +
      balanced;

    if (!sampleCount) continue;

    const threshold =
      Math.ceil(sampleCount / 2);

    if (supportive >= threshold) {
      themes.push({
        category: categoryName,
        tone: "supportive",
        days: supportive,
      });
    }

    if (challenging >= threshold) {
      themes.push({
        category: categoryName,
        tone: "challenging",
        days: challenging,
      });
    }
  }

  return themes;
}


/**
 * Detect transitions in the preserved Daily interpretations.
 */
export function determineTransitions(categories) {
  const transitions = [];

  for (const categoryName of CATEGORY_NAMES) {
    const category =
      categories?.[categoryName];

    if (!category?.sourceInterpretations?.length) {
      continue;
    }

    const signals =
      category.sourceInterpretations;

    for (let i = 1; i < signals.length; i++) {
      const previous =
        signals[i - 1]?.interpretation;

      const current =
        signals[i]?.interpretation;

      const previousTone =
        normalizeTone(previous?.tone);

      const currentTone =
        normalizeTone(current?.tone);

      if (previousTone !== currentTone) {
        transitions.push({
          category: categoryName,

          from: previousTone,

          to: currentTone,

          fromDate:
            signals[i - 1]?.dateUTC ?? null,

          toDate:
            signals[i]?.dateUTC ?? null,
        });
      }
    }
  }

  return transitions;
}


/**
 * Preserve a Weekly category interpretation.
 *
 * The original Daily category interpretations remain
 * available through sourceInterpretations.
 */
export function interpretCategory(
  categoryName,
  category
) {
  if (!category) {
    return {
      category: categoryName,

      tone: "balanced",

      total: 0,

      average: 0,

      sampleCount: 0,

      supportiveDays: 0,

      challengingDays: 0,

      balancedDays: 0,

      sourceInterpretations: [],

      strongest: [],

      aspectSignals: [],
    };
  }

  const supportiveDays =
    Number(category.supportiveDays ?? 0);

  const challengingDays =
    Number(category.challengingDays ?? 0);

  const balancedDays =
    Number(category.balancedDays ?? 0);

  const sampleCount =
    supportiveDays +
    challengingDays +
    balancedDays;

  return {
    category: categoryName,

    tone:
      category.tone || "balanced",

    total:
      Number(category.total ?? 0),

    average:
      Number(category.average ?? 0),

    sampleCount,

    supportiveDays,

    challengingDays,

    balancedDays,

    // Preserve the original Daily interpretations.
    sourceInterpretations:
      category.sourceInterpretations || [],

    strongest:
      category.strongest || [],

    aspectSignals:
      category.aspectSignals || [],
  };
}


/**
 * Main Weekly interpretation function.
 */
export function interpretWeeklyProfile(evidence) {
  if (!evidence) {
    throw new Error(
      "Weekly interpretation requires evidence."
    );
  }

  const categories = {};

  for (const categoryName of CATEGORY_NAMES) {
    categories[categoryName] =
      interpretCategory(
        categoryName,
        evidence.categories?.[categoryName]
      );
  }

  const overallTone =
    determineWeeklyTone({
      ...evidence,
      categories,
    });

    const focus =
      determineWeeklyFocus(
        categories,
        evidence
      );

  const persistentThemes =
    determinePersistentThemes(categories);

  const transitions =
    determineTransitions(categories);

  return {
    overallTone,

    focus,

    persistentThemes,

    transitions,

    categories,

    planetary:
      evidence.planetary || [],

    aspects:
      evidence.aspects || [],
  };
}