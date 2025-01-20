const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(__dirname));

// Store players waiting for a match
let waitingPlayer = null;

// Store results
const outcomes = {
    rock: { rock: "draw", paper: "lose", scissors: "win" },
    paper: { rock: "win", paper: "draw", scissors: "lose" },
    scissors: { rock: "lose", paper: "win", scissors: "draw" }
};

// WebSocket logic
io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle player login (find match)
    socket.on("findMatch", (username) => {
        socket.username = username;
        console.log(`[Player is Logged in]: ${socket.username}`); // Log when a player logs in

        if (waitingPlayer) {
            // Pair players
            const opponent = waitingPlayer;
            waitingPlayer = null;

            // Notify both players
            socket.emit("matchFound", { opponent: opponent.username });
            opponent.emit("matchFound", { opponent: socket.username });

            // Link them for gameplay
            socket.opponent = opponent;
            opponent.opponent = socket;

            console.log(`[Match Found]: ${socket.username} vs ${opponent.username}`); // Log when a match is found
        } else {
            // Put the player in the waiting queue
            waitingPlayer = socket;
            socket.emit("waitingForMatch", { message: "Searching for an opponent..." });

            console.log(`[Waiting for Match]: ${socket.username} is waiting for an opponent.`); // Log when a player is waiting
        }
    });

    // Handle player move
    socket.on("playerMove", (move) => {
        if (socket.opponent) {
            socket.choice = move;

            if (socket.opponent.choice) {
                // Determine the result
                const playerResult = outcomes[socket.choice][socket.opponent.choice];
                const opponentResult = outcomes[socket.opponent.choice][socket.choice];

                // Send results to both players
                socket.emit("gameResult", { result: playerResult, yourMove: socket.choice, opponentMove: socket.opponent.choice });
                socket.opponent.emit("gameResult", { result: opponentResult, yourMove: socket.opponent.choice, opponentMove: socket.choice });

                // Log the result in the terminal
                console.log(`[Game Result]: ${socket.username} chose ${socket.choice} and ${socket.opponent.username} chose ${socket.opponent.choice}.`);
                console.log(`[Result]: ${socket.username} - ${playerResult}, ${socket.opponent.username} - ${opponentResult}`);

                // Reset choices for next round
                socket.choice = null;
                socket.opponent.choice = null;
            }
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
            console.log(`[Player Disconnected]: ${socket.username} disconnected while waiting.`);
        }

        if (socket.opponent) {
            socket.opponent.emit("opponentDisconnected", { message: "Your opponent disconnected." });
            socket.opponent.opponent = null;
            console.log(`[Player Disconnected]: ${socket.username} disconnected during the game.`);
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
