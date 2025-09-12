const cells = document.querySelectorAll(".cell");
const turnText = document.querySelector(".turnText");
const restartButton = document.querySelector(".restartButton");
const usernameButton = document.querySelector(".Userbtn");
let firstplayerCredits = document.querySelector(".firstplayerCredits");
let secondplayerCredits = document.querySelector(".secondplayerCredits");
const leaderboardList = document.querySelector(".leaderboard-list");
// Modal elements will be queried on open to ensure availability after HTML load
const aiDifficultySelect = document.querySelector(".aiDifficulty");

// window.localStorage.setItem('username', 'Cas');


function myUsername() {
    let person = prompt("Please choose a username:", "");
    let text = person && person.trim() !== "" ? person.trim() : "Anonymous";
    document.querySelector(".demo").innerHTML = text;
    window.localStorage.setItem("username", text);
    currentUserName = text;
    renderLeaderboard();
}

  usernameButton.addEventListener("click", myUsername);

 


let currentUserName = window.localStorage.getItem('username') || "Anonymous";
document.querySelector(".demo").innerHTML = currentUserName;

function loadLeaderboard() {
    try {
        const raw = window.localStorage.getItem("leaderboard");
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveLeaderboard(board) {
    window.localStorage.setItem("leaderboard", JSON.stringify(board));
}

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

function closeProfile() {
    if (!profileModal) return;
    profileModal.classList.remove('open');
}

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

let options = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let running = false;

initializeGame();

function initializeGame() {
    cells.forEach(cell => cell.addEventListener("click", cellClicked));
    restartButton.addEventListener("click", restartGame);
    if (aiDifficultySelect) {
        aiDifficultySelect.addEventListener("change", () => {
            window.localStorage.setItem("ttt_ai_difficulty", aiDifficultySelect.value);
        });
        const savedDiff = window.localStorage.getItem("ttt_ai_difficulty") || "medium";
        aiDifficultySelect.value = savedDiff;
    }
    turnText.textContent = `${currentPlayer}'s turn`;
    running = true;
    renderLeaderboard();
    // listeners added when modal opens
}

function cellClicked() {
    const cellIndex = this.getAttribute("cellIndex");

    if (options[cellIndex] != "" || !running) {
        return;
    }

    updateCell(this, cellIndex);
    checkWinner();

   
    if (running && currentPlayer === "O") {
        setTimeout(computerMove, 500); // Delay for better user experience
    }
}

function updateCell(cell, index) {
    options[index] = currentPlayer;
    cell.textContent = currentPlayer;
}

function changePlayer() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    turnText.textContent = `${currentPlayer}'s turn`;
}

function checkWinner() {
    let roundWon = false;

    for (let i = 0; i < winConditions.length; i++) {
        const condition = winConditions[i];
        const cellA = options[condition[0]];
        const cellB = options[condition[1]];
        const cellC = options[condition[2]];

        if (cellA == "" || cellB == "" || cellC == "") {
            continue;
        }
        if (cellA == cellB && cellB == cellC) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        turnText.textContent = ` ${currentPlayer} wins!`;
        updateWins();
        running = false;
    } else if (!options.includes("")) {
        turnText.textContent = `Draw!`;
        running = false;
    } else {
        changePlayer();
    }
}

// Evaluate the board: +10 if 'O' wins, -10 if 'X' wins, 0 otherwise
function evaluateBoard(board) {
    for (let i = 0; i < winConditions.length; i++) {
        const [a, b, c] = winConditions[i];
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return board[a] === "O" ? 10 : -10;
        }
    }
    return 0;
}

function isMovesLeft(board) {
    return board.includes("");
}

// Minimax with depth to prefer quicker wins and delay losses
function minimax(board, depth, isMaximizing) {
    const score = evaluateBoard(board);

    if (score === 10) {
        return score - depth; // faster win is better
    }
    if (score === -10) {
        return score + depth; // slower loss is better
    }
    if (!isMovesLeft(board)) {
        return 0; // draw
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
    return bestMove;
}

function computerMove() {
    if (!running || currentPlayer !== "O") {
        return;
    }

    const difficulty = (aiDifficultySelect && aiDifficultySelect.value) || window.localStorage.getItem("ttt_ai_difficulty") || "medium";
    const boardCopy = options.slice();
    const bestIndex = findBestMove(boardCopy);

    // Build list of empty cells
    const emptyCells = options.reduce((acc, val, idx) => {
        if (val === "") acc.push(idx);
        return acc;
    }, []);

    let chosenIndex = bestIndex;
    if (difficulty === "easy") {
        // 70% chance random, 30% optimal
        const useRandom = Math.random() < 0.7;
        if (useRandom && emptyCells.length > 0) {
            chosenIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
    } else if (difficulty === "medium") {
        // 30% chance random, 70% optimal
        const useRandom = Math.random() < 0.3;
        if (useRandom && emptyCells.length > 0) {
            chosenIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
    } else {
        // hard: always optimal (minimax)
        chosenIndex = bestIndex;
    }

    if (chosenIndex !== -1) {
        const cell = cells[chosenIndex];
        updateCell(cell, chosenIndex);
        checkWinner();
    }
}

function restartGame() {
    currentPlayer = "X";
    options = ["", "", "", "", "", "", "", "", ""];
    turnText.textContent = `${currentPlayer}'s turn`;
    cells.forEach((cell) => (cell.textContent = ""));
    running = true;

    if (currentPlayer === "O") {
        setTimeout(computerMove, 1000);
    }
}

let firstPlayerWins = 0;
let secondPlayerWins = 0;

function updateWins() {
    if (currentPlayer === "X") {
        firstPlayerWins++;
        firstplayerCredits.textContent = firstPlayerWins;
        const board = loadLeaderboard();
        const name = currentUserName || "Anonymous";
        const difficulty = (aiDifficultySelect && aiDifficultySelect.value) || window.localStorage.getItem("ttt_ai_difficulty") || "medium";
        const existing = board[name];
        if (typeof existing === 'number') {
            // migrate old schema number -> object
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