/**
 * horoscope/weekly-narrative.js
 *
 * AstroLight Weekly Horoscope
 * Reader Presentation / Narrative Layer
 *
 * IMPORTANT:
 * - Does NOT modify Daily logic.
 * - Does NOT calculate astrology.
 * - Does NOT calculate scores.
 * - Does NOT invent a new astrology engine.
 * - Uses the existing Weekly interpretation/evidence model.
 * - Reuses reader-facing Daily prose where available.
 *
 * Architecture:
 *
 * Daily Profile
 *      ↓
 * Weekly Evidence
 *      ↓
 * Weekly Interpretation
 *      ↓
 * THIS FILE
 *      ↓
 * Reader-friendly Weekly Narrative
 */

const CATEGORY_LABELS = {
  general: "Overall Energy",
  love: "Love & Relationships",
  career: "Career & Purpose",
  money: "Money & Resources",
  energy: "Energy & Wellbeing",
  communication: "Communication",
  emotional: "Emotional Balance",
  opportunity: "Opportunities",
  guidance: "Guidance",
};

const CATEGORY_ICONS = {
  general: "✨",
  love: "❤️",
  career: "💼",
  money: "💰",
  energy: "⚡",
  communication: "💬",
  emotional: "🌙",
  opportunity: "🌟",
  guidance: "🧭",
};

const CATEGORY_ORDER = [
  "love",
  "career",
  "money",
  "energy",
  "communication",
  "emotional",
  "opportunity",
  "guidance",
];

function labelCategory(category) {
  return (
    CATEGORY_LABELS[category] ??
    String(category ?? "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, letter => letter.toUpperCase())
  );
}

function iconCategory(category) {
  return CATEGORY_ICONS[category] ?? "✨";
}

function normalizeTone(tone) {
  if (tone === "supportive") return "supportive";
  if (tone === "challenging") return "challenging";
  return "balanced";
}

/*
 * -------------------------------------------------------
 * READER-FACING TONE LANGUAGE
 * -------------------------------------------------------
 */

function tonePhrase(tone) {
  switch (normalizeTone(tone)) {
    case "supportive":
      return "supportive";

    case "challenging":
      return "more demanding";

    default:
      return "mixed";
  }
}

function toneDescription(tone) {
  switch (normalizeTone(tone)) {
    case "supportive":
      return (
        "The week has a constructive feel, with several areas offering room for progress, connection and useful movement."
      );

    case "challenging":
      return (
        "The week may ask for more patience and thoughtful choices, particularly when circumstances do not move as quickly as expected."
      );

    default:
      return (
        "The week has a mixed but manageable rhythm, with some areas flowing more easily while others benefit from patience and adjustment."
      );
  }
}

/*
 * -------------------------------------------------------
 * DAILY PROSE ACCESS
 * -------------------------------------------------------
 */

function getDailySamples(profile) {
  return profile?.evidence?.samples ?? [];
}

function getDailySectionProse(
  profile,
  category
) {
  const samples = getDailySamples(profile);

  const values = [];

  for (const sample of samples) {
    const text =
      sample?.dailyProfile?.prose?.sections?.[category];

    if (typeof text === "string" && text.trim()) {
      values.push(text.trim());
    }
  }

  return [...new Set(values)];
}

/*
 * Extract the most commonly recurring Daily prose.
 *
 * This does not create meaning.
 * It simply identifies existing reader-facing
 * prose that occurs repeatedly during the week.
 */
function recurringDailyProse(
  profile,
  category
) {
  const samples = getDailySamples(profile);

  const counts = new Map();

  for (const sample of samples) {
    const text =
      sample?.dailyProfile?.prose?.sections?.[category];

    if (
      typeof text !== "string" ||
      !text.trim()
    ) {
      continue;
    }

    const normalized = text.trim();

    counts.set(
      normalized,
      (counts.get(normalized) ?? 0) + 1
    );
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(a[0]);
    });

  return ranked[0]?.[0] ?? "";
}

/*
 * -------------------------------------------------------
 * WEEKLY SUMMARY
 * -------------------------------------------------------
 */

export function buildWeeklySummary(profile) {
  const interpretation =
    profile?.interpretation ?? {};

  const focus =
    interpretation.focus ??
    profile?.focus ??
    null;

  const focusCategory =
    typeof focus === "string"
      ? focus
      : focus?.category ?? null;

  const focusLabel =
    labelCategory(focusCategory);

  const overallTone =
    normalizeTone(
      interpretation.overallTone ??
      profile?.overallTone
    );

  let text =
    `This week has a ${tonePhrase(overallTone)} overall feel. `;

  if (focusCategory) {
    text +=
      `${focusLabel} stands out as the main theme of the week. `;
  }

  text += toneDescription(overallTone);

  return text;
}

