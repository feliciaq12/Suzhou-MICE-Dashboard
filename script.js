let sectorChartInstance = null;
let scopeChartInstance = null;
let venueChartInstance = null;
let visitorChartInstance = null;
let economicChartInstance = null;
let hotelChartInstance = null;
let opportunityChartInstance = null;

function isValid(value) {
  if (!value) return false;
  const v = String(value).trim().toLowerCase();
  return !["(待补充)", "待补充", "tbd", "n/a", "na", "-"].includes(v);
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function topEntries(obj, limit = 10) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function renderTable(rows) {
  const tableBody = document.getElementById("tableBody");
  if (!tableBody) return;

  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No matching events found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows.slice(0, 100).map((e) => `
    <tr>
      <td>${isValid(e.title) ? e.title : "—"}</td>
      <td>${isValid(e.venue) ? e.venue : "—"}</td>
      <td>${isValid(e.sector) ? e.sector : "—"}</td>
      <td>${isValid(e.scope) ? e.scope : "—"}</td>
      <td>${e.impact > 0 ? e.impact.toLocaleString() : "—"}</td>
    </tr>
  `).join("");
}

function makeBarChart(canvasId, labels, data, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function buildData(events) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalEvents = events.length;

  const thisMonth = events.filter((e) => {
    const d = safeDate(e.start);
    return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const upcoming = events.filter((e) => {
    const d = safeDate(e.start);
    return d && d > now;
  }).length;

  const sectorSet = new Set(
    events.map((e) => (isValid(e.sector) ? e.sector.trim() : "")).filter(Boolean)
  );

const sectorCount = {};
const scopeCount = {};
const venueCount = {};
const visitorBySector = {};
const economicByVenue = {};
const hotelByVenue = {};

  const enrichedEvents = events.map((e) => {
  const impact = parseNumber(e["visitor impact"]) || parseNumber(e.size);
  const economicIntensity = parseNumber(e["Economicintensity"]);
  const hotelCount = parseNumber(e["hotel count "]);
  const opportunityScore = parseNumber(e["Final Opportunity Score"]);

  if (isValid(e.sector)) {
    sectorCount[e.sector] = (sectorCount[e.sector] || 0) + 1;
    visitorBySector[e.sector] = (visitorBySector[e.sector] || 0) + impact;
  }

  if (isValid(e.scope)) {
    scopeCount[e.scope] = (scopeCount[e.scope] || 0) + 1;
  }

  if (isValid(e.venue)) {
    venueCount[e.venue] = (venueCount[e.venue] || 0) + 1;

    if (economicIntensity > 0) {
      economicByVenue[e.venue] = Math.max(economicByVenue[e.venue] || 0, economicIntensity);
    }

    if (hotelCount > 0) {
      hotelByVenue[e.venue] = Math.max(hotelByVenue[e.venue] || 0, hotelCount);
    }
  }

  return {
    ...e,
    impact,
    economicIntensity,
    hotelCount,
    opportunityScore
  };
});

  return {
  totalEvents,
  thisMonth,
  upcoming,
  sectors: sectorSet.size,
  sectorEntries: topEntries(sectorCount, 10),
  scopeEntries: topEntries(scopeCount, 10),
  venueEntries: topEntries(venueCount, 5),
  visitorEntries: topEntries(visitorBySector, 5),
  economicEntries: topEntries(economicByVenue, 5),
  hotelEntries: topEntries(hotelByVenue, 5),
  opportunityEvents: enrichedEvents
    .filter((e) => e.opportunityScore > 0 && isValid(e.title))
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5),
  enrichedEvents
};
}

function renderStats(summary) {
  setText("totalEvents", summary.totalEvents);
  setText("thisMonth", summary.thisMonth);
  setText("upcoming", summary.upcoming);
  setText("sectors", summary.sectors);
}

function renderSectorChart(sectorEntries) {
  const canvas = document.getElementById("sectorChart");
  if (!canvas) return;

  if (sectorChartInstance) sectorChartInstance.destroy();

  const total = sectorEntries.reduce((sum, [, value]) => sum + value, 0);
  const labels = sectorEntries.map(([name, value]) => {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return `${name} (${pct}%)`;
  });

  sectorChartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: sectorEntries.map(([, value]) => value),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: "top"
        }
      }
    }
  });
}

