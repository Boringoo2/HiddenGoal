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
      <div class="streak-highlight" id="streak-counter">🔥 Racha: ${currentStreak}</div>
      <div class="streak-other">🏆 Mejor: ${bestStreak} &nbsp;|&nbsp; 🥇 Trofeos: ${totalTrophies}</div>
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

  function getAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  function getBirthYear(birthdate) {
    if (!birthdate) return null;
    return new Date(birthdate).getFullYear();
  }

  function getPreviousClub(player) {
    if (!player.previous_clubs || player.previous_clubs.length === 0) {
      return null;
    }
    return player.previous_clubs[
      Math.floor(Math.random() * player.previous_clubs.length)
    ];
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
    
    if (currentMode === "current" && player.birthdate) {
      const age = getAge(player.birthdate);
      if (age !== null) {
        clues.push({ key: "birthdate_age", label: "Edad", value: age + " años" });
      }
    } else if (currentMode === "legends" && player.birth_year) {
      clues.push({ key: "birthdate_year", label: "Nacimiento", value: "Nacido en " + player.birth_year });
    }

    const prevClub = getPreviousClub(player);
    if (prevClub) {
      clues.push({ key: "previous_club_dynamic", label: "Club previo", value: "⬅️ Jugó en: " + prevClub });
    }

    return clues.filter(clue => clue.value); // Ensure no empty values are pushed
  }

  function generateClues(player) {
    let allClues = getAvailableClues(player);
    
    // Shuffle the available clues
    for (let i = allClues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allClues[i], allClues[j]] = [allClues[j], allClues[i]];
    }

    let hintCount = 4;
    if (currentDifficulty === "easy") hintCount = 4;
    else if (currentDifficulty === "medium") hintCount = 3;
    else if (currentDifficulty === "hard") hintCount = 2;
    else if (currentDifficulty === "legend") hintCount = 2;

    return allClues.slice(0, hintCount);
  }

  function renderClues(player) {
    if (!player || !cluesContainer) return;
    cluesContainer.innerHTML = "";

    const selectedClues = generateClues(player);
    selectedClues.forEach((clue) => {
      const div = document.createElement("div");
      div.className = "hint-card";

      const iconMap = {
        nationality: "🌍",
        club: "⚽",
        famous_club: "⚽",
        league: "🏆",
        position: "🎯",
        birthdate_age: "🎂",
        birthdate_year: "🎂",
        previous_club_dynamic: "⬅️",
        era: "⏳"
      };

      const iconSpan = document.createElement("span");
      iconSpan.className = "hint-icon";
      iconSpan.textContent = iconMap[clue.key] || "⚽";
      div.appendChild(iconSpan);

      const textSpan = document.createElement("span");
      textSpan.textContent = clue.value;
      div.appendChild(textSpan);

      cluesContainer.appendChild(div);
    });
  }

  function pickRandomPlayer() {
    const pool = difficultyPools[currentDifficulty];
    if (!pool || !pool.length) return null;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  function resetFeedback() {
    feedbackDiv.innerHTML = "";
    feedbackDiv.className = "hg-feedback";
  }

  function showFeedback(messageHTML, type) {
    feedbackDiv.innerHTML = messageHTML;
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

    lastSuggestions = matches.slice(0, 6);

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
    
    const existingShare = document.getElementById("share-score-btn");
    if (existingShare) existingShare.remove();
    
    nextPlayerBtn.style.display = "none";
    nextPlayerBtn.disabled = true;
    roundFinished = false;
  }

  async function loadPlayers(mode) {
    let file = "data/players_current.json";
    if (mode === "legends") {
      file = "data/players_legends.json";
    }
    
    file += "?v=" + Date.now();
    
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
      console.log("Legends loaded:", allPlayers.length);
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

      const streakElem = document.getElementById("streak-counter");
      if (streakElem) {
        streakElem.classList.remove("streak-bump");
        void streakElem.offsetWidth;
        streakElem.classList.add("streak-bump");
      }

      recordWin(earnedTrophies);
      
      showFeedback(
        `<div class="correct-pop">✅ Correct!</div><div style="text-align:center; color:var(--hg-text-muted); margin-top:0.4rem;">+${earnedTrophies} 🏆</div>`,
        ""
      );
      guessInput.disabled = true;
      nextPlayerBtn.style.display = "";
      nextPlayerBtn.textContent = "➡️ Siguiente " + (currentMode === "legends" ? "leyenda" : "jugador");
      nextPlayerBtn.className = "hg-btn next-btn";
      nextPlayerBtn.disabled = false;
      
      addShareButton(currentStreak);
      clearSuggestions();
    } else {
      roundFinished = true;
      const finalStreak = currentStreak;
      currentStreak = 0;
      saveStreaks();
      updateStreakDisplay();
      showFeedback(
        `<div class="wrong-message">❌ Wrong!</div><div class="correct-reveal">El jugador era: ${currentPlayer.name}</div>`,
        ""
      );
      guessInput.disabled = true;
      nextPlayerBtn.style.display = "";
      nextPlayerBtn.textContent = "🔄 Jugar otra vez";
      nextPlayerBtn.className = "hg-btn play-again-btn";
      nextPlayerBtn.disabled = false;

      addShareButton(finalStreak);
      clearSuggestions();
    }
  }

  function addShareButton(streak) {
    let existingShare = document.getElementById("share-score-btn");
    if (existingShare) existingShare.remove();

    const actionsDiv = document.querySelector(".hg-actions");
    if (!actionsDiv) return;

    const shareBtn = document.createElement("button");
    shareBtn.id = "share-score-btn";
    shareBtn.className = "hg-btn primary";
    shareBtn.style.marginTop = "1.5rem";
    shareBtn.style.marginLeft = "1rem";
    shareBtn.innerHTML = `📤 Compartir Puntuación`;
    
    shareBtn.addEventListener("click", () => shareScore(streak));
    actionsDiv.appendChild(shareBtn);
  }

  function shareScore(streak) {
    const text = `🔥 ¡He conseguido una racha de ${streak} jugadores en HiddenGoal ⚽! ¿Puedes superarme?`;
    if (navigator.share) { 
      navigator.share({ 
        title: "HiddenGoal", 
        text: text, 
        url: window.location.href 
      }).catch(err => console.log("Share failed:", err)); 
    } else { 
      navigator.clipboard.writeText(text + " " + window.location.href); 
      alert("¡Puntuación copiada al portapapeles! " + text); 
    }
  }

  function handleNextPlayer() {
    const params = new URLSearchParams(window.location.search);
    const newId = Math.floor(Math.random() * 1000000);
    params.set("id", newId);
    const newUrl = window.location.pathname + "?" + params.toString();
    window.history.pushState({ id: newId }, "", newUrl);
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

