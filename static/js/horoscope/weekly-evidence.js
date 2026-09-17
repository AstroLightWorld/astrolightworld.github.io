/**
 * horoscope/weekly-evidence.js
 *
 * AstroLight Weekly Horoscope
 * Evidence Aggregation Layer
 *
 * IMPORTANT:
 * - Daily Horoscope logic is READ-ONLY.
 * - This file does NOT reinterpret Daily astrology.
 * - Complete Daily profiles are preserved as evidence.
 * - Numerical values are descriptive evidence only.
 */

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
 * Build one immutable evidence record around
 * the complete Daily Horoscope result.
 */
function buildEvidenceRecord(
  dailyProfile,
  dateUTC,
  index
) {
  const interpretation =
    dailyProfile?.interpretation ?? {};

  return {
    index,

    dateUTC:
      dailyProfile?.dateUTC ??
      dateUTC.toISOString(),

    /*
     * COMPLETE DAILY PROFILE.
     *
     * This is the authoritative source.
     * Nothing is discarded.
     */
    dailyProfile,

    /*
     * Convenience references.
     */
    interpretations:
      dailyProfile?.interpretations ?? [],

    planetaryScores:
      dailyProfile?.planetaryScores ?? [],

    aspectScores:
      dailyProfile?.aspectScores ?? [],

    summary:
      dailyProfile?.summary ?? null,

    interpretation,

    prose:
      dailyProfile?.prose ?? null,
  };
}


/**
 * Aggregate one Daily interpretation category.
 *
 * IMPORTANT:
 * The original Daily interpretation objects
 * remain attached as source evidence.
 */
