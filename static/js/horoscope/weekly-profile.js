/**
 * horoscope/weekly-profile.js
 *
 * AstroLight Weekly Horoscope
 *
 * Architecture:
 *
 * Daily Engine
 *     ↓
 * Daily Profiles
 *     ↓
 * Weekly Evidence
 *     ↓
 * Weekly Interpretation
 *
 * IMPORTANT:
 * Daily logic is READ-ONLY.
 */
import {
  buildWeeklyNarrative,
} from "./weekly-narrative.js";

import {
  generateDailyProfile,
} from "./daily-profile.js";

import {
  buildWeeklyEvidence,
} from "./weekly-evidence.js";

import {
  interpretWeeklyProfile,
} from "./weekly-interpreter.js";


const SUN_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];


function validateDate(
  date,
  name = "Weekly horoscope"
) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `${name} requires a valid Date.`
    );
  }
}


function canonicalizeSign(
  sunSign
) {
  const requested =
    String(
      sunSign ?? ""
    ).trim();

  return SUN_SIGNS.find(
    sign =>
      sign.toLowerCase() ===
      requested.toLowerCase()
  ) ?? null;
}


function startOfUTCDay(
  date
) {
  validateDate(
    date,
    "startOfUTCDay"
  );

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}


function addUTCDays(
  date,
  days
) {
  const result =
    new Date(
      date.getTime()
    );

  result.setUTCDate(
    result.getUTCDate() +
    days
  );

  return result;
}


/**
 * Generate Weekly Horoscope
 * for one Sun sign.
 *
 * Daily is the source of truth.
 */
export function generateWeeklyProfile(
  sunSign,
  weekStartUTC = new Date()
) {

  const canonicalSign =
    canonicalizeSign(
      sunSign
    );


  if (!canonicalSign) {
    throw new Error(
      `Unknown Sun sign: ${sunSign}`
    );
  }


  validateDate(
    weekStartUTC,
    "generateWeeklyProfile"
  );


  const start =
    startOfUTCDay(
      weekStartUTC
    );


  /*
   * Generate seven COMPLETE
   * Daily profiles.
   */
  const samples = [];


  for (
    let day = 0;
    day < 7;
    day += 1
  ) {

    const dateUTC =
      addUTCDays(
        start,
        day
      );


    /*
     * IMPORTANT:
     *
     * We call the existing Daily
     * engine directly.
     *
     * No Daily logic is copied.
     */
    const dailyProfile =
      generateDailyProfile(
        canonicalSign,
        dateUTC
      );


    samples.push({
      dateUTC:
        dateUTC.toISOString(),

      dailyProfile,
    });
  }


  /*
   * Build evidence.
   */
  const evidence =
    buildWeeklyEvidence(
      samples
    );


  /*
   * Interpret evidence.
   */
  const interpretation =
    interpretWeeklyProfile(
      evidence
    );

  const narrative =
  buildWeeklyNarrative({
    ...interpretation,

    interpretation,

    categories:
      evidence.categories,

    planetary:
      evidence.planetary,

    aspects:
      evidence.aspects,

    sampleCount:
      samples.length,
  });

  const end =
    addUTCDays(
      start,
      6
    );


  /*
   * Return a clean public API.
   */
  return {

    sunSign:
      canonicalSign,

    period:
      "weekly",

    startDateUTC:
      start.toISOString(),

    endDateUTC:
      end.toISOString(),

    sampleCount:
      samples.length,


    /*
     * Preserve Daily samples
     * for compatibility/debugging.
     */
    samples:
      samples.map(
        sample => ({
          ...sample.dailyProfile,

          evidence: {
            dateUTC:
              sample.dateUTC,
          },
        })
      ),


    /*
     * Complete evidence model.
     */
    evidence,


    /*
     * Direct category access.
     */
    categories:
      evidence.categories,


    planetary:
      evidence.planetary,


    aspects:
      evidence.aspects,


    /*
     * Weekly interpretation.
     */
    interpretation,


       /*
     * Weekly narrative synthesis.
     */
    narrative,


    overallTone:
      interpretation.overallTone,


    focus:
      interpretation.focus,
  };
}


/**
 * Generate Weekly profiles
 * for all twelve signs.
 */
export function generateAllWeeklyProfiles(
  weekStartUTC = new Date()
) {

  validateDate(
    weekStartUTC,
    "generateAllWeeklyProfiles"
  );


  const profiles = {};


  for (
    const sunSign
    of SUN_SIGNS
  ) {

    profiles[sunSign] =
      generateWeeklyProfile(
        sunSign,
        weekStartUTC
      );
  }


  return profiles;
}


export {
  SUN_SIGNS,
};
