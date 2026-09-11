const MOON_PHASE_ENGINE_VERSION = "8.0.0";

const PHASES = [
  { quarter: 0, name: "Amavasya (New Moon)", symbol: "🌑", target: 0 },
  { quarter: 1, name: "First Quarter", symbol: "🌓", target: 90 },
  { quarter: 2, name: "Purnima (Full Moon)", symbol: "🌕", target: 180 },
  { quarter: 3, name: "Last Quarter", symbol: "🌗", target: 270 },
];

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const PHASE_MEANINGS = {
  0: {
    focus: [
      "Set intentions for the cycle ahead.",
      "Begin quietly and give new ideas room to develop.",
      "Use reflection to decide what deserves your attention next.",
    ],
    mindful: [
      "Expecting immediate clarity or visible results.",
      "Starting too many things before priorities are clear.",
      "Treating uncertainty as a reason to force a decision.",
    ],
  },
  1: {
    focus: [
      "Turn intentions into practical first steps.",
      "Test an idea and learn from what happens.",
      "Build momentum through focused, manageable action.",
    ],
    mindful: [
      "Taking on more than can realistically be completed.",
      "Mistaking early friction for failure.",
      "Changing direction before giving an idea enough time to develop.",
    ],
  },
  2: {
    focus: [
      "Notice what has developed since the previous New Moon.",
      "Reflect on results and bring useful matters to completion.",
      "Allow important information or feelings to become clearer.",
    ],
    mindful: [
      "Treating heightened emotion as proof that immediate action is required.",
      "Overreacting before the situation settles.",
      "Assuming every realization requires an immediate decision.",
    ],
  },
  3: {
    focus: [
      "Review what worked and release what no longer serves the plan.",
      "Complete outstanding tasks before beginning unnecessary new ones.",
      "Make space for reflection and deliberate adjustment.",
    ],
    mindful: [
      "Holding onto commitments simply because they were started.",
      "Making major changes without reviewing the wider context.",
      "Confusing rest and reassessment with lack of progress.",
    ],
  },
};

const SIGN_THEMES = {
  Aries: {
    focus: "initiative, direct expression and personal momentum",
    reflection: "consider what deserves a fresh start and where decisive action is useful",
  },
  Taurus: {
    focus: "stability, practical priorities and tangible results",
    reflection: "consider what is worth preserving, simplifying or building steadily",
  },
  Gemini: {
    focus: "curiosity, communication, learning and exchanging information",
    reflection: "notice which conversations, ideas or choices need clearer attention",
  },
  Cancer: {
    focus: "emotional awareness, belonging, home and personal security",
    reflection: "notice what needs care, protection or a more honest emotional response",
  },
  Leo: {
    focus: "expression, confidence, visibility and personal meaning",
    reflection: "consider where authentic expression and healthy confidence can clarify what matters",
  },
  Virgo: {
    focus: "organization, discernment, routines and practical improvement",
    reflection: "identify useful adjustments and distinguish meaningful details from unnecessary perfectionism",
  },
  Libra: {
    focus: "balance, cooperation, relationships and perspective",
    reflection: "consider where dialogue, fairness or a better balance could improve the situation",
  },
  Scorpio: {
    focus: "depth, honesty, boundaries and meaningful transformation",
    reflection: "look beneath surface reactions and decide what needs to be released or understood more deeply",
  },
  Sagittarius: {
    focus: "perspective, learning, exploration and broader meaning",
    reflection: "step back from immediate details and consider the larger direction",
  },
  Capricorn: {
    focus: "responsibility, structure, achievement and long-term priorities",
    reflection: "review what is sustainable and where disciplined adjustment would help",
  },
  Aquarius: {
    focus: "independence, innovation, community and new perspectives",
    reflection: "consider whether a different approach could create a more useful way forward",
  },
  Pisces: {
    focus: "intuition, imagination, compassion and emotional sensitivity",
    reflection: "allow space for subtle information while keeping practical boundaries clear",
  },
};

const PHASE_DESCRIPTIONS = {
  0: "In traditional astrology, Amavasya (New Moon) is associated with beginnings, intention-setting, inward reflection and the start of a new cycle.",
  1: "In traditional astrology, the First Quarter is associated with developing momentum, decisions, action and responding to emerging challenges.",
  2: "In traditional astrology, Purnima (Full Moon) is associated with culmination, illumination, awareness and recognition.",
  3: "In traditional astrology, the Last Quarter is associated with review, release, adjustment and preparing for a new cycle.",
};