/*
 * -------------------------------------------------------
 * MAIN THEME
 * -------------------------------------------------------
 */

export function buildMainThemeNarrative(profile) {
  const interpretation =
    profile?.interpretation ?? {};

  const focus =
    interpretation.focus ??
    profile?.focus ??
    null;

  const category =
    typeof focus === "string"
      ? focus
      : focus?.category ?? null;

  if (!category) {
    return {
      category: null,
      label: "The Week Ahead",
      icon: "✨",
      text:
        "Several themes work together this week. Stay attentive to what develops and allow your priorities to guide your choices.",
    };
  }

  const label =
    labelCategory(category);

  const icon =
    iconCategory(category);

  const recurring =
    recurringDailyProse(
      profile,
      category
    );

  if (recurring) {
    return {
      category,
      label,
      icon,
      text:
        `The week's main theme is ${label.toLowerCase()}. ${recurring}`,
    };
  }

  const tone =
    normalizeTone(
      interpretation.categories?.[category]?.tone
    );

  const fallback = {
    supportive:
      `${label} brings constructive potential this week. Stay open to useful possibilities while keeping your choices practical.`,

    challenging:
      `${label} may require a little more patience this week. Give yourself time to respond thoughtfully rather than rushing a conclusion.`,

    balanced:
      `${label} benefits from awareness and balance this week. Allow circumstances to develop before deciding what they mean.`,
  };

  return {
    category,
    label,
    icon,
    text:
      fallback[tone] ?? fallback.balanced,
  };
}

/*
 * -------------------------------------------------------
 * CATEGORY NARRATIVE
 * -------------------------------------------------------
 *
 * Uses existing Daily reader-facing prose whenever
 * possible. The Weekly layer does not invent a new
 * interpretation for the category.
 * -------------------------------------------------------
 */

export function buildCategoryNarrative(
  categories = {},
  profile = null
) {
  const results = [];

  for (const categoryName of CATEGORY_ORDER) {
    const category =
      categories?.[categoryName];

    if (!category) {
      continue;
    }

    const tone =
      normalizeTone(category.tone);

    let text =
      recurringDailyProse(
        profile,
        categoryName
      );

    /*
     * If no exact recurring Daily prose exists,
     * use the existing Weekly tone only as a
     * very light presentation fallback.
     */
    if (!text) {
      const fallback = {
        supportive:
          "This area carries a constructive tone this week.",

        challenging:
          "This area may benefit from patience and thoughtful choices this week.",

        balanced:
          "This area has a mixed but manageable tone this week.",
      };

      text =
        fallback[tone];
    }

    results.push({
      category: categoryName,
      label:
        labelCategory(categoryName),
      icon:
        iconCategory(categoryName),
      tone,
      text,
    });
  }

  return results;
}

/*
 * -------------------------------------------------------
 * WEEKLY GUIDANCE
 * -------------------------------------------------------
 */

export function buildWeeklyGuidance(
  categories = {},
  profile = null
) {
  const supportive = [];
  const challenging = [];

  for (const categoryName of CATEGORY_ORDER) {
    const category =
      categories?.[categoryName];

    if (!category) {
      continue;
    }

    const tone =
      normalizeTone(category.tone);

    const prose =
      recurringDailyProse(
        profile,
        categoryName
      );

    if (tone === "supportive") {
      supportive.push({
        category: categoryName,
        text: prose,
      });
    }

    if (tone === "challenging") {
      challenging.push({
        category: categoryName,
        text: prose,
      });
    }
  }

  const focus =
    profile?.interpretation?.focus ??
    profile?.focus ??
    null;

  const focusCategory =
    typeof focus === "string"
      ? focus
      : focus?.category ?? null;

  const focusLabel =
    labelCategory(focusCategory);

  const guidance = [];

  if (supportive.length) {
    guidance.push(
      `Make use of the areas that feel naturally constructive, particularly ${formatList(
        supportive.map(item =>
          labelCategory(item.category)
        )
      ).toLowerCase()}.`
    );
  }

  if (challenging.length) {
    guidance.push(
      `Give extra patience to ${formatList(
        challenging.map(item =>
          labelCategory(item.category)
        )
      ).toLowerCase()}.`
    );
  }

  if (focusCategory) {
    guidance.push(
      `${focusLabel} remains the central theme, so let your decisions reflect what matters most to you this week.`
    );
  }

  if (!guidance.length) {
    guidance.push(
      "Stay attentive to the week's changing rhythm and allow practical judgment to guide your choices."
    );
  }

  return [...new Set(guidance)];
}

/*
 * -------------------------------------------------------
 * PLANETARY INFLUENCES
 * -------------------------------------------------------
 *
 * Technical planetary evidence is retained internally.
 * The reader receives a simple description rather than
 * scores or mathematical measurements.
 * -------------------------------------------------------
 */

