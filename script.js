const socket = io("http://localhost:3000");

// Elements
const loginDiv = document.getElementById("login");
const gameDiv = document.getElementById("game");
const usernameInput = document.getElementById("username");
const loginBtn = document.getElementById("loginBtn");
const playerNameSpan = document.getElementById("playerName");
const statusText = document.getElementById("status");
const choicesDiv = document.getElementById("choices");
const resultText = document.getElementById("resultText");
const playAgainBtn = document.getElementById("playAgainBtn");

let playerName = "";
let isVirtualOpponent = false; // Flag for using virtual opponent
const moves = ["rock", "paper", "scissors"];

// Function to determine the winner
function getWinner(playerMove, opponentMove) {
    if (playerMove === opponentMove) return "draw";
    if (
        (playerMove === "rock" && opponentMove === "scissors") ||
        (playerMove === "scissors" && opponentMove === "paper") ||
        (playerMove === "paper" && opponentMove === "rock")
    ) {
        return "player";
    }
    return "opponent";
}

// Handle login
loginBtn.addEventListener("click", () => {
    playerName = usernameInput.value.trim();
    if (!playerName) {
        alert("Please enter a username to start the game!");
        return;
    }

    socket.emit("findMatch", playerName);
    playerNameSpan.textContent = playerName;
    loginDiv.style.display = "none";
    gameDiv.style.display = "block";
    statusText.textContent = "Searching for an opponent...";
});

// Handle waiting for match
socket.on("waitingForMatch", (data) => {
    statusText.textContent = data.message;
});

// Handle match found
socket.on("matchFound", (data) => {
    isVirtualOpponent = false; // Matched with a real player
    statusText.textContent = `Matched with ${data.opponent}! Choose your move:`;
    choicesDiv.style.display = "block";
});

// Handle no match found (fallback to virtual opponent)
socket.on("noMatchFound", () => {
    isVirtualOpponent = true; // Use virtual opponent
    statusText.textContent = "No opponent found. Playing against a virtual opponent!";
    choicesDiv.style.display = "block";
});

// Handle player move
choicesDiv.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
        const playerMove = e.target.getAttribute("data-move");

        if (isVirtualOpponent) {
            // Virtual opponent logic
            const virtualMove = moves[Math.floor(Math.random() * moves.length)];
            const winner = getWinner(playerMove, virtualMove);

            resultText.innerHTML = `
                <strong>You:</strong> ${playerMove} <br>
                <strong>Virtual Opponent:</strong> ${virtualMove} <br>
            `;
            if (winner === "player") {
                resultText.innerHTML += "<strong>Result:</strong> You win! 🎉";
            } else if (winner === "opponent") {
                resultText.innerHTML += "<strong>Result:</strong> Virtual opponent wins! 😞";
            } else {
                resultText.innerHTML += "<strong>Result:</strong> It's a draw! 🤝";
            }

            choicesDiv.style.display = "none";
            playAgainBtn.style.display = "block";
        } else {
            // Real opponent logic
            socket.emit("playerMove", playerMove);
            statusText.textContent = "Waiting for opponent's move...";
            choicesDiv.style.display = "none";
        }
    }
});

// Handle game result from server
socket.on("gameResult", (data) => {
    resultText.innerHTML = `
        <strong>You:</strong> ${data.yourMove} <br>
        <strong>Opponent:</strong> ${data.opponentMove} <br>
        <strong>Result:</strong> ${data.result === "win" ? "You win! 🎉" : data.result === "lose" ? "You lose! 😞" : "It's a draw! 🤝"}
    `;
    choicesDiv.style.display = "none";
    playAgainBtn.style.display = "block";
});

// Play again button handler
playAgainBtn.addEventListener("click", () => {
    resultText.innerHTML = "";
    playAgainBtn.style.display = "none";
    choicesDiv.style.display = "block";
    if (isVirtualOpponent) {
        statusText.textContent = "Playing against a virtual opponent!";
    } else {
        statusText.textContent = "Searching for an opponent...";
        socket.emit("findMatch", playerName);
    }
});