function assertAstronomy() {
  if (!window.Astronomy) {
    throw new Error("Astronomy Engine global is not available.");
  }

  if (typeof window.Astronomy.SearchMoonPhase !== "function") {
    throw new Error("Astronomy Engine SearchMoonPhase() is not available.");
  }

  if (typeof window.Astronomy.MoonPhase !== "function") {
    throw new Error("Astronomy Engine MoonPhase() is not available.");
  }

  if (typeof window.Astronomy.EclipticGeoMoon !== "function") {
    throw new Error("Astronomy Engine EclipticGeoMoon() is not available.");
  }
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatUTC(date) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

function getYearFromIST(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === "year")?.value);
}

function toDate(astroTime) {
  if (!astroTime) return null;
  if (astroTime.date instanceof Date) return astroTime.date;
  if (astroTime instanceof Date) return astroTime;
  return new Date(astroTime);
}

function normalize360(value) {
  return ((value % 360) + 360) % 360;
}

function lunarLongitude(date) {
  return normalize360(window.Astronomy.EclipticGeoMoon(date).lon);
}

function phaseAngle(date) {
  return normalize360(window.Astronomy.MoonPhase(date));
}

function illuminationFromAngle(angle) {
  return (1 - Math.cos((angle * Math.PI) / 180)) / 2;
}

function signFromLongitude(longitude) {
  const normalized = normalize360(longitude);
  const index = Math.floor(normalized / 30);

  return {
    name: SIGN_NAMES[index],
    symbol: SIGN_SYMBOLS[index],
    degree: normalized - index * 30,
    longitude: normalized,
  };
}

function phaseInfo(quarter, date) {
  const phase = PHASES[quarter];
  const moon = signFromLongitude(lunarLongitude(date));

  return {
    quarter,
    name: phase.name,
    symbol: phase.symbol,
    target: phase.target,
    time: date,
    moon,
    longitude: moon.longitude,
  };
}

/*
 * SearchMoonPhase is used here instead of repeatedly sampling the
 * circular Sun-Moon angle. Astronomy Engine defines:
 *   0   = New Moon
 *   90  = First Quarter
 *   180 = Full Moon
 *   270 = Third/Last Quarter
 *
 * This avoids the cyclic-angle classification problem that caused
 * earlier versions to report many events as Full Moon.
 */
function searchPhase(target, startDate, limitDays) {
  const result = window.Astronomy.SearchMoonPhase(
    target,
    startDate,
    limitDays
  );

  return toDate(result);
}

function findPreviousMajorPhase(now) {
  const candidates = PHASES
    .map((phase) => {
      const date = searchPhase(phase.target, now, -40);
      return date ? phaseInfo(phase.quarter, date) : null;
    })
    .filter(Boolean)
    .filter((item) => item.time <= now)
    .sort((a, b) => b.time - a.time);

  return candidates[0] || null;
}

function findNextMajorPhase(now) {
  const candidates = PHASES
    .map((phase) => {
      const date = searchPhase(phase.target, now, 40);
      return date ? phaseInfo(phase.quarter, date) : null;
    })
    .filter(Boolean)
    .filter((item) => item.time > now)
    .sort((a, b) => a.time - b.time);

  return candidates[0] || null;
}

