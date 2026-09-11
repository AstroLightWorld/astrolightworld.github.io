/*
 * AstroLight — Mercury Retrograde Tracker
 * Version: 1.2.0
 *
 * Calculates Mercury's apparent geocentric longitudinal motion from
 * Astronomy Engine. Retrograde stations are discovered dynamically;
 * no hard-coded retrograde dates are used.
 */

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_SYMBOLS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

const SIGN_THEMES = {
  Aries: "initiative, direct communication, decisions and action",
  Taurus: "values, practical plans, money and commitments",
  Gemini: "information, learning, messages and everyday decisions",
  Cancer: "home, family, security and emotionally significant communication",
  Leo: "creative expression, confidence, recognition and personal voice",
  Virgo: "organization, details, routines and practical problem-solving",
  Libra: "partnerships, negotiation, balance and social communication",
  Scorpio: "investigation, trust, shared matters and deeper conversations",
  Sagittarius: "beliefs, travel, education and the broader direction of plans",
  Capricorn: "responsibility, career planning, authority and long-term goals",
  Aquarius: "networks, technology, groups and unconventional ideas",
  Pisces: "intuition, reflection, imagination and boundaries",
};

function assertAstronomy() {
  if (
    !window.Astronomy ||
    typeof window.Astronomy.PairLongitude !== "function" ||
    typeof window.Astronomy.SunPosition !== "function"
  ) {
    throw new Error("Astronomy Engine did not load the required geocentric functions.");
  }
}

function normalize360(value) {
  return ((value % 360) + 360) % 360;
}

/*
 * Return the shortest signed angular difference from a -> b.
 * This prevents the 359° → 0° boundary from looking like a
 * huge backwards movement.
 */