function renderScopeChart(scopeEntries) {
  const canvas = document.getElementById("scopeChart");
  if (!canvas) return;

  if (scopeChartInstance) scopeChartInstance.destroy();

  scopeChartInstance = makeBarChart(
    "scopeChart",
    scopeEntries.map(([k]) => k),
    scopeEntries.map(([, v]) => v),
    "Events"
  );
}

function renderVenueChart(venueEntries) {
  const canvas = document.getElementById("venueChart");
  if (!canvas) return;

  if (venueChartInstance) venueChartInstance.destroy();

  venueChartInstance = makeBarChart(
    "venueChart",
    venueEntries.map(([k]) => k),
    venueEntries.map(([, v]) => v),
    "Events"
  );
}

function renderVisitorChart(visitorEntries) {
  const canvas = document.getElementById("visitorChart");
  if (!canvas) return;

  if (visitorChartInstance) visitorChartInstance.destroy();

  visitorChartInstance = makeBarChart(
    "visitorChart",
    visitorEntries.map(([k]) => k),
    visitorEntries.map(([, v]) => v),
    "Visitor Impact"
  );
}

function renderSearchableTable(enrichedEvents) {
  const sorted = enrichedEvents
    .filter((e) => e.impact > 0 || isValid(e.title) || isValid(e.venue))
    .sort((a, b) => b.impact - a.impact);

  renderTable(sorted);

  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", (event) => {
    const keyword = event.target.value.toLowerCase().trim();

    const filtered = sorted.filter((e) =>
      [e.title, e.venue, e.sector, e.scope]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(keyword))
    );

    renderTable(filtered);
  });
}

function renderEconomicChart(economicEntries) {
  const canvas = document.getElementById("economicChart");
  if (!canvas) return;

  if (economicChartInstance) economicChartInstance.destroy();

  economicChartInstance = makeBarChart(
    "economicChart",
    economicEntries.map(([k]) => k),
    economicEntries.map(([, v]) => v),
    "Economic Intensity"
  );
}

function renderHotelChart(hotelEntries) {
  const canvas = document.getElementById("hotelChart");
  if (!canvas) return;

  if (hotelChartInstance) hotelChartInstance.destroy();

  hotelChartInstance = makeBarChart(
    "hotelChart",
    hotelEntries.map(([k]) => k),
    hotelEntries.map(([, v]) => v),
    "Hotel Count"
  );
}

function renderOpportunityChart(opportunityEvents) {
  const canvas = document.getElementById("opportunityChart");
  if (!canvas) return;

  if (opportunityChartInstance) opportunityChartInstance.destroy();

  opportunityChartInstance = makeBarChart(
    "opportunityChart",
    opportunityEvents.map((e) => e.title),
    opportunityEvents.map((e) => e.opportunityScore),
    "Final Opportunity Score"
  );
}

fetch("data.json")
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load data.json: ${res.status}`);
    }
    return res.json();
  })
  .then((events) => {
    const page = document.body.dataset.page;
    const summary = buildData(events);

    if (page === "home") {
      renderStats(summary);
      renderSectorChart(summary.sectorEntries);
      renderScopeChart(summary.scopeEntries);
    }

   if (page === "analytics") {
  renderSectorChart(summary.sectorEntries);
  renderScopeChart(summary.scopeEntries);
  renderVenueChart(summary.venueEntries);
  renderVisitorChart(summary.visitorEntries);
  renderEconomicChart(summary.economicEntries);
  renderHotelChart(summary.hotelEntries);
  renderOpportunityChart(summary.opportunityEvents);
}

    if (page === "data") {
      renderSearchableTable(summary.enrichedEvents);
    }

    if (page === "graph") {
      // nothing extra needed for now
    }
  })
  .catch((error) => {
    console.error(error);
    setText("totalEvents", "0");
    setText("thisMonth", "0");
    setText("upcoming", "0");
    setText("sectors", "0");

    const tableBody = document.getElementById("tableBody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">Failed to load dashboard data.</td>
        </tr>
      `;
    }
  });
