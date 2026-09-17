/**
 * AstroLight Yearly Horoscope
 * Reader-facing presentation layer.
 *
 * The yearly calculation engine remains in yearly-profile.js.
 * This renderer uses prose.js to turn each existing monthly
 * interpretation into the same reader-facing language used
 * by the Daily Horoscope, while adapting the wording for
 * yearly and monthly contexts.
 */

import { generateYearlyProfile } from "./yearly-profile.js";
import { generateHoroscopeProse } from "./prose.js";

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

const CATEGORY_LABELS = {
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
  love: "❤️",
  career: "💼",
  money: "💰",
  energy: "⚡",
  communication: "💬",
  emotional: "🌙",
  opportunity: "🌟",
  guidance: "🧭",
};

const CATEGORY_MEANINGS = {
  love: "Relationships, affection, connection, harmony and the way you relate to others.",
  career: "Work, professional direction, ambition, responsibilities and long-term purpose.",
  money: "Finances, resources, spending, stability and material priorities.",
  energy: "Motivation, activity, vitality and how actively you approach your daily life.",
  communication: "Conversation, learning, ideas, decisions and expressing yourself clearly.",
  emotional: "Feelings, inner reflection, sensitivity and emotional responses.",
  opportunity: "New possibilities, openings, growth and areas where circumstances may create room to move forward.",
  guidance: "The practical approach or attitude suggested by the overall reading.",
};

const PLANET_MEANINGS = {
  Sun: "Identity, confidence, vitality and self-expression.",
  Moon: "Emotions, inner reflection, comfort and instinctive responses.",
  Mercury: "Communication, learning, ideas, information and decision-making.",
  Venus: "Relationships, affection, harmony, attraction and personal values.",
  Mars: "Action, initiative, determination, drive and physical energy.",
  Jupiter: "Growth, learning, opportunity, optimism and expansion.",
  Saturn: "Responsibility, discipline, boundaries, patience and long-term effort.",
  Uranus: "Change, independence, innovation and unexpected developments.",
  Neptune: "Imagination, intuition, dreams, ideals and sensitivity.",
  Pluto: "Transformation, renewal, deep change and releasing old patterns.",
};

const ASPECT_MEANINGS = {
  conjunction:
    "Two planetary influences appear close together. Traditionally this is read as a blending or concentration of their themes.",
  sextile:
    "A sextile is traditionally viewed as an opportunity-oriented connection that can encourage cooperation between the two themes.",
  trine:
    "A trine is traditionally associated with a smooth or harmonious flow between the two planetary themes.",
  square:
    "A square is traditionally interpreted as a point of tension or friction that can call for adjustment and awareness.",
  opposition:
    "An opposition places two themes across from one another and is traditionally read as a need to find balance between them.",
};