function aggregateCategory(
  category,
  evidence
) {
  const entries =
    evidence
      .map(item => ({
        dateUTC: item.dateUTC,

        profile:
          item.interpretation
            ?.categories
            ?. [category],
      }))
      .filter(
        item => Boolean(item.profile)
      );

  const totals =
    entries.map(item =>
      Number(
        item.profile.total ?? 0
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
      ? total / totals.length
      : 0;

  const supportiveDays =
    entries.filter(
      item =>
        item.profile.tone ===
        "supportive"
    ).length;

  const challengingDays =
    entries.filter(
      item =>
        item.profile.tone ===
        "challenging"
    ).length;

  const balancedDays =
    entries.filter(
      item =>
        item.profile.tone ===
        "balanced"
    ).length;


  /*
   * PRESERVE DAILY INTERPRETATION.
   */
  const sourceInterpretations =
    entries.map(item => ({
      dateUTC: item.dateUTC,

      interpretation:
        item.profile,
    }));


  /*
   * Preserve strongest Daily signals.
   */
  const strongest =
    entries
      .flatMap(item =>
        Array.isArray(
          item.profile.strongest
        )
          ? item.profile.strongest.map(
              signal => ({
                ...signal,
                dateUTC:
                  item.dateUTC,
              })
            )
          : []
      )
      .sort(
        (a, b) =>
          Math.abs(
            Number(
              b.contribution ?? 0
            )
          ) -
          Math.abs(
            Number(
              a.contribution ?? 0
            )
          )
      )
      .slice(0, 5);


  /*
   * Preserve Daily aspect signals.
   */
  const aspectSignals =
    entries
      .flatMap(item =>
        Array.isArray(
          item.profile.aspects
        )
          ? item.profile.aspects.map(
              aspect => ({
                ...aspect,
                dateUTC:
                  item.dateUTC,
              })
            )
          : []
      )
      .sort(
        (a, b) =>
          Math.abs(
            Number(
              b.directionalScore ?? 0
            )
          ) -
          Math.abs(
            Number(
              a.directionalScore ?? 0
            )
          )
      )
      .slice(0, 5);


  /*
   * Derived category tone.
   *
   * This is only an aggregation label.
   * It does NOT replace the Daily tones.
   */
  let tone = "balanced";

  if (average > 0) {
    tone = "supportive";
  }
  else if (average < 0) {
    tone = "challenging";
  }


  return {
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

    sourceInterpretations,

    strongest,

    aspectSignals,
  };
}


/**
 * Aggregate planetary evidence.
 *
 * Every Daily planetary interpretation
 * remains available.
 */
function aggregatePlanetaryEvidence(
  evidence
) {
  const map = {};


  for (const item of evidence) {

    const scores =
      Array.isArray(
        item.planetaryScores
      )
        ? item.planetaryScores
        : [];

    const interpretations =
      Array.isArray(
        item.interpretations
      )
        ? item.interpretations
        : [];


    for (const score of scores) {

      const planet =
        score?.planet;

      if (!planet) {
        continue;
      }


      if (!map[planet]) {

        map[planet] = {
          planet,

          theme:
            score.theme ??
            "influence",

          scores: [],

          sourceInterpretations: [],
        };
      }


      map[planet]
        .scores
        .push(
          Number(
            score.score ?? 0
          )
        );


      const source =
        interpretations.find(
          interpretation =>
            interpretation?.planet ===
            planet
        );


      map[planet]
        .sourceInterpretations
        .push({
          dateUTC:
            item.dateUTC,

          interpretation:
            source ?? null,

          score,
        });
    }
  }


  return Object.values(map)
    .map(entry => {

      const total =
        entry.scores.reduce(
          (sum, value) =>
            sum + value,
          0
        );


      const average =
        entry.scores.length
          ? total /
            entry.scores.length
          : 0;


      let tone = "balanced";

      if (average > 0) {
        tone = "supportive";
      }
      else if (average < 0) {
        tone = "challenging";
      }


      return {
        planet:
          entry.planet,

        theme:
          entry.theme,

        totalScore:
          Number(
            total.toFixed(2)
          ),

        averageScore:
          Number(
            average.toFixed(2)
          ),

        supportiveDays:
          entry.scores.filter(
            score => score > 0
          ).length,

        challengingDays:
          entry.scores.filter(
            score => score < 0
          ).length,

        balancedDays:
          entry.scores.filter(
            score => score === 0
          ).length,

        tone,

        sourceInterpretations:
          entry.sourceInterpretations,
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
 * Aggregate recurring Daily aspects.
 *
 * Original Daily aspect evidence
 * remains preserved.
 */
function aggregateAspectEvidence(
  evidence
) {
  const map = {};


  for (const item of evidence) {

    const aspects =
      Array.isArray(
        item.aspectScores
      )
        ? item.aspectScores
        : [];


    for (const aspect of aspects) {

      const key =
        [
          aspect.a,
          aspect.aspect,
          aspect.b,
        ].join("|");


      if (!map[key]) {

        map[key] = {
          a: aspect.a,

          b: aspect.b,

          aspect:
            aspect.aspect,

          occurrences: 0,

          strengths: [],

          directionalScores: [],

          sourceInterpretations: [],
        };
      }


      map[key]
        .occurrences += 1;


      map[key]
        .strengths
        .push(
          Number(
            aspect.strength ?? 0
          )
        );


      map[key]
        .directionalScores
        .push(
          Number(
            aspect.directionalScore ?? 0
          )
        );


      map[key]
        .sourceInterpretations
        .push({
          dateUTC:
            item.dateUTC,

          aspect,
        });
    }
  }


  return Object.values(map)
    .map(entry => {

      const averageStrength =
        entry.strengths.length
          ? entry.strengths.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            entry.strengths.length
          : 0;


      const totalDirectional =
        entry.directionalScores.reduce(
          (sum, value) =>
            sum + value,
          0
        );


      return {
        a:
          entry.a,

        b:
          entry.b,

        aspect:
          entry.aspect,

        occurrences:
          entry.occurrences,

        averageStrength:
          Number(
            averageStrength.toFixed(2)
          ),

        totalDirectionalScore:
          Number(
            totalDirectional.toFixed(2)
          ),

        sourceInterpretations:
          entry.sourceInterpretations,
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
 * Build the complete Weekly evidence model.
 */
export function buildWeeklyEvidence(
  samples
) {
  const evidence =
    samples.map(
      (sample, index) =>
        buildEvidenceRecord(
          sample.dailyProfile,
          new Date(
            sample.dateUTC
          ),
          index
        )
    );


  const categories = {};


  for (
    const category
    of CATEGORY_NAMES
  ) {

    categories[category] =
      aggregateCategory(
        category,
        evidence
      );
  }


  return {
    samples: evidence,

    categories,

    planetary:
      aggregatePlanetaryEvidence(
        evidence
      ),

    aspects:
      aggregateAspectEvidence(
        evidence
      ),
  };
}


export {
  CATEGORY_NAMES,
};