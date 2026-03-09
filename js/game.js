(() => {
  const modeLabel = document.getElementById("mode-label");
  const cluesContainer = document.getElementById("clues");
  const streakDisplay = document.getElementById("streak-display");
  const difficultySelect = document.getElementById("difficulty-select");
  const guessForm = document.getElementById("guess-form");
  const guessInput = document.getElementById("guess-input");
  const feedbackDiv = document.getElementById("feedback");
  const nextPlayerBtn = document.getElementById("next-player-btn");
  const suggestionsBox = document.getElementById("suggestions");

  let allPlayers = [];
  let difficultyPools = { easy: [], medium: [], hard: [], legend: [] };
  let currentPlayer = null;
  let currentStreak = 0;
  let bestStreak = 0;
  let currentDifficulty = "easy";
  let currentMode = "current";
  let nickname = null;
  let lastSuggestions = [];
  let roundFinished = false;

  const LEADERBOARD_KEY = "hiddenGoalLeaderboard";
  const NICKNAME_KEY = "hiddenGoalNickname";
  const DIFFICULTY_KEY = "hiddenGoalDifficulty";
  const STREAK_KEY = "hiddenGoalCurrentStreak";
  const BEST_STREAK_KEY = "hiddenGoalBestStreak";
  const TROPHIES_KEY = "hiddenGoalTrophies";

  let totalTrophies = 0;

  const DIFFICULTY_TROPHIES = {
    easy: 1,
    medium: 2,
    hard: 3,
    legend: 5
  };

  function loadStreaks() {
    currentStreak = parseInt(localStorage.getItem(STREAK_KEY)) || 0;
    bestStreak = parseInt(localStorage.getItem(BEST_STREAK_KEY)) || 0;
    totalTrophies = parseInt(localStorage.getItem(TROPHIES_KEY)) || 0;
  }

  function saveStreaks() {
    localStorage.setItem(STREAK_KEY, currentStreak);
    localStorage.setItem(BEST_STREAK_KEY, bestStreak);
    localStorage.setItem(TROPHIES_KEY, totalTrophies);
  }

  function getModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    return mode === "legends" ? "legends" : "current";
  }

  function setModeLabel(mode) {
    if (!modeLabel) return;
    if (mode === "legends") {
      modeLabel.textContent = "Modo Leyendas";
    } else {
      modeLabel.textContent = "Modo Jugadores actuales";
    }
  }

  function normalizeText(text) {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  const FLAG_MAP = [
    { match: "espa", src: "flags/es.svg" },
    { match: "francia", src: "flags/fr.svg" },
    { match: "brasil", src: "flags/br.svg" },
    { match: "alemania", src: "flags/de.svg" },
    { match: "inglaterra", src: "flags/en.svg" },
    { match: "argentina", src: "flags/ar.svg" },
    { match: "italia", src: "flags/it.svg" },
    { match: "bélgica", src: "flags/be.svg" },
    { match: "belgica", src: "flags/be.svg" },
    { match: "noruega", src: "flags/no.svg" },
    { match: "egipto", src: "flags/eg.svg" },
    { match: "países bajos", src: "flags/nl.svg" },
    { match: "paises bajos", src: "flags/nl.svg" }
  ];

  const CLUB_LOGO_MAP = [
    { match: "real madrid", src: "clubs/real-madrid.svg" },
    { match: "barcelona", src: "clubs/barcelona.svg" },
    { match: "manchester city", src: "clubs/man-city.svg" },
    { match: "bayern múnich", src: "clubs/bayern.svg" },
    { match: "bayern munich", src: "clubs/bayern.svg" },
    { match: "arsenal", src: "clubs/arsenal.svg" },
    { match: "liverpool", src: "clubs/liverpool.svg" },
    { match: "bayer leverkusen", src: "clubs/leverkusen.svg" },
    { match: "santos", src: "clubs/santos.svg" },
    { match: "napoli", src: "clubs/napoli.svg" },
    { match: "ajax", src: "clubs/ajax.svg" },
    { match: "ac milan", src: "clubs/milan.svg" }
  ];

  function getFlagSrc(nationalityRaw) {
    if (!nationalityRaw) return "flags/default.svg";
    const n = nationalityRaw.toLowerCase();
    const found = FLAG_MAP.find((f) => n.includes(f.match));
    return found ? found.src : "flags/default.svg";
  }

  function getClubLogoSrc(clubRaw) {
    if (!clubRaw) return "clubs/default.svg";
    const c = clubRaw.toLowerCase();
    const found = CLUB_LOGO_MAP.find((f) => c.includes(f.match));
    return found ? found.src : "clubs/default.svg";
  }

  function getCurrentMonthKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function saveLeaderboard(data) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
  }

  function ensureNickname() {
    if (nickname) return nickname;
    let stored = localStorage.getItem(NICKNAME_KEY);
    if (!stored) {
      stored = prompt("Elige un apodo para el leaderboard:", "") || "Invitado";
      stored = stored.trim() || "Invitado";
      localStorage.setItem(NICKNAME_KEY, stored);
    }
    nickname = stored;
    return nickname;
  }

  function updateStreakDisplay() {
    if (!streakDisplay) return;
    streakDisplay.innerHTML = `
      <div class="hg-stat"><span class="hg-stat-icon">🔥</span> <span class="hg-stat-label">Racha:</span> <span class="hg-stat-value">${currentStreak}</span></div>
      <div class="hg-stat"><span class="hg-stat-icon">🏆</span> <span class="hg-stat-label">Mejor:</span> <span class="hg-stat-value">${bestStreak}</span></div>
      <div class="hg-stat"><span class="hg-stat-icon">🥇</span> <span class="hg-stat-label">Trofeos:</span> <span class="hg-stat-value">${totalTrophies}</span></div>
    `;
  }

  function recordWin(earnedTrophies) {
    const name = ensureNickname();
    const data = loadLeaderboard();
    const monthKey = getCurrentMonthKey();

    if (!data[name]) {
      data[name] = {
        nickname: name,
        allTime: { wins: 0, bestStreak: 0, trophies: 0 },
        monthly: {}
      };
    }

    const player = data[name];
    if (!player.allTime) player.allTime = { wins: 0, bestStreak: 0, trophies: 0 };
    if (!player.monthly) player.monthly = {};
    if (!player.monthly[monthKey]) {
      player.monthly[monthKey] = { wins: 0, bestStreak: 0, trophies: 0 };
    }

    player.allTime.wins += 1;
    player.allTime.trophies = (player.allTime.trophies || 0) + earnedTrophies;
    if (currentStreak > (player.allTime.bestStreak || 0)) {
      player.allTime.bestStreak = currentStreak;
    }

    const monthStats = player.monthly[monthKey];
    monthStats.wins += 1;
    monthStats.trophies = (monthStats.trophies || 0) + earnedTrophies;
    if (currentStreak > (monthStats.bestStreak || 0)) {
      monthStats.bestStreak = currentStreak;
    }

    saveLeaderboard(data);
  }

  function getAvailableClues(player) {
    const clues = [];
    if (player.nationality) clues.push({ key: "nationality", label: "Nacionalidad", value: player.nationality });
    if (player.club) clues.push({ key: "club", label: "Club", value: player.club });
    if (player.famous_club) clues.push({ key: "famous_club", label: "Club histórico", value: player.famous_club });
    if (player.position) clues.push({ key: "position", label: "Posición", value: player.position });
    if (player.league) clues.push({ key: "league", label: "Liga", value: player.league });
    if (player.previous_club) clues.push({ key: "previous_club", label: "Club previo", value: player.previous_club });
    if (player.era) clues.push({ key: "era", label: "Época", value: player.era });
    
    return clues.filter(clue => clue.value); // Ensure no empty values are pushed
  }

  function generateClues(player) {
    const allClues = getAvailableClues(player);
    const byKey = Object.fromEntries(allClues.map((c) => [c.key, c]));

    const result = [];
    if (currentDifficulty === "easy") {
      ["nationality", "club", "league", "position"].forEach(k => { if (byKey[k]) result.push(byKey[k]); });
    } else if (currentDifficulty === "medium") {
      ["nationality", "club", "position"].forEach(k => { if (byKey[k]) result.push(byKey[k]); });
    } else if (currentDifficulty === "hard") {
      ["nationality", "position"].forEach(k => { if (byKey[k]) result.push(byKey[k]); });
    } else if (currentDifficulty === "legend") {
      if (byKey["nationality"]) result.push(byKey["nationality"]);
    }
    return result;
  }

  function renderClues(player) {
    if (!player || !cluesContainer) return;
    cluesContainer.innerHTML = "";

    const selectedClues = generateClues(player);
    selectedClues.forEach((clue) => {
      const p = document.createElement("p");
      p.className = "hg-clue";

      const labelSpan = document.createElement("span");
      labelSpan.textContent = `${clue.label}:`;

      const valueWrapper = document.createElement("span");
      valueWrapper.className = "hg-clue-value";

      if (clue.key === "nationality") {
        const img = document.createElement("img");
        img.className = "hg-flag-img";
        img.src = getFlagSrc(player.nationality);
        img.alt = player.nationality;
        valueWrapper.appendChild(img);
        const textSpan = document.createElement("span");
        textSpan.textContent = clue.value;
        valueWrapper.appendChild(textSpan);
      } else if (clue.key === "club" || clue.key === "famous_club") {
        const img = document.createElement("img");
        img.className = "hg-club-logo";
        img.src = getClubLogoSrc(player.club || player.famous_club);
        img.alt = player.club || player.famous_club;
        valueWrapper.appendChild(img);
        const textSpan = document.createElement("span");
        textSpan.textContent = clue.value;
        valueWrapper.appendChild(textSpan);
      } else {
        const textSpan = document.createElement("span");
        textSpan.textContent = clue.value;
        valueWrapper.appendChild(textSpan);
      }

      p.appendChild(labelSpan);
      p.appendChild(valueWrapper);
      cluesContainer.appendChild(p);
    });
  }

  function pickRandomPlayer() {
    const pool = difficultyPools[currentDifficulty];
    if (!pool || !pool.length) return null;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  function resetFeedback() {
    feedbackDiv.textContent = "";
    feedbackDiv.className = "hg-feedback";
  }

  function showFeedback(message, type) {
    feedbackDiv.textContent = message;
    feedbackDiv.className = `hg-feedback ${type}`;
  }

  function clearSuggestions() {
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = "";
    suggestionsBox.classList.remove("visible");
    lastSuggestions = [];
  }

  function buildSuggestions(query) {
    if (!suggestionsBox) return;
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      clearSuggestions();
      return;
    }

    const matches = allPlayers.filter((p) => {
      return p.normalizedName && p.normalizedName.includes(normalizedQuery);
    });

    matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    lastSuggestions = matches.slice(0, 8);

    if (!lastSuggestions.length) {
      clearSuggestions();
      return;
    }

    suggestionsBox.innerHTML = "";
    lastSuggestions.forEach((player) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hg-suggestion-item";
      btn.textContent = player.name;
      btn.addEventListener("click", () => {
        guessInput.value = player.name;
        clearSuggestions();
        guessInput.focus();
      });
      suggestionsBox.appendChild(btn);
    });

    suggestionsBox.classList.add("visible");
  }

  function startNewRound() {
    currentPlayer = pickRandomPlayer();
    if (!currentPlayer) {
      showFeedback(
        "No se han podido cargar jugadores. Revisa los archivos JSON.",
        "error"
      );
      return;
    }
    
    console.log("Current player: " + currentPlayer.name);
    
    if (cluesContainer) cluesContainer.innerHTML = ""; // Force clear old clues
    renderClues(currentPlayer);
    guessInput.value = "";
    guessInput.disabled = false;
    guessInput.focus();
    resetFeedback();
    clearSuggestions();
    nextPlayerBtn.disabled = true;
    roundFinished = false;
  }

  async function loadPlayers(mode) {
    let file = "data/players_current.json";
    if (mode === "legends") {
      file = "data/players_legends.json";
    }
    try {
      const res = await fetch(file);
      if (!res.ok) {
        throw new Error("Error al cargar " + file);
      }
      allPlayers = await res.json();
      
      difficultyPools = { easy: [], medium: [], hard: [], legend: [] };
      allPlayers.forEach((p) => {
        p.normalizedName = normalizeText(p.name);
        
        difficultyPools.easy.push(p);
        difficultyPools.medium.push(p);
        difficultyPools.hard.push(p);
        difficultyPools.legend.push(p);
      });
      console.log("Players loaded:", allPlayers.length);
      console.log("Difficulty pools:", {
        easy: difficultyPools.easy.length,
        medium: difficultyPools.medium.length,
        hard: difficultyPools.hard.length,
        legend: difficultyPools.legend.length
      });
    } catch (err) {
      console.error(err);
      showFeedback(
        "Hubo un problema cargando los jugadores. Asegúrate de abrir el juego desde un servidor local (no directamente con file://).",
        "error"
      );
    }
  }

  function handleGuessSubmit(event) {
    event.preventDefault();
    if (!currentPlayer || roundFinished) return;

    const userGuess = guessInput.value;
    if (!userGuess.trim()) {
      showFeedback("Escribe un nombre antes de enviar.", "info");
      return;
    }

    const normalizedGuess = normalizeText(userGuess);
    const nameMatch = currentPlayer.normalizedName === normalizedGuess;

    if (nameMatch) {
      roundFinished = true;
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      
      const earnedTrophies = DIFFICULTY_TROPHIES[currentDifficulty] || 1;
      totalTrophies += earnedTrophies;
      
      saveStreaks();
      updateStreakDisplay();
      recordWin(earnedTrophies);
      
      showFeedback(
        `¡Correcto! Era ${currentPlayer.name}. +${earnedTrophies} 🎗️`,
        "success"
      );
      guessInput.disabled = true;
      nextPlayerBtn.disabled = false;
      clearSuggestions();
    } else {
      currentStreak = 0;
      saveStreaks();
      updateStreakDisplay();
      showFeedback("No es correcto, prueba otra vez.", "error");
    }
  }

  function handleNextPlayer() {
    startNewRound();
  }

  async function init() {
    currentMode = getModeFromUrl();
    const mode = currentMode;
    setModeLabel(mode);
    loadStreaks();

    const storedDifficulty = localStorage.getItem(DIFFICULTY_KEY);
    if (storedDifficulty && ["easy", "medium", "hard", "legend"].includes(storedDifficulty)) {
      currentDifficulty = storedDifficulty;
    }
    if (difficultySelect) {
      difficultySelect.value = currentDifficulty;
      difficultySelect.addEventListener("change", (e) => {
        const value = e.target.value;
        if (["easy", "medium", "hard", "legend"].includes(value)) {
          currentDifficulty = value;
          localStorage.setItem(DIFFICULTY_KEY, currentDifficulty);
          startNewRound();
        }
      });
    }

    updateStreakDisplay();
    await loadPlayers(mode);
    startNewRound();

    guessForm.addEventListener("submit", handleGuessSubmit);
    guessInput.addEventListener("input", (e) => {
      buildSuggestions(e.target.value);
    });
    guessInput.addEventListener("blur", () => {
      setTimeout(clearSuggestions, 120);
    });
    nextPlayerBtn.addEventListener("click", handleNextPlayer);
  }

  window.addEventListener("DOMContentLoaded", init);
})();

