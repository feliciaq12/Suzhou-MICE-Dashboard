fetch("data.json")
  .then(res => res.json())
  .then(events => {

    // stats
    document.getElementById("total").innerText = events.length;

    const now = new Date();
    const thisMonth = events.filter(e => new Date(e.start).getMonth() === now.getMonth()).length;
    document.getElementById("month").innerText = thisMonth;

    const upcoming = events.filter(e => new Date(e.start) > now).length;
    document.getElementById("upcoming").innerText = upcoming;

    const sectors = [...new Set(events.map(e => e.sector))];
    document.getElementById("sectors").innerText = sectors.length;

    // sector chart
    const sectorCount = {};
    events.forEach(e => sectorCount[e.sector] = (sectorCount[e.sector] || 0) + 1);

    new Chart(document.getElementById("sectorChart"), {
      type: "pie",
      data: {
        labels: Object.keys(sectorCount),
        datasets: [{ data: Object.values(sectorCount) }]
      }
      options: {
  responsive: true,
  maintainAspectRatio: false
}
    });

    // trend chart
    const trend = {};
    events.forEach(e => {
      const m = e.start?.slice(0,7);
      trend[m] = (trend[m] || 0) + 1;
    });

    new Chart(document.getElementById("trendChart"), {
      type: "line",
      data: {
        options: {
  responsive: true,
  maintainAspectRatio: false
}
        labels: Object.keys(trend),
        datasets: [{ data: Object.values(trend) }]
      }
        options: {
  responsive: true,
  maintainAspectRatio: false
}
    });

    // venue chart
    const venues = {};
    events.forEach(e => venues[e.venue] = (venues[e.venue] || 0) + 1);

    new Chart(document.getElementById("venueChart"), {
      type: "bar",
      data: {
        labels: Object.keys(venues).slice(0,10),
        datasets: [{ data: Object.values(venues).slice(0,10) }]
      }
      options: {
  responsive: true,
  maintainAspectRatio: false
}
    });

    // tables
    const table = document.getElementById("eventsTable");
    table.innerHTML = events.map(e =>
      `<tr><td>${e.title}</td><td>${e.venue}</td><td>${e.start}</td></tr>`
    ).join("");

  });
