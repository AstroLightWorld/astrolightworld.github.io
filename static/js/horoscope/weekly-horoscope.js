/**
 * AstroLight Weekly Horoscope
 * Reader-facing presentation layer.
 *
 * Calculation/evidence logic remains untouched.
 *
 * IMPORTANT:
 * Weekly preserves the complete Daily profiles,
 * including Daily prose. This renderer uses that
 * preserved prose as the primary reader-facing
 * category content.
 */

import { generateWeeklyProfile } from "./weekly-profile.js";


/* =========================================================
   BASIC HELPERS
   ========================================================= */

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
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}


function formatPeriod(startDateUTC, endDateUTC) {
  return `${formatDate(new Date(startDateUTC))} – ${formatDate(
    new Date(endDateUTC)
  )}`;
}


function toneClass(tone) {
  if (tone === "supportive") return "is-supportive";
  if (tone === "challenging") return "is-challenging";
  return "is-balanced";
}


/* =========================================================
   READER MEANINGS
   ========================================================= */

const TERM_MEANINGS = {
  supportive:
    "A supportive theme suggests that this area may feel more open, constructive or easier to work with.",

  challenging:
    "A challenging theme suggests that this area may need extra patience, awareness or thoughtful choices.",

  balanced:
    "A balanced theme suggests that this area may move without a strong overall push in either direction.",
};


const CATEGORY_MEANINGS = {
  love:
    "Relationships, affection, connection, harmony and the way you relate to others.",

  career:
    "Work, professional direction, ambition, responsibilities and long-term purpose.",

  money:
    "Finances, resources, spending, stability and material priorities.",

  energy:
    "Motivation, activity, vitality and how actively you approach your daily life.",

  communication:
    "Conversation, learning, ideas, decisions and expressing yourself clearly.",

  emotional:
    "Feelings, inner reflection, sensitivity and emotional responses.",

  opportunity:
    "New possibilities, openings, growth and areas where circumstances may create room to move forward.",

  guidance:
    "The practical approach or attitude suggested by the overall reading.",
};


function meaningForCategory(category) {
  return CATEGORY_MEANINGS[category] ?? "";
}


function renderMeaningDetails(title, text, className = "") {
  if (!text) return "";

  return `
    <details class="horoscope-meaning ${escapeHTML(className)}">
      <summary>ⓘ ${escapeHTML(title)}</summary>
      <p>${escapeHTML(text)}</p>
    </details>
  `;
}


/* =========================================================
   WEEKLY PROSE CONTEXT
   ========================================================= */

/**
 * Daily prose is written for a single day.
 *
 * Weekly reader presentation should refer to
 * the week rather than "today" or "the day".
 *
 * The underlying Daily prose is NOT modified.
 * This only adapts the displayed copy.
 */
