/**
 * AstroLight Yearly Horoscope Profile Engine
 *
 * Calendar-year aggregation layer.
 *
 * This module reuses the existing AstroLight planetary,
 * relationship, aspect, scoring and interpretation pipeline.
 *
 * It does NOT modify or call the Daily Horoscope renderer.
 */

import {
  calculatePlanetarySnapshot,
} from "./planetary.js";

import {
  interpretPlanetarySnapshot,
} from "./relationships.js";

import {
  calculateHoroscopeAspects,
} from "./aspects.js";

import {
  scorePlanetaryRelationships,
  scoreAspects,
  summarizeScores,
} from "./scoring.js";

import {
  interpretDailyProfile,
} from "./interpretation.js";


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


/**
 * Validate a JavaScript Date.
 */
function validateDate(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    throw new Error(
      "Invalid yearly horoscope date."
    );
  }
}


/**
 * Return UTC midnight for a date.
 */
function startOfUTCDay(date) {
  validateDate(date);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}


/**
 * Create the first day of a calendar year.
 */
function startOfUTCYear(year) {
  return new Date(
    Date.UTC(
      Number(year),
      0,
      1
    )
  );
}


/**
 * Create the first day of a calendar month.
 */
function startOfUTCMonth(
  year,
  monthIndex
) {
  return new Date(
    Date.UTC(
      year,
      monthIndex,
      1
    )
  );
}


/**
 * Calculate one monthly astronomical sample.
 *
 * The sample is taken from the first UTC day
 * of each calendar month.
 */
function calculateSample(
  sunSign,
  dateUTC
) {
  const snapshot =
    calculatePlanetarySnapshot(
      dateUTC
    );

  const interpretations =
    interpretPlanetarySnapshot(
      sunSign,
      snapshot
    );

  const aspects =
    calculateHoroscopeAspects(
      snapshot
    );

  const planetaryScores =
    scorePlanetaryRelationships(
      interpretations
    );

  const aspectScores =
    scoreAspects(
      aspects
    );

  const summary =
    summarizeScores(
      planetaryScores,
      aspectScores
    );

  const interpretation =
    interpretDailyProfile({
      sunSign,

      dateUTC:
        snapshot.timestampUTC,

      planets:
        snapshot.planets,

      interpretations,

      aspects,

      planetaryScores,

      aspectScores,

      summary,
    });

  return {
    dateUTC,

    snapshot,

    interpretations,

    aspects,

    planetaryScores,

    aspectScores,

    summary,

    interpretation,
  };
}


/**
 * Aggregate planetary signals across
 * the twelve monthly samples.
 */