function signedAngleDelta(a, b) {
  let delta = normalize360(b) - normalize360(a);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function mercuryLongitude(date) {
  assertAstronomy();

  // Astronomy Engine's EclipticLongitude() is heliocentric.
  // Mercury retrograde is defined from Earth's geocentric viewpoint.
  // PairLongitude(Mercury, Sun) gives Mercury's apparent ecliptic
  // longitude relative to the Sun as seen from Earth.
  const sunLongitude = normalize360(
    window.Astronomy.SunPosition(date).elon
  );

  const mercuryRelativeToSun = window.Astronomy.PairLongitude(
    window.Astronomy.Body.Mercury,
    window.Astronomy.Body.Sun,
    date
  );

  return normalize360(sunLongitude + mercuryRelativeToSun);
}

/*
 * Central-difference estimate of Mercury's apparent longitudinal
 * velocity in degrees/day.
 */
function motionDegreesPerDay(date, stepHours = 6) {
  const half = stepHours * 60 * 60 * 1000 / 2;
  const before = new Date(date.getTime() - half);
  const after = new Date(date.getTime() + half);
  const delta = signedAngleDelta(mercuryLongitude(before), mercuryLongitude(after));
  return delta / (stepHours / 24);
}

/*
 * Refine a station between two dates whose apparent velocity has
 * opposite signs.
 */
function refineStation(left, right, leftMotion, rightMotion) {
  let a = left.getTime();
  let b = right.getTime();
  let fa = leftMotion;
  let fb = rightMotion;

  for (let i = 0; i < 36; i++) {
    const mid = (a + b) / 2;
    const date = new Date(mid);
    const fm = motionDegreesPerDay(date);

    if (Math.abs(fm) < 0.00001) return date;

    if ((fa <= 0 && fm >= 0) || (fa >= 0 && fm <= 0)) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return new Date((a + b) / 2);
}

/*
 * Discover all direction changes in a range.
 * A + → - change is the start of retrograde.
 * A - → + change is the end of retrograde.
 */
function findStations(startDate, endDate) {
  const stations = [];
  const stepMs = 6 * 60 * 60 * 1000;

  let left = new Date(startDate);
  let leftMotion = motionDegreesPerDay(left);

  for (let t = left.getTime() + stepMs; t <= endDate.getTime(); t += stepMs) {
    const right = new Date(t);
    const rightMotion = motionDegreesPerDay(right);

    if (
      (leftMotion > 0 && rightMotion < 0) ||
      (leftMotion < 0 && rightMotion > 0)
    ) {
      const station = refineStation(left, right, leftMotion, rightMotion);

      // Re-evaluate immediately after the refined station so the
      // station type is based on the actual direction after the turn.
      const after = motionDegreesPerDay(
        new Date(station.getTime() + 6 * 60 * 60 * 1000)
      );

      stations.push({
        date: station,
        type: after < 0 ? "retrograde-start" : "retrograde-end",
        longitude: mercuryLongitude(station),
        sign: signFromLongitude(mercuryLongitude(station)),
      });
    }

    left = right;
    leftMotion = rightMotion;
  }

  return stations;
}

function signFromLongitude(longitude) {
  const index = Math.floor(normalize360(longitude) / 30);
  return SIGNS[index];
}

function signSymbol(sign) {
  return SIGN_SYMBOLS[SIGNS.indexOf(sign)] || "";
}

function calculateRetrogrades(year) {
  /*
   * Pad the requested year because a retrograde can begin shortly
   * before January 1 or end shortly after December 31.
   */
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const paddingMs = 60 * 24 * 60 * 60 * 1000;
  const stations = findStations(
    new Date(start.getTime() - paddingMs),
    new Date(end.getTime() + paddingMs)
  );

  const periods = [];
  for (let i = 0; i < stations.length; i++) {
    if (stations[i].type !== "retrograde-start") continue;

    const finish = stations.slice(i + 1).find(
      station => station.type === "retrograde-end"
    );

    if (!finish) continue;

    // Keep a period if any part of it intersects the selected year.
    if (
      finish.date.getTime() >= start.getTime() &&
      stations[i].date.getTime() <= end.getTime()
    ) {
      periods.push({
        start: stations[i].date,
        end: finish.date,
        startLongitude: stations[i].longitude,
        endLongitude: finish.longitude,
        startSign: stations[i].sign,
        endSign: finish.sign,
      });
    }
  }

  return periods;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatUtc(date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function formatDuration(start, end) {
  const days = (end.getTime() - start.getTime()) / 86400000;
  return `${days.toFixed(1)} days`;
}

function getCurrentStatus(now) {
  const longitude = mercuryLongitude(now);
  const motion = motionDegreesPerDay(now);
  return {
    longitude,
    motion,
    retrograde: motion < 0,
    sign: signFromLongitude(longitude),
  };
}

function findNearestStation(periods, now) {
  let nearest = null;

  for (const period of periods) {
    for (const candidate of [
      { date: period.start, type: "retrograde begins", sign: period.startSign },
      { date: period.end, type: "retrograde ends", sign: period.endSign },
    ]) {
      const distanceDays = Math.abs(candidate.date.getTime() - now.getTime()) / 86400000;
      if (!nearest || distanceDays < nearest.distanceDays) {
        nearest = { ...candidate, distanceDays };
      }
    }
  }

  return nearest;
}

const IMPACT_BY_SIGN = {
  Aries: {
    focus: [
      "Review how directly you communicate your intentions.",
      "Use clear, concise language when making decisions.",
      "Check whether urgency is helping or rushing the conversation.",
    ],
    mindful: [
      "impulsive replies or decisions made before the facts are clear",
      "turning a difference of opinion into a confrontation",
      "speaking first and reviewing the consequences later",
    ],
  },

  Taurus: {
    focus: [
      "Recheck practical plans, commitments and important numbers.",
      "Give financial or value-based decisions enough time for verification.",
      "Prefer steady, well-confirmed communication over rushed changes.",
    ],
    mindful: [
      "holding onto an outdated plan simply because it is familiar",
      "overlooking new information that changes the practical picture",
      "treating a delay as a reason to abandon a useful plan",
    ],
  },

  Gemini: {
    focus: [
      "Verify messages, schedules and information before acting on them.",
      "Revisit learning, writing or communication projects that need refinement.",
      "Keep important conversations clear and specific.",
    ],
    mindful: [
      "misunderstandings caused by incomplete information",
      "taking every message at face value",
      "scattering attention across too many conversations at once",
    ],
  },

  Cancer: {
    focus: [
      "Review emotionally important conversations with care.",
      "Clarify practical arrangements involving home, family or security.",
      "Allow feelings to settle before making communication decisions.",
    ],
    mindful: [
      "reacting to a message before understanding its context",
      "bringing old emotional assumptions into a current conversation",
      "avoiding a needed conversation simply because it feels uncomfortable",
    ],
  },

  Leo: {
    focus: [
      "Refine how you express ideas and creative plans.",
      "Review presentations, important messages and decisions involving visibility.",
      "Let confidence support clear communication rather than replace verification.",
    ],
    mindful: [
      "taking disagreement as a personal rejection",
      "overpromising because enthusiasm is high",
      "assuming recognition will follow without checking the practical details",
    ],
  },

  Virgo: {
    focus: [
      "Organize information and improve practical systems.",
      "Check details, schedules and unfinished tasks carefully.",
      "Turn reviewed ideas into clear, workable next steps.",
    ],
    mindful: [
      "over-analysis that prevents a decision from being made",
      "focusing on minor imperfections while missing the larger objective",
      "creating unnecessary complexity in an otherwise simple task",
    ],
  },

  Libra: {
    focus: [
      "Clarify agreements, expectations and important conversations.",
      "Use negotiation and listening to find a workable balance.",
      "Review decisions involving partnerships before committing.",
    ],
    mindful: [
      "avoiding a necessary decision simply to preserve harmony",
      "assuming agreement where expectations have not been stated",
      "trying to keep everyone satisfied at the expense of clarity",
    ],
  },

  Scorpio: {
    focus: [
      "Investigate information before drawing conclusions.",
      "Revisit unresolved conversations and examine what remains unsaid.",
      "Handle sensitive or shared matters with careful verification.",
    ],
    mindful: [
      "reading hidden motives into incomplete information",
      "withholding important information instead of clarifying it",
      "making a major conclusion before the evidence is complete",
    ],
  },

  Sagittarius: {
    focus: [
      "Review the assumptions behind plans, beliefs and long-range decisions.",
      "Verify travel, education or scheduling details.",
      "Keep the broader goal in view while checking practical facts.",
    ],
    mindful: [
      "speaking with certainty before checking the details",
      "promising more than can realistically be delivered",
      "letting a big-picture idea override useful evidence",
    ],
  },

  Capricorn: {
    focus: [
      "Review responsibilities, timelines and professional communication.",
      "Clarify expectations before committing to long-term plans.",
      "Use careful planning to turn reviewed ideas into concrete action.",
    ],
    mindful: [
      "assuming a delay means a plan has failed",
      "communicating too formally when a direct explanation would help",
      "taking on additional responsibility before checking the full workload",
    ],
  },

  Aquarius: {
    focus: [
      "Review technology, networks and group communication.",
      "Reconsider unconventional ideas that may benefit from another test.",
      "Make sure everyone involved has the same information.",
    ],
    mindful: [
      "changing a system before understanding why it works",
      "assuming others share the same assumptions",
      "rejecting useful feedback simply because an idea is unconventional",
    ],
  },

  Pisces: {
    focus: [
      "Give important conversations room for reflection.",
      "Separate intuition from information that still needs verification.",
      "Review boundaries and expectations where communication has become unclear.",
    ],
    mindful: [
      "assuming rather than asking for clarification",
      "letting uncertainty turn into unnecessary worry",
      "making decisions from incomplete or ambiguous information",
    ],
  },
};

const DIRECT_STATUS_GUIDANCE = [
  "Use the forward phase to communicate decisions and resume reviewed plans.",
  "Move from reflection into practical action while keeping verification in place.",
];

const RETROGRADE_STATUS_GUIDANCE = [
  "Use the period to review, revise and verify rather than assuming every delay has a deeper cause.",
  "Revisit important information and conversations before treating them as final.",
];

function buildMeaning(status, periods, now) {
  const theme = SIGN_THEMES[status.sign];
  const symbol = signSymbol(status.sign);
  const signImpact = IMPACT_BY_SIGN[status.sign];
  const nearest = findNearestStation(periods, now);

  const isRetrograde = status.retrograde;

  const heading =
    `${symbol} Mercury ${isRetrograde ? "retrograde" : "direct"} in ${status.sign}`;

  const paragraphs = isRetrograde
    ? [
        `Mercury is currently moving retrograde through ${status.sign}. In traditional astrology, Mercury retrograde is associated with reviewing, revising and reconsidering communication and decisions, while ${status.sign} brings emphasis to ${theme}.`,

        `The traditional symbolism therefore points toward checking information, revisiting conversations and giving important decisions another review. This is a reflective framework, not a claim that Mercury causes delays or events.`,
      ]
    : [
        `Mercury is currently moving forward through ${status.sign}. In traditional astrology, Mercury direct is associated with clearer forward movement, while ${status.sign} brings emphasis to ${theme}.`,

        `The traditional symbolism therefore favors communicating decisions, resuming reviewed plans and turning ideas into practical action. Direct motion does not guarantee smooth outcomes; it provides the traditional contrast to the review-oriented symbolism of retrograde.`,
      ];

  let stationNote = null;

  if (nearest && nearest.distanceDays <= 7) {
    stationNote =
      `Mercury is about ${nearest.distanceDays.toFixed(1)} days from a station where its apparent motion changes direction. Traditional astrology treats the days around a station as a transition point, so extra attention to communication and decisions may be useful.`;
  }

  return {
    heading,
    paragraphs,

    focus: signImpact.focus,

    mindful: signImpact.mindful,

    statusGuidance: isRetrograde
      ? RETROGRADE_STATUS_GUIDANCE
      : DIRECT_STATUS_GUIDANCE,

    stationNote,
  };
}

function renderCurrent(status, now) {
  const el = document.getElementById("retrograde-current");
  const direction = status.retrograde ? "Retrograde" : "Direct";
  const sign = status.sign;
  const symbol = signSymbol(sign);
  const motion = `${Math.abs(status.motion).toFixed(3)}°/day`;
  const motionLabel = status.retrograde ? "backward" : "apparent longitudinal motion";

  el.innerHTML = `
    <div class="retrograde-status-card">
      <div class="retrograde-status-top">
        <span class="retrograde-direction">${status.retrograde ? "↶" : "→"}</span>
        <span>Mercury is</span>
      </div>
      <h3>${direction}</h3>
      <div class="retrograde-sign">${symbol} ${sign} · ${(((status.longitude % 30) + 30) % 30).toFixed(2)}°</div>
      <div class="retrograde-metrics">
        <span>Geocentric ecliptic longitude: <strong>${status.longitude.toFixed(3)}°</strong></span>
        <span>${motion}${status.retrograde ? " " + motionLabel : " apparent longitudinal motion"}</span>
      </div>
      <p class="retrograde-timestamp">Calculated for ${formatDateTime(now)}.</p>
    </div>
  `;
}

function renderMeaning(status, periods, now) {
  const el = document.getElementById("retrograde-meaning");
  const meaning = buildMeaning(status, periods, now);

  el.innerHTML = `
    <div class="retrograde-meaning-card">

      <h3>${meaning.heading}</h3>

      ${meaning.paragraphs
        .map(p => `<p>${p}</p>`)
        .join("")}

      <div class="retrograde-impact-grid">

        <section class="retrograde-impact-block">
          <p class="retrograde-impact-label">
            CURRENT ASTROLOGICAL IMPACT
          </p>

          <ul>
            ${meaning.statusGuidance
              .map(item => `<li>${item}</li>`)
              .join("")}
          </ul>
        </section>

        <section class="retrograde-impact-block">
          <p class="retrograde-impact-label">
            GOOD FOCUS
          </p>

          <ul>
            ${meaning.focus
              .map(item => `<li>${item}</li>`)
              .join("")}
          </ul>
        </section>

        <section class="retrograde-impact-block">
          <p class="retrograde-impact-label">
            BE MINDFUL OF
          </p>

          <ul>
            ${meaning.mindful
              .map(item => `<li>${item}</li>`)
              .join("")}
          </ul>
        </section>

      </div>

      ${
        meaning.stationNote
          ? `
            <p class="retrograde-station-note">
              <strong>Station proximity:</strong>
              ${meaning.stationNote}
            </p>
          `
          : ""
      }

      <p class="retrograde-disclaimer">
        These meanings come from traditional astrological symbolism
        and are offered as reflective interpretation, not as scientific
        predictions or guarantees of events.
      </p>

    </div>
  `;
}

function renderPeriods(periods, year) {
  const el = document.getElementById("retrograde-periods");

  if (!periods.length) {
    el.innerHTML = `<p class="retrograde-empty">No Mercury retrograde period was found for ${year}.</p>`;
    return;
  }

  el.innerHTML = periods.map((period, index) => `
    <article class="retrograde-period">
      <div class="retrograde-period-number">0${index + 1}</div>
      <div>
        <h3>Mercury retrograde</h3>
        <p><strong>${formatDateTime(period.start)}</strong> → <strong>${formatDateTime(period.end)}</strong></p>
        <p>${signSymbol(period.startSign)} ${period.startSign} ${period.startLongitude.toFixed(2)}° → ${signSymbol(period.endSign)} ${period.endSign} ${period.endLongitude.toFixed(2)}°</p>
        <p class="retrograde-duration">Duration: ${formatDuration(period.start, period.end)}</p>
        <p class="retrograde-utc">UTC: ${formatUtc(period.start)} → ${formatUtc(period.end)}</p>
      </div>
    </article>
  `).join("");
}

function renderError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const targets = [
    document.getElementById("retrograde-current"),
    document.getElementById("retrograde-periods"),
  ];

  targets.forEach(el => {
    if (el) {
      el.innerHTML = `<p class="retrograde-error">Unable to calculate Mercury's motion: ${message}</p>`;
    }
  });
}

function calculateAndRender() {
  try {
    assertAstronomy();

    const yearInput = document.getElementById("retrograde-year");
    const year = Math.min(2100, Math.max(1900, Number(yearInput.value)));
    yearInput.value = year;

    const now = new Date();
    const currentStatus = getCurrentStatus(now);
    const periods = calculateRetrogrades(year);

    renderCurrent(currentStatus, now);
    renderMeaning(currentStatus, periods, now);
    renderPeriods(periods, year);
  } catch (error) {
    console.error(error);
    renderError(error);
  }
}

function init() {
  const yearInput = document.getElementById("retrograde-year");
  const form = document.getElementById("retrograde-year-form");

  yearInput.value = new Date().getUTCFullYear();

  form.addEventListener("submit", event => {
    event.preventDefault();
    calculateAndRender();
  });

  calculateAndRender();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