function meaningDetails(title, text) {
  if (!text) return "";

  return `
    <details class="horoscope-meaning">
      <summary>ⓘ ${escapeHTML(title)}</summary>
      <p>${escapeHTML(text)}</p>
    </details>
  `;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Adapt reader-facing Daily prose to the time context
 * in which it is being displayed.
 *
 * This does not modify the underlying interpretation
 * or prose.js. It only changes temporal wording.
 */
function adaptProseForContext(text, context = "yearly") {
  if (!text || typeof text !== "string") return text;

  let result = text;

  if (context === "monthly") {
    result = result
      .replace(/\btoday's\b/gi, "this month's")
      .replace(/\btoday\b/gi, "this month")
      .replace(/\bthe day's\b/gi, "this month's")
      .replace(/\bthe day\b/gi, "this month")
      .replace(/\btonight\b/gi, "this month")
      .replace(/\btomorrow\b/gi, "in the coming days");

    /*
     * Restore sentence capitalization after replacements.
     */
    result = result
      .replace(/^this month\b/, "This month")
      .replace(/([.!?]\s+)this month\b/g, "$1This month");
  } else {
    result = result
      .replace(/\btoday's\b/gi, "this year's")
      .replace(/\btoday\b/gi, "this year")
      .replace(/\bthe day's\b/gi, "this year's")
      .replace(/\bthe day\b/gi, "this year")
      .replace(/\btonight\b/gi, "during this period")
      .replace(/\btomorrow\b/gi, "in the months ahead");

    /*
     * Restore sentence capitalization after replacements.
     */
    result = result
      .replace(/^this year\b/, "This year")
      .replace(/([.!?]\s+)this year\b/g, "$1This year");
  }

  return result;
}

function toneText(tone) {
  if (tone === "supportive") return "constructive";
  if (tone === "challenging") return "more demanding";
  return "mixed";
}

/**
 * Build the monthly prose collection.
 *
 * IMPORTANT:
 * Keep the original prose here.
 *
 * The same source prose is later adapted separately:
 * - Yearly Life Areas → yearly context
 * - Yearly Guidance → yearly context
 * - Monthly Rhythm → monthly context
 */
function monthProse(profile) {
  return (profile.samples ?? []).map(sample => {
    const interpretation = sample.interpretation;
    let prose = sample.prose ?? null;

    if (!prose && interpretation) {
      prose = generateHoroscopeProse(
        profile.sunSign,
        interpretation,
        new Date(sample.dateUTC)
      );
    }

    return {
      dateUTC: sample.dateUTC,
      interpretation,
      prose,
    };
  });
}

/**
 * Collect recurring prose for a category.
 *
 * Recurring Life Areas are displayed in yearly context,
 * so Daily temporal wording is adapted to "this year".
 */
function recurringProse(months, category) {
  const values = new Map();

  for (const month of months) {
    const rawText = month.prose?.sections?.[category];
    const text = adaptProseForContext(rawText, "yearly");

    if (!text || typeof text !== "string") continue;

    const value = text.trim();
    values.set(value, (values.get(value) ?? 0) + 1);
  }

  return [...values.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([text]) => text);
}

function categoryTone(profile, category) {
  return profile.categories?.[category]?.tone ?? "balanced";
}

function buildYearSummary(profile) {
  const focus = profile.focus?.category ?? profile.focus;
  const focusLabel = CATEGORY_LABELS[focus] ?? "Your priorities";
  const tone = toneText(profile.overallTone);

  return `The year has a ${tone} overall rhythm. ${focusLabel} stands out as an important theme, while the other areas move through their own changing phases across the year.`;
}

function buildCategoryCards(profile, months) {
  return CATEGORY_ORDER.map(category => {
    const prose = recurringProse(months, category);
    const tone = categoryTone(profile, category);

    let text = prose[0];

    if (!text) {
      text =
        tone === "supportive"
          ? "This area carries constructive potential during the year."
          : tone === "challenging"
            ? "This area may call for patience and thoughtful choices at times during the year."
            : "This area moves through a mixed rhythm during the year.";
    }

    return {
      category,
      label: CATEGORY_LABELS[category],
      icon: CATEGORY_ICONS[category],
      tone,
      text,
    };
  });
}

function renderHero(profile) {
  return `
    <header class="yearly-reader-hero">
      <p class="yearly-eyebrow">YEARLY HOROSCOPE</p>
      <h1>${escapeHTML(profile.sunSign)}</h1>
      <p class="yearly-period">${escapeHTML(String(profile.year))}</p>
      <p class="yearly-hero-intro">
        A year-long view of the themes, opportunities and lessons unfolding across the months ahead.
      </p>
    </header>
  `;
}

function renderSummary(profile) {
  return `
    <section class="yearly-reader-card yearly-summary-card">
      <div class="yearly-reader-heading">
        <span>✨</span>
        <h2>Your Year at a Glance</h2>
      </div>

      <p class="yearly-lead">
        ${escapeHTML(buildYearSummary(profile))}
      </p>
    </section>
  `;
}

function renderLifeAreas(categories) {
  return `
    <section class="yearly-reader-card yearly-life-areas">
      <div class="yearly-reader-heading">
        <span>🌿</span>
        <h2>Your Life Areas</h2>
      </div>

      <div class="yearly-life-grid">
        ${categories
          .map(
            category => `
              <article class="yearly-life-card">
                <div class="yearly-life-card-heading">
                  <span>${escapeHTML(category.icon)}</span>
                  <h3>${escapeHTML(category.label)}</h3>
                </div>

                <p>${escapeHTML(category.text)}</p>

                ${meaningDetails(
                  "What does this life area mean?",
                  CATEGORY_MEANINGS[category.category]
                )}
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMonthlyRhythm(profile, months) {
  return `
    <section class="yearly-reader-card yearly-monthly-rhythm">
      <div class="yearly-reader-heading">
        <span>🌙</span>
        <h2>Monthly Rhythm</h2>
      </div>

      <p class="yearly-section-intro">
        Each month adds a different emphasis to the larger story of your year.
      </p>

      <div class="yearly-month-grid">
        ${months
          .map(month => {
            const interpretation = month.interpretation ?? {};

            const focus =
              interpretation.focus?.category ??
              interpretation.focus ??
              null;

            /*
             * Preserve the original Daily prose first.
             * Only then adapt it for the monthly context.
             */
            const rawText =
              focus && month.prose?.sections?.[focus]
                ? month.prose.sections[focus]
                : month.prose?.sections?.general ??
                  "Let the month's circumstances develop naturally and respond with awareness.";

            const text = adaptProseForContext(rawText, "monthly");

            return `
              <article class="yearly-month-card">
                <p class="yearly-month-name">
                  ${escapeHTML(
                    formatDate(new Date(month.dateUTC))
                  )}
                </p>

                <p>${escapeHTML(text)}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderGuidance(profile, months) {
  const focus = profile.focus?.category ?? profile.focus;
  const label = CATEGORY_LABELS[focus] ?? "your priorities";

  /*
   * recurringProse() already adapts Guidance to yearly context.
   */
  const guidance = recurringProse(months, "guidance")[0];

  return `
    <section class="yearly-reader-card yearly-guidance">
      <div class="yearly-reader-heading">
        <span>🧭</span>
        <h2>Guidance for the Year</h2>
      </div>

      <p>
        ${escapeHTML(
          guidance ??
            `Keep ${label.toLowerCase()} in view while allowing the year to unfold one phase at a time.`
        )}
      </p>
    </section>
  `;
}

function renderYearlyHoroscope(container, profile) {
  const months = monthProse(profile);
  const categories = buildCategoryCards(profile, months);

  container.innerHTML = `
    <div class="yearly-horoscope yearly-horoscope-reader">

      ${renderHero(profile)}

      ${renderSummary(profile)}

      ${renderLifeAreas(categories)}

      ${renderMonthlyRhythm(profile, months)}

      <section class="yearly-reader-card horoscope-glossary">

        <div class="yearly-reader-heading">
          <span>📖</span>
          <h2>Understanding Your Reading</h2>
        </div>

        ${meaningDetails(
          "Supportive, Challenging and Balanced",
          `
          Supportive means the underlying interpretation points toward a more constructive or open period.
          Challenging means it points toward an area that may require patience, awareness or adjustment.
          Balanced means neither direction is strongly dominant.
        `
        )}

        ${meaningDetails(
          "What do the planetary terms mean?",
          Object.entries(PLANET_MEANINGS)
            .map(([planet, meaning]) => `${planet}: ${meaning}`)
            .join(" ")
        )}

        ${meaningDetails(
          "What do the aspect terms mean?",
          Object.entries(ASPECT_MEANINGS)
            .map(([aspect, meaning]) => `${aspect}: ${meaning}`)
            .join(" ")
        )}

        ${meaningDetails(
          "How the Yearly reading is created",
          `
          AstroLight evaluates twelve monthly astronomical snapshots and brings the existing monthly interpretations together to describe the broader themes of the year.
          The reader-facing interpretation is presented as a traditional astrological reading for reflection and entertainment, not as a scientifically established prediction.
        `
        )}

      </section>

      ${renderGuidance(profile, months)}

      <p class="yearly-reader-note">
        This reading is a year-long synthesis of the twelve monthly astrological samples.
      </p>

    </div>
  `;
}

async function initializeYearlyHoroscope() {
  const container = document.getElementById("horoscope-text");

  if (!container) return;

  const sign = container.dataset.sign;

  if (!sign) return;

  const year =
    Number(container.dataset.year) ||
    new Date().getUTCFullYear();

  try {
    container.innerHTML = `
      <div class="yearly-loading">
        <p>Preparing your yearly reading…</p>
      </div>
    `;

    const profile = await generateYearlyProfile(sign, year);

    renderYearlyHoroscope(container, profile);
  } catch (error) {
    console.error("AstroLight Yearly Horoscope error:", error);

    container.innerHTML = `
      <div class="yearly-error">
        <h2>Yearly reading unavailable</h2>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

initializeYearlyHoroscope();