function calculatePhases(year) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
  const events = [];

  for (const phase of PHASES) {
    let cursor = start;

    for (let guard = 0; guard < 20; guard += 1) {
      const date = searchPhase(phase.target, cursor, 35);

      if (!date || date >= end) break;

      if (date >= start) {
        events.push(phaseInfo(phase.quarter, date));
      }

      const nextCursor = new Date(date.getTime() + 60 * 1000);

      if (nextCursor <= cursor) break;

      cursor = nextCursor;
    }
  }

  events.sort((a, b) => a.time - b.time);

  // Defensive de-duplication.
  const unique = [];
  const seen = new Set();

  for (const event of events) {
    const key = `${event.quarter}-${event.time.getTime()}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    }
  }

  return unique;
}

function setText(id, html) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = html;
}

function renderCurrent(now) {
  const current = findPreviousMajorPhase(now);
  const next = findNextMajorPhase(now);

  if (!current) {
    throw new Error("Could not determine the previous lunar quarter.");
  }

  const angle = phaseAngle(now);
  const illumination = illuminationFromAngle(angle);
  const moon = signFromLongitude(lunarLongitude(now));

  setText(
    "moon-current",
    `
      <div class="moon-current-symbol">${current.symbol}</div>
      <div class="moon-phase-name">${current.name}</div>
      <div class="moon-sign">${moon.symbol} ${moon.name} · ${moon.degree.toFixed(2)}°</div>

      <div class="moon-metrics">
        <span>Illumination: <strong>${(illumination * 100).toFixed(1)}%</strong></span>
        <span>Sun–Moon angle: <strong>${angle.toFixed(2)}°</strong></span>
        <span>Geocentric lunar longitude: <strong>${moon.longitude.toFixed(3)}°</strong></span>
      </div>

      ${
        next
          ? `
            <p class="moon-next-phase">
              Next major phase:
              <strong>${next.symbol} ${next.name}</strong>
              <em>${formatDateTime(next.time)}</em>
            </p>
          `
          : ""
      }

      <p class="moon-calculated">Calculated for ${formatDateTime(now)}.</p>
    `
  );

  renderMeaning(current, moon);
}

function renderMeaning(current, moon) {
  const meaning = PHASE_MEANINGS[current.quarter];

  setText(
    "moon-meaning",
    `
      <div class="moon-meaning-card">
        <div class="moon-meaning-symbol">${current.symbol}</div>
        <h3>${current.name} in ${moon.name}</h3>
        <p>${PHASE_DESCRIPTIONS[current.quarter]}</p>
        <p>With the Moon in ${moon.name}, traditional symbolism emphasizes ${SIGN_THEMES[moon.name].focus}. The reflective emphasis is to ${SIGN_THEMES[moon.name].reflection}.</p>

        <div class="moon-impact-grid">
          <div>
            <span class="moon-impact-label">TRADITIONAL THEME</span>
            <p>${PHASE_DESCRIPTIONS[current.quarter]
              .replace(/^In traditional astrology, /, "")
              .replace(/\.$/, "")}</p>
          </div>

          <div>
            <span class="moon-impact-label">GOOD FOCUS</span>
            <ul>${meaning.focus.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>

          <div>
            <span class="moon-impact-label">BE MINDFUL OF</span>
            <ul>${meaning.mindful.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        </div>
      </div>

      <p class="moon-disclaimer">
        These meanings come from traditional astrological symbolism and are offered as
        reflective interpretation, not as scientific predictions or guarantees of events.
      </p>
    `
  );
}

function renderYear(year) {
  const container = document.getElementById("moon-phases");
  if (!container) return;

  try {
    const phases = calculatePhases(year);

    if (!phases.length) {
      container.innerHTML = "<p>No lunar quarter events were found for this year.</p>";
      return;
    }

    container.innerHTML = phases
      .map(
        (phase, index) => `
          <article class="moon-phase-event">
            <div class="moon-phase-event-number">${String(index + 1).padStart(2, "0")}</div>
            <div class="moon-phase-event-body">
              <h3>${phase.symbol} ${phase.name}</h3>
              <strong>${formatDateTime(phase.time)}</strong>
              <span>${phase.moon.symbol} ${phase.moon.name} · ${phase.moon.degree.toFixed(2)}°</span>
              <span>Geocentric lunar longitude: ${phase.longitude.toFixed(3)}°</span>
              <span>UTC: ${formatUTC(phase.time)}</span>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    console.error("Moon phase calculation failed:", error);
    container.innerHTML = `
      <p class="moon-error">
        Unable to calculate lunar phases. Please check the browser console for details.
      </p>
    `;
  }
}

function init() {
  try {
    assertAstronomy();

    const now = new Date();
    const yearInput = document.getElementById("moon-year");
    const yearForm = document.getElementById("moon-year-form");

    if (yearInput) {
      yearInput.value = String(getYearFromIST(now));
    }

    renderCurrent(now);
    renderYear(Number(yearInput?.value) || getYearFromIST(now));

    yearForm?.addEventListener("submit", (event) => {
      event.preventDefault();

      const year = Number(yearInput?.value);

      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        setText("moon-phases", "<p>Please enter a year between 1900 and 2100.</p>");
        return;
      }

      renderYear(year);
    });
  } catch (error) {
    console.error("Moon Phase Calendar initialization failed:", error);

    setText(
      "moon-current",
      `<p class="moon-error">Unable to initialize the astronomical calculator.</p>`
    );
  }
}

init();
