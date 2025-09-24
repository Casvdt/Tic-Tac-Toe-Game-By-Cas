// === Basis referenties naar elementen op de pagina ===
// Dit pakt alle vakjes van het bord
const cells = document.querySelectorAll(".cell");
// Tekst die laat zien wie er aan de beurt is
const turnText = document.querySelector(".turnText");
// Knop om opnieuw te beginnen
const restartButton = document.querySelector(".restartButton");
// Knop om je gebruikersnaam in te voeren
const usernameButton = document.querySelector(".Userbtn");
if (usernameButton) {
    usernameButton.addEventListener('click', () => {
        // Attach early so it works even if modal is appended later
        openAuthModal();
    });
}
// Tellers voor de score (X en O)
let firstplayerCredits = document.querySelector(".firstplayerCredits");
let secondplayerCredits = document.querySelector(".secondplayerCredits");
// De lijst in de ranglijst (leaderboard)
const leaderboardList = document.querySelector(".leaderboard-list");
// Selectievakken voor moeilijkheid en wie begint
const aiDifficultySelect = document.querySelector(".aiDifficulty");
const startPlayerSelect = document.querySelector(".startPlayer");
// Achtergrondmuziek element
const bgAudio = document.getElementById("bg-audio");
let audioStarted = false; // Start muziek pas na eerste klik/toets




// === Simple localStorage-based authentication ===
// Users are stored in localStorage under key 'ttt_users' as map { username: { passwordHash } }
// Current user is stored under key 'username'

function loadUsers() {
    try {
        const raw = window.localStorage.getItem('ttt_users');
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
}

function saveUsers(map) {
    window.localStorage.setItem('ttt_users', JSON.stringify(map));
}

function hashPassword(str) {
    // Lightweight non-crypto hash for demo (do NOT use in production)
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return String(h);
}

function setCurrentUser(name) {
    currentUserName = name;
    document.querySelector('.demo').textContent = name;
    window.localStorage.setItem('username', name);
    renderLeaderboard();
}

function getCurrentUser() {
    return window.localStorage.getItem('username') || null;
}

function openAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (!modal) return;
    modal.classList.add('open');
    const logoutBtn = modal.querySelector('.auth-logout');
    const logged = !!getCurrentUser();
    logoutBtn.style.display = logged ? '' : 'none';
}

function closeAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (!modal) return;
    modal.classList.remove('open');
}

function initAuthUI() {
    const modal = document.querySelector('.auth-modal');
    const loginTab = modal.querySelector('.auth-tab-login');
    const registerTab = modal.querySelector('.auth-tab-register');
    const loginForm = modal.querySelector('.auth-form-login');
    const registerForm = modal.querySelector('.auth-form-register');
    const closeBtn = modal.querySelector('.auth-close');
    const logoutBtn = modal.querySelector('.auth-logout');

    if (!modal) {
        return; // modal not in DOM; openAuthModal is still wired to button
    }

    function showTab(tab) {
        if (tab === 'login') {
            loginForm.style.display = '';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = '';
        }
    }

    loginTab.addEventListener('click', () => showTab('login'));
    registerTab.addEventListener('click', () => showTab('register'));
    closeBtn.addEventListener('click', closeAuthModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAuthModal(); });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginForm.querySelector('.auth-username').value.trim();
        const password = loginForm.querySelector('.auth-password').value;
        if (!username || !password) return;
        const users = loadUsers();
        const user = users[username];
        if (!user) {
            alert('User not found');
            return;
        }
        if (user.passwordHash !== hashPassword(password)) {
            alert('Incorrect password');
            return;
        }
        setCurrentUser(username);
        closeAuthModal();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = registerForm.querySelector('.reg-username').value.trim();
        const password = registerForm.querySelector('.reg-password').value;
        if (!username || !password) return;
        const users = loadUsers();
        if (users[username]) {
            alert('Username already exists');
            return;
        }
        users[username] = { passwordHash: hashPassword(password) };
        saveUsers(users);
        setCurrentUser(username);
        closeAuthModal();
    });

    logoutBtn.addEventListener('click', () => {
        window.localStorage.removeItem('username');
        currentUserName = 'Anonymous';
        document.querySelector('.demo').textContent = currentUserName;
        closeAuthModal();
    });

    // Hook User button to open modal
    usernameButton.addEventListener('click', openAuthModal);
}

 