function aggregatePlanetaryScores(
  samples
) {
  const planetMap = {};

  for (const sample of samples) {
    const scores =
      Array.isArray(
        sample.planetaryScores
      )
        ? sample.planetaryScores
        : [];

    for (const score of scores) {
      const planet =
        score.planet;

      if (!planet) {
        continue;
      }

      if (!planetMap[planet]) {
        planetMap[planet] = {
          planet,
          theme:
            score.theme ??
            "influence",
          totalScore: 0,
          samples: 0,
        };
      }

      const value =
        Number(
          score.contribution ??
          score.score ??
          score.total ??
          0
        );

      planetMap[planet].totalScore +=
        value;

      planetMap[planet].samples += 1;
    }
  }

  return Object.values(
    planetMap
  )
    .map(entry => {
      const average =
        entry.samples
          ? entry.totalScore /
            entry.samples
          : 0;

      let tone = "balanced";

      if (average > 0) {
        tone = "supportive";
      } else if (average < 0) {
        tone = "challenging";
      }

      return {
        planet:
          entry.planet,

        theme:
          entry.theme,

        totalScore:
          Number(
            entry.totalScore.toFixed(2)
          ),

        averageScore:
          Number(
            average.toFixed(2)
          ),

        samples:
          entry.samples,

        tone,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(
          b.averageScore
        ) -
        Math.abs(
          a.averageScore
        )
    );
}


/**
 * Aggregate recurring aspects across
 * the twelve monthly samples.
 */
function aggregateAspects(
  samples
) {
  const aspectMap = {};

  for (const sample of samples) {
    const aspects =
      Array.isArray(
        sample.aspects
      )
        ? sample.aspects
        : [];

    for (const aspect of aspects) {
      const key =
        [
          aspect.a,
          aspect.aspect,
          aspect.b,
        ].join("|");

      if (!aspectMap[key]) {
        aspectMap[key] = {
          a: aspect.a,
          b: aspect.b,
          aspect: aspect.aspect,
          occurrences: 0,
          strengths: [],
          directionalScores: [],
        };
      }

      aspectMap[key].occurrences += 1;

      aspectMap[key].strengths.push(
        Number(
          aspect.strength ?? 0
        )
      );

      aspectMap[key].directionalScores.push(
        Number(
          aspect.directionalScore ?? 0
        )
      );
    }
  }

  return Object.values(
    aspectMap
  )
    .map(entry => {
      const totalDirectional =
        entry.directionalScores.reduce(
          (sum, value) =>
            sum + value,
          0
        );

      const averageStrength =
        entry.strengths.length
          ? entry.strengths.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            entry.strengths.length
          : 0;

      return {
        a: entry.a,
        b: entry.b,
        aspect: entry.aspect,

        occurrences:
          entry.occurrences,

        totalDirectionalScore:
          Number(
            totalDirectional.toFixed(2)
          ),

        averageStrength:
          Number(
            averageStrength.toFixed(2)
          ),
      };
    })
    .sort(
      (a, b) =>
        b.occurrences -
        a.occurrences ||
        Math.abs(
          b.totalDirectionalScore
        ) -
        Math.abs(
          a.totalDirectionalScore
        )
    );
}


/**
 * Aggregate the nine reader-facing
 * categories across twelve months.
 */
function aggregateCategories(
  samples
) {
  const categories = {};

  for (const category of CATEGORY_NAMES) {
    const profiles =
      samples
        .map(
          sample =>
            sample.interpretation
              ?.categories?.[category]
        )
        .filter(Boolean);

    const totals =
      profiles.map(
        profile =>
          Number(
            profile.total ?? 0
          )
      );

    const total =
      totals.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    const average =
      totals.length
        ? total /
          totals.length
        : 0;

    const supportiveDays =
      profiles.filter(
        profile =>
          profile.tone ===
          "supportive"
      ).length;

    const challengingDays =
      profiles.filter(
        profile =>
          profile.tone ===
          "challenging"
      ).length;

    const balancedDays =
      profiles.filter(
        profile =>
          profile.tone ===
          "balanced"
      ).length;

    let tone = "balanced";

    if (average > 0) {
      tone = "supportive";
    } else if (average < 0) {
      tone = "challenging";
    }

    const strongest =
      profiles
        .flatMap(
          profile =>
            Array.isArray(
              profile.strongest
            )
              ? profile.strongest
              : []
        )
        .sort(
          (a, b) =>
            Math.abs(
              b.contribution ?? 0
            ) -
            Math.abs(
              a.contribution ?? 0
            )
        )
        .slice(0, 3);

    categories[category] = {
      category,

      total:
        Number(
          total.toFixed(2)
        ),

      average:
        Number(
          average.toFixed(2)
        ),

      tone,

      supportiveDays,

      challengingDays,

      balancedDays,

      strongest,
    };
  }

  return categories;
}


/**
 * Determine the broad yearly tone.
 */
function determineYearlyTone(
  samples
) {
  const combinedScores =
    samples.map(
      sample =>
        Number(
          sample.summary
            ?.combinedScore ?? 0
        )
    );

  const total =
    combinedScores.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const average =
    combinedScores.length
      ? total /
        combinedScores.length
      : 0;

  let tone = "balanced";

  if (average >= 2) {
    tone = "supportive";
  } else if (average <= -2) {
    tone = "challenging";
  }

  return {
    tone,

    totalScore:
      Number(
        total.toFixed(2)
      ),

    averageScore:
      Number(
        average.toFixed(2)
      ),
  };
}


/**
 * Determine the strongest yearly focus.
 */
function determineYearlyFocus(
  categories
) {
  const candidates =
    Object.values(
      categories
    )
      .filter(
        category =>
          category.category !==
          "guidance"
      )
      .sort(
        (a, b) =>
          Math.abs(
            b.average
          ) -
          Math.abs(
            a.average
          )
      );

  return candidates.length
    ? candidates[0].category
    : "general";
}


/**
 * Generate a complete yearly profile
 * for one Sun sign.
 *
 * Year = calendar year.
 *
 * Samples:
 * January 1
 * February 1
 * ...
 * December 1
 */
export function generateYearlyProfile(
  sunSign,
  year = new Date().getUTCFullYear()
) {
  const requestedSign =
    String(
      sunSign ?? ""
    ).trim();

  const canonicalSign =
    SUN_SIGNS.find(
      sign =>
        sign.toLowerCase() ===
        requestedSign.toLowerCase()
    );

  if (!canonicalSign) {
    throw new Error(
      `Unknown Sun sign: ${sunSign}`
    );
  }

  const numericYear =
    Number(year);

  if (
    !Number.isInteger(
      numericYear
    ) ||
    numericYear < 1900 ||
    numericYear > 2200
  ) {
    throw new Error(
      "Yearly horoscope requires a valid calendar year."
    );
  }

  const samples = [];

  for (
    let month = 0;
    month < 12;
    month += 1
  ) {
    const dateUTC =
      startOfUTCMonth(
        numericYear,
        month
      );

    samples.push(
      calculateSample(
        canonicalSign,
        dateUTC
      )
    );
  }

  const planetary =
    aggregatePlanetaryScores(
      samples
    );

  const aspects =
    aggregateAspects(
      samples
    );

  const categories =
    aggregateCategories(
      samples
    );

  const overall =
    determineYearlyTone(
      samples
    );

  const focus =
    determineYearlyFocus(
      categories
    );

  return {
    sunSign:
      canonicalSign,

    period:
      "yearly",

    year:
      numericYear,

    startDateUTC:
      startOfUTCYear(
        numericYear
      ).toISOString(),

    endDateUTC:
      new Date(
        Date.UTC(
          numericYear,
          11,
          31
        )
      ).toISOString(),

    sampleCount:
      samples.length,

    samples,

    planetary,

    aspects,

    categories,

    overallTone:
      overall.tone,

    overallScore:
      overall.averageScore,

    totalScore:
      overall.totalScore,

    focus,
  };
}


/**
 * Generate yearly profiles for all
 * twelve Sun signs.
 *
 * The planetary snapshot for each month
 * is calculated once and reused.
 */
export function generateAllYearlyProfiles(
  year = new Date().getUTCFullYear()
) {
  const numericYear =
    Number(year);

  if (
    !Number.isInteger(
      numericYear
    ) ||
    numericYear < 1900 ||
    numericYear > 2200
  ) {
    throw new Error(
      "Yearly horoscope requires a valid calendar year."
    );
  }

  const monthlySnapshots = [];

  for (
    let month = 0;
    month < 12;
    month += 1
  ) {
    const dateUTC =
      startOfUTCMonth(
        numericYear,
        month
      );

    monthlySnapshots.push({
      dateUTC,

      snapshot:
        calculatePlanetarySnapshot(
          dateUTC
        ),
    });
  }

  return SUN_SIGNS.map(
    sunSign => {
      const samples =
        monthlySnapshots.map(
          sample => {
            const relationships =
              interpretPlanetarySnapshot(
                sunSign,
                sample.snapshot
              );

            const aspects =
              calculateHoroscopeAspects(
                sample.snapshot
              );

            const relationshipScores =
              scorePlanetaryRelationships(
                relationships
              );

            const aspectScores =
              scoreAspects(
                aspects
              );

            const summary =
              summarizeScores(
                relationshipScores,
                aspectScores
              );

            const interpretation =
              interpretDailyProfile(
                sunSign,
                relationships,
                aspects,
                summary
              );

            return {
              dateUTC:
                sample.dateUTC,

              snapshot:
                sample.snapshot,

              relationships,

              aspects,

              relationshipScores,

              aspectScores,

              summary,

              interpretation,
            };
          }
        );

      const planetary =
        aggregatePlanetaryScores(
          samples
        );

      const aspects =
        aggregateAspects(
          samples
        );

      const categories =
        aggregateCategories(
          samples
        );

      const overall =
        determineYearlyTone(
          samples
        );

      return {
        sunSign,

        period:
          "yearly",

        year:
          numericYear,

        startDateUTC:
          startOfUTCYear(
            numericYear
          ).toISOString(),

        endDateUTC:
          new Date(
            Date.UTC(
              numericYear,
              11,
              31
            )
          ).toISOString(),

        sampleCount:
          samples.length,

        samples,

        planetary,

        aspects,

        categories,

        overallTone:
          overall.tone,

        overallScore:
          overall.averageScore,

        totalScore:
          overall.totalScore,

        focus:
          determineYearlyFocus(
            categories
          ),
      };
    }
  );
}


export {
  SUN_SIGNS,
  CATEGORY_NAMES,
};