function adaptWeeklyProse(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = text;

  result = result
    .replace(/\btoday's\b/gi, "this week's")
    .replace(/\btoday\b/gi, "this week")
    .replace(/\bthe day's\b/gi, "this week's")
    .replace(/\bthe day\b/gi, "this week")
    .replace(/\btonight\b/gi, "this week")
    .replace(/\btomorrow\b/gi, "in the days ahead");

  /*
   * Restore sentence capitalization.
   */
  result = result
    .replace(/^this week\b/, "This week")
    .replace(/([.!?]\s+)this week\b/g, "$1This week");

  return result;
}


/* =========================================================
   DAILY PROSE EXTRACTION
   ========================================================= */

/**
 * Get the actual Daily prose for a Weekly category.
 *
 * Weekly-profile.js preserves complete Daily profiles
 * inside profile.samples[]. Each Daily profile contains
 * its generated prose.
 */
function getDailyCategoryProse(profile, category) {
  const samples = Array.isArray(profile?.samples)
    ? profile.samples
    : [];

  const values = [];

  for (const sample of samples) {
    const prose =
      sample?.prose ??
      sample?.dailyProfile?.prose ??
      null;

    const text =
      prose?.sections?.[category];

    if (
      typeof text === "string" &&
      text.trim()
    ) {
      values.push(text.trim());
    }
  }

  return values;
}


/**
 * Select the most recurring Daily prose.
 *
 * This prevents the Weekly page from simply displaying
 * the first day's reading. The most repeated reader-facing
 * interpretation becomes the Weekly category description.
 */
function getRecurringCategoryProse(profile, category) {
  const values = getDailyCategoryProse(
    profile,
    category
  );

  if (!values.length) {
    return "";
  }

  const counts = new Map();

  for (const value of values) {
    counts.set(
      value,
      (counts.get(value) ?? 0) + 1
    );
  }

  return [...counts.entries()]
    .sort((a, b) => {
      /*
       * Highest recurrence first.
       * If tied, preserve the first-seen order.
       */
      return b[1] - a[1];
    })
    .map(([text]) => text)[0] ?? "";
}


/* =========================================================
   HERO
   ========================================================= */

function renderHero(profile) {
  return `
    <header class="weekly-reader-hero">

      <p class="weekly-eyebrow">
        WEEKLY HOROSCOPE
      </p>

      <h1>
        ${escapeHTML(profile.sunSign)}
      </h1>

      <p class="weekly-period">
        ${escapeHTML(
          formatPeriod(
            profile.startDateUTC,
            profile.endDateUTC
          )
        )}
      </p>

      <p class="weekly-hero-intro">
        A gentle look at the themes unfolding across your week.
      </p>

    </header>
  `;
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary(narrative) {
  if (!narrative?.summary) {
    return "";
  }

  return `
    <section class="weekly-reader-card weekly-summary-card">

      <div class="weekly-reader-heading">
        <span>✨</span>
        <h2>Your Week at a Glance</h2>
      </div>

      <p class="weekly-lead">
        ${escapeHTML(narrative.summary)}
      </p>

    </section>
  `;
}


/* =========================================================
   MAIN THEME
   ========================================================= */

function renderMainTheme(theme) {
  if (!theme) {
    return "";
  }

  return `
    <section class="weekly-reader-card weekly-main-theme">

      <div class="weekly-reader-heading">
        <span>
          ${escapeHTML(theme.icon ?? "🌟")}
        </span>

        <h2>Your Main Theme</h2>
      </div>

      <h3>
        ${escapeHTML(theme.label)}
      </h3>

      <p>
        ${escapeHTML(theme.text)}
      </p>

      ${renderMeaningDetails(
        "What does the main theme mean?",
        "The main theme is the life area that appears most consistently in the underlying Daily readings. It is presented here as a theme to reflect on, not as a fixed prediction."
      )}

    </section>
  `;
}


/* =========================================================
   CATEGORY
   ========================================================= */

/**
 * Render one Weekly life-area card.
 *
 * PRIMARY TEXT SOURCE:
 *     Preserved Daily prose
 *
 * FALLBACK:
 *     Weekly narrative category text
 *
 * This is the key fix for the repeated generic sentence.
 */
function renderCategory(category, profile) {
  const categoryKey =
    category?.category ?? "";

  const tone =
    category?.tone ?? "balanced";

  const areaMeaning =
    meaningForCategory(categoryKey);

  /*
   * First try the actual recurring Daily prose.
   */
  let readerText =
    getRecurringCategoryProse(
      profile,
      categoryKey
    );

  /*
   * Adapt Daily wording for Weekly context.
   */
  readerText =
    adaptWeeklyProse(readerText);

  /*
   * Only use the Weekly narrative text if
   * no Daily prose was available.
   */
  if (!readerText) {
    readerText =
      category?.text ??
      "";
  }

  /*
   * Last-resort fallback only.
   *
   * This should normally NOT appear because
   * Weekly preserves Daily prose.
   */
  if (!readerText) {
    readerText =
      tone === "supportive"
        ? "This area carries a constructive tone this week."
        : tone === "challenging"
          ? "This area may call for patience and thoughtful choices this week."
          : "This area moves through a mixed rhythm this week.";
  }

  const toneMeaning =
    TERM_MEANINGS[tone] ?? "";

  return `
    <article class="weekly-life-card ${escapeHTML(
      toneClass(tone)
    )}">

      <div class="weekly-life-card-heading">

        <span class="weekly-life-icon">
          ${escapeHTML(category?.icon ?? "")}
        </span>

        <h3>
          ${escapeHTML(category?.label ?? categoryKey)}
        </h3>

      </div>

      <p>
        ${escapeHTML(readerText)}
      </p>

      ${renderMeaningDetails(
        "What does this life area mean?",
        areaMeaning,
        "horoscope-meaning-area"
      )}

      ${renderMeaningDetails(
        `What does "${tone}" mean?`,
        toneMeaning,
        "horoscope-meaning-tone"
      )}

    </article>
  `;
}


/* =========================================================
   LIFE AREAS
   ========================================================= */

function renderLifeAreas(categories, profile) {
  if (
    !Array.isArray(categories) ||
    !categories.length
  ) {
    return "";
  }

  return `
    <section class="weekly-reader-card weekly-life-areas">

      <div class="weekly-reader-heading">
        <span>🌿</span>
        <h2>Life Areas This Week</h2>
      </div>

      <div class="weekly-life-grid">

        ${categories
          .map(category =>
            renderCategory(
              category,
              profile
            )
          )
          .join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   GUIDANCE
   ========================================================= */

function renderGuidance(guidance) {
  if (
    !Array.isArray(guidance) ||
    !guidance.length
  ) {
    return "";
  }

  return `
    <section class="weekly-reader-card weekly-guidance">

      <div class="weekly-reader-heading">
        <span>🧭</span>
        <h2>Weekly Guidance</h2>
      </div>

      <ul class="weekly-guidance-list">

        ${guidance
          .map(
            item =>
              `<li>${escapeHTML(item)}</li>`
          )
          .join("")}

      </ul>

    </section>
  `;
}


/* =========================================================
   WEEKLY HOROSCOPE
   ========================================================= */

function renderWeeklyHoroscope(
  container,
  profile
) {
  const narrative =
    profile?.narrative;

  if (!narrative) {
    throw new Error(
      "Weekly narrative was not generated."
    );
  }

  const categories =
    Array.isArray(narrative.categories)
      ? narrative.categories
      : [];


  container.innerHTML = `
    <div class="weekly-horoscope weekly-horoscope-reader">

      ${renderHero(profile)}

      ${renderSummary(narrative)}

      ${renderMainTheme(
        narrative.mainTheme
      )}

      ${renderLifeAreas(
        categories,
        profile
      )}

      ${renderGuidance(
        narrative.guidance
      )}


      <section class="weekly-reader-card horoscope-glossary">

        <div class="weekly-reader-heading">
          <span>📖</span>
          <h2>Understanding Your Reading</h2>
        </div>


        ${renderMeaningDetails(
          "Supportive, Challenging and Balanced",
          `
          Supportive means the underlying interpretation points toward a more constructive or open period.
          Challenging means the interpretation points toward an area that may require patience, awareness or adjustment.
          Balanced means neither direction is strongly dominant.
          `
        )}


        ${renderMeaningDetails(
          "How the Weekly reading is created",
          `
          AstroLight brings together the seven Daily readings in the selected week and looks for themes that recur across them.
          The reader-facing category descriptions use the existing Daily interpretation and prose system rather than creating a separate astrology meaning system.
          `
        )}

      </section>


      <p class="weekly-reader-note">
        Your reading is a synthesis of the seven Daily readings in this week.
      </p>

    </div>
  `;
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeWeeklyHoroscope() {
  const container =
    document.getElementById(
      "horoscope-text"
    );

  if (!container) {
    return;
  }

  const sign =
    container.dataset.sign;

  if (!sign) {
    return;
  }

  try {

    container.innerHTML = `
      <div class="weekly-loading">
        <p>
          Preparing your weekly reading…
        </p>
      </div>
    `;


    const profile =
      await generateWeeklyProfile(
        sign,
        new Date()
      );


    renderWeeklyHoroscope(
      container,
      profile
    );

  } catch (error) {

    console.error(
      "AstroLight Weekly Horoscope error:",
      error
    );

    container.innerHTML = `
      <div class="weekly-error">

        <h2>
          Weekly reading unavailable
        </h2>

        <p>
          Please refresh the page and try again.
        </p>

      </div>
    `;
  }
}


initializeWeeklyHoroscope();