// Huidige gebruikersnaam uit opslag (of standaard)
let currentUserName = window.localStorage.getItem('username') || "Anonymous";
document.querySelector(".demo").innerHTML = currentUserName;

// Leest de ranglijst uit lokale opslag
function loadLeaderboard() {
    try {
        const raw = window.localStorage.getItem("leaderboard");
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

// Slaat de ranglijst op in lokale opslag
function saveLeaderboard(board) {
    window.localStorage.setItem("leaderboard", JSON.stringify(board));
}

// Bouwt en toont de ranglijst in de pagina
function renderLeaderboard() {
    if (!leaderboardList) return;
    const data = loadLeaderboard();
    const entries = Object.entries(data).map(([name, value]) => [name, typeof value === 'number' ? { total: value, easy: 0, medium: 0, hard: 0 } : value]);
    entries.sort((a, b) => (b[1].total || 0) - (a[1].total || 0));
    leaderboardList.innerHTML = entries.map(([name, stats]) => `<li><button class="lb-user" data-user="${name}">${name}</button><span>${stats.total || 0}</span></li>`).join("");

    leaderboardList.querySelectorAll('.lb-user').forEach(btn => {
        btn.addEventListener('click', () => openProfile(btn.getAttribute('data-user')));
    });
}

// Opent het profielvenster met statistieken
function openProfile(name) {
    const modal = document.querySelector('.profile-modal');
    const closeBtn = document.querySelector('.profile-close');
    const nameEl = document.querySelector('.profile-name');
    const easyEl = document.querySelector('.profile-easy');
    const medEl = document.querySelector('.profile-medium');
    const hardEl = document.querySelector('.profile-hard');
    const legacyEl = document.querySelector('.profile-legacy');
    const totalEl = document.querySelector('.profile-total');
    if (!modal || !nameEl) return;
    const data = loadLeaderboard();
    const raw = data[name];
    const stats = raw || { total: 0, easy: 0, medium: 0, hard: 0 };
    let legacy = 0;
    if (typeof raw === 'number') {
        legacy = raw;
    } else if (raw) {
        const sumModes = (raw.easy || 0) + (raw.medium || 0) + (raw.hard || 0);
        legacy = Math.max(0, (raw.total || 0) - sumModes);
    }
    nameEl.textContent = name;
    easyEl.textContent = stats.easy || 0;
    medEl.textContent = stats.medium || 0;
    hardEl.textContent = stats.hard || 0;
    if (legacyEl) legacyEl.textContent = legacy;
    totalEl.textContent = stats.total || (typeof raw === 'number' ? raw : 0);
    modal.classList.add('open');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };
}

// Sluit het profielvenster (als het bestaat)
function closeProfile() {
    if (!profileModal) return;
    profileModal.classList.remove('open');
}

// Alle winnende combinaties op het bord
const winConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// Bord (9 vakjes), huidige speler en of het spel bezig is
let options = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let running = false;

initializeGame();

// Zet het spel klaar en koppel alle events
function initializeGame() {
    cells.forEach(cell => cell.addEventListener("click", cellClicked));
    restartButton.addEventListener("click", restartGame);
    // Start audio bij eerste gebruikersactie (klik/toets)
    const startAudioOnce = () => {
        if (audioStarted || !bgAudio) return;
        audioStarted = true;
        bgAudio.play().catch(() => { /* sommige browsers blokkeren dit; negeer fout */ });
        document.removeEventListener('pointerdown', startAudioOnce);
        document.removeEventListener('keydown', startAudioOnce);
    };
    document.addEventListener('pointerdown', startAudioOnce, { passive: true });
    document.addEventListener('keydown', startAudioOnce);
    // Onthoud/zet de moeilijkheidsgraad
    if (aiDifficultySelect) {
        aiDifficultySelect.addEventListener("change", () => {
            window.localStorage.setItem("ttt_ai_difficulty", aiDifficultySelect.value);
        });
        const savedDiff = window.localStorage.getItem("ttt_ai_difficulty") || "medium";
        aiDifficultySelect.value = savedDiff;
    }
    // Onthoud/zet wie er mag beginnen (speler of computer)
    if (startPlayerSelect) {
        startPlayerSelect.addEventListener("change", () => {
            window.localStorage.setItem("ttt_start_player", startPlayerSelect.value);
        });
        const savedStart = window.localStorage.getItem("ttt_start_player") || "player";
        startPlayerSelect.value = savedStart;
        // Pas toe bij opstarten van het spel
        currentPlayer = savedStart === "player" ? "X" : "O";
    }
    turnText.textContent = `${currentPlayer}'s turn`;
    running = true;
    renderLeaderboard();
    initAuthUI();
    // Als de computer begint, doe dan meteen een zet
    if (currentPlayer === "O") {
        setTimeout(computerMove, 500);
    }
}

// Wanneer je op een vakje klikt om te zetten
function cellClicked() {
    const cellIndex = this.getAttribute("cellIndex");

    // Niet toestaan: al gevuld, spel klaar of computer is aan de beurt
    if (options[cellIndex] != "" || !running || currentPlayer === "O") {
        return;
    }

    updateCell(this, cellIndex);
    checkWinner();

   
    if (running && currentPlayer === "O") {
        setTimeout(computerMove, 500); // Kleine vertraging voor betere beleving
    }
}

// Schrijf de zet weg in het bord en op het scherm
function updateCell(cell, index) {
    options[index] = currentPlayer;
    cell.textContent = currentPlayer;
}

// Wissel van speler (X <-> O)
function changePlayer() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    turnText.textContent = `${currentPlayer}'s turn`;
}

