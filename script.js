let sectorChartInstance = null;
let scopeChartInstance = null;
let venueChartInstance = null;
let visitorChartInstance = null;

function isValid(value) {
  if (!value) return false;
  const v = String(value).trim().toLowerCase();

  return ![
    "(待补充)",
    "待补充",
    "tbd",
    "n/a",
    "na",
    "-"
  ].includes(v);
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

  tableBody.innerHTML = rows.slice(0, 20).map((e) => `
    <tr>
      <td>${e.title || "—"}</td>
      <td>${isValid(e.venue) ? e.sector : "—"}</td>
      <td>${isValid(e.sector) ? e.sector : "—"}</td>
      <td>${isValid(e.scope) ? e.sector : "—"}</td>
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

fetch("data.json")
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load data.json: ${res.status}`);
    }
    return res.json();
  })
  .then((events) => {
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
      events.map((e) => (e.sector || "").trim()).filter(Boolean)
    );

    setText("totalEvents", totalEvents);
    setText("thisMonth", thisMonth);
    setText("upcoming", upcoming);
    setText("sectors", sectorSet.size);

    const sectorCount = {};
    const scopeCount = {};
    const venueCount = {};
    const visitorBySector = {};

    const enrichedEvents = events.map((e) => {
      const impact = parseNumber(e["visitor impact"]) || parseNumber(e.size);

      if (isValid(e.sector)) {
        sectorCount[e.sector] = (sectorCount[e.sector] || 0) + 1;
        visitorBySector[e.sector] = (visitorBySector[e.sector] || 0) + impact;
      }

      if (isValid(e.scope)) {
        scopeCount[e.scope] = (scopeCount[e.scope] || 0) + 1;
      }

      if (isValid(e.venue)) {
        venueCount[e.venue] = (venueCount[e.venue] || 0) + 1;
      }

      return { ...e, impact };
    });

    const sectorEntries = topEntries(sectorCount, 10);
    const scopeEntries = topEntries(scopeCount, 10);
    const venueEntries = topEntries(venueCount, 5);
    const visitorEntries = topEntries(visitorBySector, 5);

    if (sectorChartInstance) sectorChartInstance.destroy();
    if (scopeChartInstance) scopeChartInstance.destroy();
    if (venueChartInstance) venueChartInstance.destroy();
    if (visitorChartInstance) visitorChartInstance.destroy();

    const sectorLabels = sectorEntries.map(([k, v]) => {
      const total = sectorEntries.reduce((sum, [, value]) => sum + value, 0);
      const pct = total ? Math.round((v / total) * 100) : 0;
      return `${k} (${pct}%)`;
    });

    sectorChartInstance = new Chart(document.getElementById("sectorChart"), {
      type: "pie",
      data: {
        labels: sectorLabels,
        datasets: [
          {
            data: sectorEntries.map(([, v]) => v),
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

    scopeChartInstance = makeBarChart(
      "typeChart",
      scopeEntries.map(([k]) => k),
      scopeEntries.map(([, v]) => v),
      "Events"
    );

    venueChartInstance = makeBarChart(
      "venueChart",
      venueEntries.map(([k]) => k),
      venueEntries.map(([, v]) => v),
      "Events"
    );

    visitorChartInstance = makeBarChart(
      "visitorChart",
      visitorEntries.map(([k]) => k),
      visitorEntries.map(([, v]) => v),
      "Visitor Impact"
    );

    const sortedTopEvents = enrichedEvents
      .filter((e) => e.impact > 0)
      .sort((a, b) => b.impact - a.impact);

    renderTable(sortedTopEvents);

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        const keyword = event.target.value.toLowerCase().trim();

        const filtered = sortedTopEvents.filter((e) =>
          [e.title, e.venue, e.sector, e.scope]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(keyword))
        );

        renderTable(filtered);
      });
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
