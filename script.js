fetch("data.json")
  .then((res) => res.json())
  .then((events) => {
    const safeDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalEventsEl = document.getElementById("totalEvents");
    const thisMonthEl = document.getElementById("thisMonth");
    const upcomingEl = document.getElementById("upcoming");
    const sectorsEl = document.getElementById("sectors");
    const tableBody = document.getElementById("tableBody");
    const searchInput = document.getElementById("searchInput");

    const totalEvents = events.length;
    const thisMonth = events.filter((e) => {
      const d = safeDate(e.start);
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const upcoming = events.filter((e) => {
      const d = safeDate(e.start);
      return d && d > now;
    }).length;

    const uniqueSectors = [...new Set(events.map((e) => e.sector).filter(Boolean))].length;

    totalEventsEl.textContent = totalEvents;
    thisMonthEl.textContent = thisMonth;
    upcomingEl.textContent = upcoming;
    sectorsEl.textContent = uniqueSectors;

    const sectorCount = {};
    const typeCount = {};
    const venueCount = {};
    const visitorBySector = {};

    events.forEach((e) => {
      if (e.sector) sectorCount[e.sector] = (sectorCount[e.sector] || 0) + 1;
      if (e.type) typeCount[e.type] = (typeCount[e.type] || 0) + 1;
      if (e.venue) venueCount[e.venue] = (venueCount[e.venue] || 0) + 1;

      const impact =
        parseFloat(String(e["visitor impact"] || "").replace(/,/g, "")) ||
        parseFloat(String(e.size || "").replace(/,/g, "")) ||
        0;

      if (e.sector) {
        visitorBySector[e.sector] = (visitorBySector[e.sector] || 0) + impact;
      }
    });

    const topVenues = Object.entries(venueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topVisitorSectors = Object.entries(visitorBySector)
      .sort((a, b) => b[1] - a[1]);

    new Chart(document.getElementById("sectorChart"), {
      type: "pie",
      data: {
        labels: Object.keys(sectorCount),
        datasets: [
          {
            data: Object.values(sectorCount)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    new Chart(document.getElementById("typeChart"), {
      type: "bar",
      data: {
        labels: Object.keys(typeCount),
        datasets: [
          {
            label: "Events",
            data: Object.values(typeCount)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });

    new Chart(document.getElementById("venueChart"), {
      type: "bar",
      data: {
        labels: topVenues.map((v) => v[0]),
        datasets: [
          {
            label: "Events",
            data: topVenues.map((v) => v[1])
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });

    new Chart(document.getElementById("visitorChart"), {
      type: "bar",
      data: {
        labels: topVisitorSectors.map((v) => v[0]),
        datasets: [
          {
            label: "Visitor Impact",
            data: topVisitorSectors.map((v) => v[1])
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });

    const topEvents = [...events]
      .map((e) => ({
        ...e,
        impact:
          parseFloat(String(e["visitor impact"] || "").replace(/,/g, "")) ||
          parseFloat(String(e.size || "").replace(/,/g, "")) ||
          0
      }))
      .sort((a, b) => b.impact - a.impact);

    function renderTable(data) {
      tableBody.innerHTML = data
        .slice(0, 20)
        .map(
          (e) => `
          <tr>
            <td>${e.title || "—"}</td>
            <td>${e.venue || "—"}</td>
            <td>${e.sector || "—"}</td>
            <td>${e.scope || "—"}</td>
            <td>${e.impact ? e.impact.toLocaleString() : "—"}</td>
          </tr>
        `
        )
        .join("");
    }

    renderTable(topEvents);

    searchInput.addEventListener("input", (ev) => {
      const keyword = ev.target.value.toLowerCase();
      const filtered = topEvents.filter((e) =>
        [e.title, e.venue, e.sector, e.scope]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(keyword))
      );
      renderTable(filtered);
    });
  })
  .catch((err) => {
    console.error("Failed to load dashboard data:", err);
  });
