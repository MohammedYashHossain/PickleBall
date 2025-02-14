const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game constants
const paddleWidth = 15;
const paddleHeight = 100;
const ballRadius = 14;
const netX = canvas.width / 2 - 5;
const kitchenWidth = 140;
const kitchenHeight = canvas.height / 3; // Defines the kitchen area

// Fixed serve positions
const playerServeX = 80;
const playerServeY = 100;
const aiServeX = canvas.width - 80 - ballRadius;
const aiServeY = 100;

// Initial positions
const initialPlayerX = 100;
const initialPlayerY = canvas.height / 2 - paddleHeight / 2;
const initialAiX = canvas.width - 120;
const initialAiY = canvas.height / 2 - paddleHeight / 2;

// Player and AI paddles
let playerPaddle = { x: initialPlayerX, y: initialPlayerY };
let aiPaddle = { x: initialAiX, y: initialAiY, speed: 2 };

// Ball properties
let ball = {
    x: playerServeX,
    y: playerServeY,
    dx: 0,
    dy: 0,
    speed: 1.5, // Slower starting speed
    maxSpeed: 4, // Caps the maximum speed
    acceleration: 0.005, // Much slower acceleration
    bounceReduction: 0.85, // More controlled bounce reduction
    bounced: false
};

let ballInPlay = false;
let serveReady = false;
let lastHitter = null; // Track who last hit the ball

// Scores & Serving Rules
let playerScore = 0;
let aiScore = 0;
let playerServing = true;
let serveTimer = 3;

// **Update Score Display**
function updateScoreDisplay() {
    document.getElementById("playerScore").innerText = playerScore;
    document.getElementById("aiScore").innerText = aiScore;
}

// **Start Serve Timer**
function startServeTimer() {
    serveTimer = 3;
    document.getElementById("serveTimer").innerText = serveTimer;
    let countdown = setInterval(() => {
        serveTimer--;
        document.getElementById("serveTimer").innerText = serveTimer;
        if (serveTimer <= 0) {
            clearInterval(countdown);
            serveReady = true;
        }
    }, 1000);
}

// **Draw Background & Court**
function drawCourt() {
    ctx.fillStyle = "#4CAF50"; // Green bottom section
    ctx.fillRect(0, canvas.height, canvas.width, 100);

    ctx.fillStyle = "#87CEEB"; // Light blue court
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FF8C00"; // Orange Kitchen
    ctx.fillRect(netX - kitchenWidth, 0, kitchenWidth * 2, canvas.height);

    ctx.fillStyle = "black"; // Net in center
    ctx.fillRect(netX, 0, 10, canvas.height);
}

// **Draw Paddles**
function drawPaddle(paddle) {
    ctx.fillStyle = "#008000";
    ctx.fillRect(paddle.x, paddle.y, paddleWidth, paddleHeight);
}

// **Draw Ball**
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffeb3b";
    ctx.fill();
    ctx.closePath();
}

// **Move AI Paddle (Pong Style)**
function moveAIPaddle() {
    if (ball.dx > 0 && ballInPlay) {
        let targetY = ball.y - paddleHeight / 2;
        aiPaddle.y += (targetY - aiPaddle.y) * 0.08; // AI follows the ball smoothly

        // AI moves back and forth based on ball position
        if (ball.x > canvas.width / 2 + 50) {
            aiPaddle.x = initialAiX;
        } else {
            aiPaddle.x = canvas.width - 140;
        }

        // AI can hit the ball
        if (
            ball.y > aiPaddle.y &&
            ball.y < aiPaddle.y + paddleHeight &&
            ball.x + ballRadius > aiPaddle.x
        ) {
            ball.dx = -Math.max(ball.speed, 1.2); // Slower AI return speed
            ball.dy += (ball.y - (aiPaddle.y + paddleHeight / 2)) * 0.1;
            lastHitter = "ai";
            ball.bounced = false;
        }
    }

    aiPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, aiPaddle.y));
}

// **Move Player Paddle**
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    playerPaddle.y = e.clientY - rect.top - paddleHeight / 2;
    playerPaddle.x = e.clientX - rect.left - paddleWidth / 2;

    playerPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, playerPaddle.y));
    playerPaddle.x = Math.max(20, Math.min(canvas.width / 2 - 40, playerPaddle.x));
});

// **Click to Hit Ball**
canvas.addEventListener("click", () => {
    if (!ballInPlay && serveReady) {
        serveBall();
    } else if (
        ball.dx < 0 &&
        ball.x - ballRadius < playerPaddle.x + paddleWidth &&
        ball.y > playerPaddle.y &&
        ball.y < playerPaddle.y + paddleHeight
    ) {
        let hitAngle = (ball.y - (playerPaddle.y + paddleHeight / 2)) * 0.15;
        ball.dx = Math.min(ball.speed + ball.acceleration, ball.maxSpeed);
        ball.dy = hitAngle; // Ball moves based on paddle hit
        lastHitter = "player";
        ball.bounced = false;
    }
});

// **Serve the Ball**
function serveBall() {
    ball.dx = playerServing ? ball.speed : -ball.speed;
    ball.dy = 0; // Ball moves forward first
    ballInPlay = true;
    serveReady = false;
    ball.bounced = false;
}

// **Update Ball Movement**
function updateBall() {
    if (!ballInPlay) return;

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x < netX && ball.dx < 0 && ball.y > 0 && ball.y < canvas.height) {
        ball.dx = -ball.speed;
    }

    // Bounce Detection (only when ball reaches other side)
    if (ball.x > canvas.width / 2 && !ball.bounced) {
        ball.dy *= ball.bounceReduction; // Reduce bounce height
        ball.bounced = true;
    }

   // **Out of Bounds Rule - Handles Sidelines & Backlines**
if (ball.x < 0 || ball.x > canvas.width || ball.y < 0 || ball.y > canvas.height) {
    if (lastHitter === "player") {
        if (playerServing) {
            playerScore++; // Player gets +1 if they were serving
        }
        playerServing = false; // AI gets next serve
    } else {
        if (!playerServing) {
            aiScore++; // AI gets +1 if they were serving
        }
        playerServing = true; // Player gets next serve
    }
    
    resetCourt(); // Reset the game after the ball goes out
    return;
}


    updateScoreDisplay();
}

// **Reset Court**
function resetCourt() {
    ballInPlay = false;
    serveReady = false;

    if (playerScore >= 11 || aiScore >= 11) {
        endGame();
        return;
    }

    playerServing = !playerServing;
    ball.x = playerServing ? playerServeX : aiServeX;
    ball.y = playerServing ? playerServeY : aiServeY;

    playerPaddle.x = initialPlayerX;
    playerPaddle.y = initialPlayerY;
    aiPaddle.x = initialAiX;
    aiPaddle.y = initialAiY;

    startServeTimer();
}

// **Game Loop**
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCourt();
    drawPaddle(playerPaddle);
    drawPaddle(aiPaddle);
    drawBall();
    moveAIPaddle();
    updateBall();
    requestAnimationFrame(gameLoop);
}

// **Start Game**
startServeTimer();
gameLoop();

