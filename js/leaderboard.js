(() => {
  const MONTHLY_BODY_ID = "monthly-leaderboard-body";
  const ALLTIME_BODY_ID = "alltime-leaderboard-body";
  const STORAGE_KEY = "hiddenGoalLeaderboard";

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function getCurrentMonthKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function buildRows(tbody, entries) {
    tbody.innerHTML = "";
    if (!entries.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "Sin datos todavía. Juega algunas partidas para ver el ranking.";
      tbody.appendChild(tr);
      tr.appendChild(td);
      return;
    }

      entries.forEach((entry, index) => {
      const tr = document.createElement("tr");
      const posTd = document.createElement("td");
      const nameTd = document.createElement("td");
      const trophiesTd = document.createElement("td");
      const winsTd = document.createElement("td");
      const streakTd = document.createElement("td");

      posTd.textContent = String(index + 1);
      nameTd.textContent = entry.nickname;
      trophiesTd.textContent = `🏆 ${entry.trophies || 0}`;
      winsTd.textContent = String(entry.wins);
      streakTd.textContent = String(entry.bestStreak);

      tr.appendChild(posTd);
      tr.appendChild(nameTd);
      tr.appendChild(trophiesTd);
      tr.appendChild(winsTd);
      tr.appendChild(streakTd);
      tbody.appendChild(tr);
    });
  }

  function init() {
    const monthlyBody = document.getElementById(MONTHLY_BODY_ID);
    const allTimeBody = document.getElementById(ALLTIME_BODY_ID);
    if (!monthlyBody || !allTimeBody) return;

    const data = loadLeaderboard();
    const monthKey = getCurrentMonthKey();

    const monthlyEntries = [];
    const allTimeEntries = [];

    Object.values(data).forEach((p) => {
      if (!p || typeof p !== "object") return;
      const nickname = p.nickname || "Jugador";

      if (p.allTime) {
        allTimeEntries.push({
          nickname,
          trophies: p.allTime.trophies || 0,
          wins: p.allTime.wins || 0,
          bestStreak: p.allTime.bestStreak || 0,
        });
      }

      const monthStats = p.monthly && p.monthly[monthKey];
      if (monthStats) {
        monthlyEntries.push({
          nickname,
          trophies: monthStats.trophies || 0,
          wins: monthStats.wins || 0,
          bestStreak: monthStats.bestStreak || 0,
        });
      }
    });

    const sortFn = (a, b) => {
      if (b.trophies !== a.trophies) return b.trophies - a.trophies;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return b.wins - a.wins;
    };

    monthlyEntries.sort(sortFn);
    allTimeEntries.sort(sortFn);

    buildRows(monthlyBody, monthlyEntries);
    buildRows(allTimeBody, allTimeEntries);
  }

  window.addEventListener("DOMContentLoaded", init);
})();

