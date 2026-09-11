/**
 * AstroLight Daily Horoscope renderer
 *
 * Shared pipeline:
 * Astronomy
 *   ↓
 * Daily Profile
 *   ↓
 * Master Prose
 *   ↓
 * Independent Career Engine + Career Prose
 *   ↓
 * Reader-facing Daily Horoscope
 */

import {
  generateDailyProfile
} from "./horoscope/daily-profile.js";

import {
  generateHoroscopeProse
} from "./horoscope/prose.js";

import {
  interpretCareerSection
} from "./horoscope/sections/career.js";

import {
  generateCareerProse,
  CAREER_PROSE_VERSION
} from "./horoscope/career-prose.js";


const SECTION_LABELS = {
  overview: "Overall",
  love: "Love",
  career: "Career",
  money: "Money",
  energy: "Energy",
  communication: "Communication",
  emotional: "Emotional",
  opportunity: "Opportunity",
  guidance: "Guidance"
};


const SIGN_NAMES = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces"
};


function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function paragraphHTML(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(
      part => `<p>${escapeHTML(part)}</p>`
    )
    .join("");
}


function sectionHTML(name, text) {
  if (!text) {
    return "";
  }

  const label =
    SECTION_LABELS[name] ?? name;

  return `
    <section class="horoscope-section horoscope-section-${escapeHTML(name)}">
      <h2>${escapeHTML(label)}</h2>
      ${paragraphHTML(text)}
    </section>
  `;
}


function renderError(container, error) {
  console.error(
    "AstroLight daily horoscope error:",
    error
  );

  container.innerHTML = `
    <div class="horoscope-error">
      <strong>Unable to calculate this horoscope right now.</strong>
      <p>Please refresh the page and try again.</p>
    </div>
  `;
}


function getCanonicalSign(sign) {
  const key =
    String(sign ?? "")
      .trim()
      .toLowerCase();

  return SIGN_NAMES[key] ?? null;
}


function renderDailyHoroscope() {
  const container =
    document.getElementById("horoscope-text");

  if (!container) {
    return;
  }

  const sign =
    container.dataset.sign;

  if (!sign) {
    renderError(
      container,
      new Error("Missing Sun sign.")
    );
    return;
  }

  const canonicalSign =
    getCanonicalSign(sign);

  if (!canonicalSign) {
    renderError(
      container,
      new Error(
        `Unknown Sun sign: ${sign}`
      )
    );
    return;
  }

  try {
    const now =
      new Date();

    /*
     * Shared astronomical profile.
     *
     * The existing Daily Profile uses the website's
     * lowercase sign IDs.
     */
    const profile =
      generateDailyProfile(
        sign,
        now
      );

    const interpretation =
      profile.interpretation;

    /*
     * Master horoscope prose.
     */
    const prose =
      generateHoroscopeProse(
        sign,
        interpretation,
        now,
        {
          interpretations:
            profile.interpretations,

          aspectSignals:
            interpretation?.aspectSignals ?? []
        }
      );

    /*
     * Independent Career section.
     *
     * Career Engine expects canonical Title Case
     * Sun-sign names.
     */
    const career =
      interpretCareerSection({
        sunSign:
          canonicalSign,

        interpretations:
          profile.interpretations,

        aspectSignals:
          interpretation?.aspectSignals ?? []
      });

    /*
     * Independent Career prose.
     */
    const careerText =
      generateCareerProse({
        sunSign:
          canonicalSign,

        career,

        aspectSignals:
          interpretation?.aspectSignals ?? []
      });

    /*
     * Replace the generic Career section with the
     * validated Career Prose v1.2.3.
     */
    prose.sections.career =
      careerText;

    const sectionOrder = [
      "overview",
      "love",
      "career",
      "money",
      "energy",
      "communication",
      "emotional",
      "opportunity",
      "guidance"
    ];

    const sections =
      sectionOrder
        .map(name =>
          sectionHTML(
            name,
            prose.sections?.[name]
          )
        )
        .join("");

    const dateLabel =
      now.toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "long",
          day: "numeric"
        }
      );

    container.innerHTML = `
      <div class="horoscope-reading">

        <p class="horoscope-date">
          Calculated for ${escapeHTML(dateLabel)}
        </p>

        ${sections}

        <p class="horoscope-method-note">
          This reading uses AstroLight's Western/Tropical
          Sun-sign calculation and deterministic
          interpretation engines. It is presented as a
          reflective astrological reading, not a scientific
          prediction.
        </p>

        <p class="horoscope-engine-note">
          Career interpretation engine: v1.3.1 ·
          Career prose: v${escapeHTML(CAREER_PROSE_VERSION)}
        </p>

      </div>
    `;

  } catch (error) {
    renderError(
      container,
      error
    );
  }
}


renderDailyHoroscope();