export function buildPlanetaryNarrative(
  planetary = []
) {
  if (!Array.isArray(planetary)) {
    return [];
  }

  const recurring =
    planetary
      .map(item => {
        const supportiveDays =
          Number(item.supportiveDays ?? 0);

        const challengingDays =
          Number(item.challengingDays ?? 0);

        const balancedDays =
          Number(item.balancedDays ?? 0);

        return {
          ...item,
          sampledDays:
            supportiveDays +
            challengingDays +
            balancedDays,
        };
      })
      .filter(item =>
        item.sampledDays > 1
      )
      .sort(
        (a, b) =>
          b.sampledDays -
          a.sampledDays
      )
      .slice(0, 5);

  return recurring.map(item => ({
    planet:
      item.planet ?? "Planet",

    tone:
      normalizeTone(item.tone),

    theme:
      item.theme ?? "",

    sampledDays:
      item.sampledDays,
  }));
}

/*
 * -------------------------------------------------------
 * ASPECTS
 * -------------------------------------------------------
 */

export function buildAspectNarrative(
  aspects = []
) {
  if (!Array.isArray(aspects)) {
    return [];
  }

  return aspects
    .filter(aspect =>
      Number(aspect.occurrences ?? 0) > 1
    )
    .slice(0, 5)
    .map(aspect => ({
      a: aspect.a ?? "",
      b: aspect.b ?? "",
      aspect: aspect.aspect ?? "",
      occurrences:
        Number(aspect.occurrences ?? 0),
    }));
}

/*
 * -------------------------------------------------------
 * LEGACY COMPATIBILITY
 * -------------------------------------------------------
 *
 * These functions remain exported because existing
 * code may still reference them.
 * -------------------------------------------------------
 */

export function buildPersistentThemesNarrative(
  persistentThemes = []
) {
  if (!persistentThemes.length) {
    return "";
  }

  const supportive =
    persistentThemes
      .filter(theme =>
        normalizeTone(theme.tone) ===
        "supportive"
      )
      .map(theme =>
        labelCategory(theme.category)
      );

  const challenging =
    persistentThemes
      .filter(theme =>
        normalizeTone(theme.tone) ===
        "challenging"
      )
      .map(theme =>
        labelCategory(theme.category)
      );

  const parts = [];

  if (supportive.length) {
    parts.push(
      `${formatList(supportive)} show a constructive pattern through the week.`
    );
  }

  if (challenging.length) {
    parts.push(
      `${formatList(challenging)} may need a little more care and patience.`
    );
  }

  return parts.join(" ");
}

export function buildTransitionsNarrative(
  transitions = []
) {
  if (!transitions.length) {
    return "";
  }

  const categories = [
    ...new Set(
      transitions
        .map(item => item.category)
        .filter(Boolean)
    ),
  ];

  if (!categories.length) {
    return "";
  }

  return `Some themes may shift in emphasis during the week, particularly around ${formatList(
    categories.map(labelCategory)
  ).toLowerCase()}.`;
}

/*
 * -------------------------------------------------------
 * COMPLETE WEEKLY NARRATIVE
 * -------------------------------------------------------
 */

export function buildWeeklyNarrative(profile) {
  if (!profile) {
    throw new Error(
      "Weekly narrative requires a Weekly profile."
    );
  }

  const interpretation =
    profile.interpretation ?? {};

  const categories =
    interpretation.categories ??
    profile.categories ??
    {};

  const summary =
    buildWeeklySummary(profile);

  const mainTheme =
    buildMainThemeNarrative(profile);

  const categoryCards =
    buildCategoryNarrative(
      categories,
      profile
    );

  const guidance =
    buildWeeklyGuidance(
      categories,
      profile
    );

  const planetary =
    buildPlanetaryNarrative(
      interpretation.planetary ??
      profile.planetary ??
      []
    );

  const aspects =
    buildAspectNarrative(
      interpretation.aspects ??
      profile.aspects ??
      []
    );

  return {
    summary,

    mainTheme,

    categories:
      categoryCards,

    guidance,

    planetary,

    aspects,

    /*
     * Keep these fields for compatibility.
     * They are no longer the primary UI.
     */
    themes:
      buildPersistentThemesNarrative(
        interpretation.persistentThemes ??
        []
      ),

    transitions:
      buildTransitionsNarrative(
        interpretation.transitions ??
        []
      ),

    sections: {
      summary,
      mainTheme,
      categories:
        categoryCards,
      guidance,
      planetary,
      aspects,
    },
  };
}

/*
 * -------------------------------------------------------
 * FORMAT LIST
 * -------------------------------------------------------
 */

function formatList(items) {
  const values =
    items.filter(Boolean);

  if (!values.length) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return (
    values.slice(0, -1).join(", ") +
    ", and " +
    values[values.length - 1]
  );
}