// Controleer of iemand 3 op een rij heeft of dat het gelijkspel is
function checkWinner() {
    let roundWon = false;

    for (let i = 0; i < winConditions.length; i++) {
        const condition = winConditions[i];
        const cellA = options[condition[0]];
        const cellB = options[condition[1]];
        const cellC = options[condition[2]];

        if (cellA == "" || cellB == "" || cellC == "") {
            continue; // Nog niet gevuld
        }
        if (cellA == cellB && cellB == cellC) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        turnText.textContent = ` ${currentPlayer} wins!`;
        updateWins(); // Tel de winst en sla op
        running = false; // Stop het spel
    } else if (!options.includes("")) {
        turnText.textContent = `Draw!`;
        running = false;
    } else {
        changePlayer();
    }
}

// Beoordeel het bord: +10 als O wint, -10 als X wint, 0 anders
function evaluateBoard(board) {
    for (let i = 0; i < winConditions.length; i++) {
        const [a, b, c] = winConditions[i];
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return board[a] === "O" ? 10 : -10;
        }
    }
    return 0;
}

// Zijn er nog lege vakjes?
function isMovesLeft(board) {
    return board.includes("");
}

// Minimax: zoek de beste zet voor de computer (met dieptevoorkeur)
function minimax(board, depth, isMaximizing) {
    const score = evaluateBoard(board);

    if (score === 10) {
        return score - depth; // Sneller winnen is beter
    }
    if (score === -10) {
        return score + depth; // Langzamer verliezen is beter
    }
    if (!isMovesLeft(board)) {
        return 0; // Gelijkspel
    }

    if (isMaximizing) {
        let best = -Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === "") {
                board[i] = "O";
                best = Math.max(best, minimax(board, depth + 1, false));
                board[i] = "";
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === "") {
                board[i] = "X";
                best = Math.min(best, minimax(board, depth + 1, true));
                board[i] = "";
            }
        }
        return best;
    }
}

// Vind de beste zet-index voor O
function findBestMove(board) {
    let bestVal = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < board.length; i++) {
        if (board[i] === "") {
            board[i] = "O";
            const moveVal = minimax(board, 0, false);
            board[i] = "";
            if (moveVal > bestVal) {
                bestMove = i;
                bestVal = moveVal;
            }
        }
    }
    return bestMove; // Index van beste zet
}

// Laat de computer (O) een zet doen (rekening met moeilijkheid)
function computerMove() {
    if (!running || currentPlayer !== "O") {
        return;
    }

    const difficulty = (aiDifficultySelect && aiDifficultySelect.value) || window.localStorage.getItem("ttt_ai_difficulty") || "medium";
    const boardCopy = options.slice();
    const bestIndex = findBestMove(boardCopy);

    // Maak lijst van lege vakjes
    const emptyCells = options.reduce((acc, val, idx) => {
        if (val === "") acc.push(idx);
        return acc;
    }, []);

    let chosenIndex = bestIndex;
    if (difficulty === "easy") {
        // 70% kans willekeurig, 30% beste zet
        const useRandom = Math.random() < 0.7;
        if (useRandom && emptyCells.length > 0) {
            chosenIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
    } else if (difficulty === "medium") {
        // 30% kans willekeurig, 70% beste zet
        const useRandom = Math.random() < 0.3;
        if (useRandom && emptyCells.length > 0) {
            chosenIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
    } else {
        // hard: altijd beste zet (minimax)
        chosenIndex = bestIndex;
    }

    if (chosenIndex !== -1) {
        const cell = cells[chosenIndex];
        updateCell(cell, chosenIndex);
        checkWinner();
    }
}

// Start een nieuw spel en pas de startspeler toe
function restartGame() {
    const startPref = (startPlayerSelect && startPlayerSelect.value) || window.localStorage.getItem("ttt_start_player") || "player";
    currentPlayer = startPref === "player" ? "X" : "O";
    options = ["", "", "", "", "", "", "", "", ""];
    turnText.textContent = `${currentPlayer}'s turn`;
    cells.forEach((cell) => (cell.textContent = ""));
    running = true;

    if (currentPlayer === "O") {
        setTimeout(computerMove, 500);
    }
}

// Aantal winsten bijhouden voor X en O
let firstPlayerWins = 0;
let secondPlayerWins = 0;

// Werk de score en ranglijst bij wanneer iemand wint
function updateWins() {
    if (currentPlayer === "X") {
        firstPlayerWins++;
        firstplayerCredits.textContent = firstPlayerWins;
        const board = loadLeaderboard();
        const name = currentUserName || "Anonymous";
        const difficulty = (aiDifficultySelect && aiDifficultySelect.value) || window.localStorage.getItem("ttt_ai_difficulty") || "medium";
        const existing = board[name];
        if (typeof existing === 'number') {
            // Zet oud formaat om (alleen getal) naar object
            board[name] = { total: existing, easy: 0, medium: 0, hard: 0 };
        }
        const stats = board[name] || { total: 0, easy: 0, medium: 0, hard: 0 };
        stats.total = (stats.total || 0) + 1;
        if (difficulty === 'easy') stats.easy = (stats.easy || 0) + 1;
        else if (difficulty === 'medium') stats.medium = (stats.medium || 0) + 1;
        else stats.hard = (stats.hard || 0) + 1;
        board[name] = stats;
        saveLeaderboard(board);
        renderLeaderboard();
    } else {
        secondPlayerWins++;
        secondplayerCredits.textContent = secondPlayerWins;
    }
}







// window.localStorage.setItem('username', 'Cas'); //Slaat Cas op als username