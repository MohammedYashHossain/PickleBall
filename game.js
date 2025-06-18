// Created By: Mohammed Yash Hossain
// Date Created 1/14/25

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game constants
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 8;
const NET_WIDTH = 10;
const KITCHEN_WIDTH = 140;
const COURT_WIDTH = canvas.width;
const COURT_HEIGHT = canvas.height;

// Court dimensions
const COURT = {
    width: COURT_WIDTH,
    height: COURT_HEIGHT,
    netX: COURT_WIDTH / 2 - NET_WIDTH / 2,
    kitchenWidth: KITCHEN_WIDTH,
    kitchenHeight: COURT_HEIGHT / 3
};

// Game state
let gameState = {
    isPaused: false,
    isServing: true,
    serveTimer: 3,
    lastHitter: null,
    playerScore: 0,
    aiScore: 0,
    playerServing: true,
    rallyCount: 0,
    gameOver: false
};

// Sound effects
const sounds = {
    hit: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-arcade-game-239.mp3'] }),
    score: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'] }),
    serve: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3'] })
};

// Player & AI paddles
const playerPaddle = {
    x: 100,
    y: COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 0,
    maxSpeed: 15
};

const aiPaddle = {
    x: COURT_WIDTH - 100 - PADDLE_WIDTH,
    y: COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 0,
    maxSpeed: 12,
    reactionTime: 0.1,
    predictionError: 0.2
};

// Ball properties
const ball = {
    x: 0,
    y: 0,
    radius: BALL_RADIUS,
    dx: 0,
    dy: 0,
    speed: 8,
    maxSpeed: 15,
    spin: 0,
    lastHitY: 0,
    inPlay: false
};

// Initialize game
function initGame() {
    resetBall();
    updateScoreDisplay();
    startServeTimer();
    setupEventListeners();
}

// Event listeners
function setupEventListeners() {
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    document.getElementById("pauseBtn").addEventListener("click", togglePause);
    document.getElementById("soundBtn").addEventListener("click", toggleSound);
}

function handleMouseMove(e) {
    if (gameState.isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Smooth paddle movement
    const targetY = mouseY - playerPaddle.height / 2;
    playerPaddle.y += (targetY - playerPaddle.y) * 0.2;
    
    // Keep paddle within court bounds
    playerPaddle.y = Math.max(0, Math.min(COURT_HEIGHT - playerPaddle.height, playerPaddle.y));
}

function handleClick() {
    if (gameState.isPaused) return;
    
    if (gameState.isServing && gameState.serveTimer <= 0) {
        serveBall();
    } else if (ball.inPlay && isPlayerHitting()) {
        hitBall();
    }
}

// Game mechanics
function serveBall() {
    ball.inPlay = true;
    gameState.isServing = false;
    gameState.rallyCount = 0;
    
    // Serve from the correct position
    ball.x = gameState.playerServing ? 120 : COURT_WIDTH - 120;
    ball.y = COURT_HEIGHT / 2;
    
    // Serve with slight upward angle
    const angle = gameState.playerServing ? 0 : Math.PI;
    const serveSpeed = ball.speed * 1.2;
    ball.dx = Math.cos(angle) * serveSpeed;
    ball.dy = -2;
    
    sounds.serve.play();
}

function hitBall() {
    if (!isPlayerHitting()) return;
    
    // Calculate hit angle based on where the ball hits the paddle
    const hitPosition = (ball.y - playerPaddle.y) / playerPaddle.height;
    const angle = (hitPosition - 0.5) * Math.PI / 3;
    
    // Add spin based on hit position
    ball.spin = (hitPosition - 0.5) * 0.5;
    
    // Increase speed slightly with each hit
    const currentSpeed = Math.min(ball.speed + 0.2, ball.maxSpeed);
    
    ball.dx = Math.cos(angle) * currentSpeed;
    ball.dy = Math.sin(angle) * currentSpeed + ball.spin;
    
    gameState.lastHitter = 'player';
    gameState.rallyCount++;
    
    sounds.hit.play();
}

function isPlayerHitting() {
    return ball.dx < 0 && 
           ball.x - ball.radius <= playerPaddle.x + playerPaddle.width &&
           ball.y >= playerPaddle.y &&
           ball.y <= playerPaddle.y + playerPaddle.height;
}

// AI Logic
function updateAI() {
    if (!ball.inPlay || gameState.isPaused) return;
    
    // Predict ball trajectory
    const predictedY = predictBallLanding();
    const targetY = predictedY - aiPaddle.height / 2;
    
    // Add some randomness to AI movement
    const error = (Math.random() - 0.5) * gameState.rallyCount * aiPaddle.predictionError;
    
    // Smooth AI movement
    aiPaddle.y += (targetY + error - aiPaddle.y) * aiPaddle.reactionTime;
    
    // Keep AI paddle within bounds
    aiPaddle.y = Math.max(0, Math.min(COURT_HEIGHT - aiPaddle.height, aiPaddle.y));
    
    // AI hits the ball
    if (ball.dx > 0 && 
        ball.x + ball.radius >= aiPaddle.x &&
        ball.y >= aiPaddle.y &&
        ball.y <= aiPaddle.y + aiPaddle.height) {
        
        const hitPosition = (ball.y - aiPaddle.y) / aiPaddle.height;
        const angle = (hitPosition - 0.5) * Math.PI / 3;
        const currentSpeed = Math.min(ball.speed + 0.2, ball.maxSpeed);
        
        ball.dx = -Math.cos(angle) * currentSpeed;
        ball.dy = Math.sin(angle) * currentSpeed;
        
        gameState.lastHitter = 'ai';
        gameState.rallyCount++;
        
        sounds.hit.play();
    }
}

function predictBallLanding() {
    if (ball.dx === 0) return COURT_HEIGHT / 2;
    
    const timeToReachAI = (aiPaddle.x - ball.x) / ball.dx;
    return ball.y + ball.dy * timeToReachAI;
}

// Ball physics
function updateBall() {
    if (!ball.inPlay || gameState.isPaused) return;
    
    // Update position
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Apply spin effect
    ball.dy += ball.spin * 0.1;
    ball.spin *= 0.95;
    
    // Bounce off top and bottom
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= COURT_HEIGHT) {
        ball.dy = -ball.dy * 0.95;
        ball.y = ball.y - ball.radius <= 0 ? ball.radius : COURT_HEIGHT - ball.radius;
    }
    
    // Check for scoring
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= COURT_WIDTH) {
        handleScore();
    }
    
    // Kitchen rule
    if (ball.x > COURT.netX && ball.x < COURT.netX + COURT.kitchenWidth) {
        if (ball.y < COURT.kitchenHeight && gameState.lastHitter === 'player') {
            handleScore();
        }
    }
}

function handleScore() {
    if (gameState.lastHitter === 'player') {
        gameState.aiScore++;
    } else {
        gameState.playerScore++;
    }
    
    sounds.score.play();
    updateScoreDisplay();
    resetBall();
    
    // Check for game over
    if (gameState.playerScore >= 11 || gameState.aiScore >= 11) {
        endGame();
    } else {
        startServeTimer();
    }
}

// Drawing functions
function drawCourt() {
    // Court background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
    
    // Kitchen area
    ctx.fillStyle = '#FF8C00';
    ctx.fillRect(COURT.netX, 0, COURT.kitchenWidth, COURT.kitchenHeight);
    
    // Net
    ctx.fillStyle = '#333';
    ctx.fillRect(COURT.netX, 0, NET_WIDTH, COURT_HEIGHT);
    
    // Court lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
}

function drawPaddle(paddle) {
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Paddle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(paddle.x + 2, paddle.y + 2, paddle.width, paddle.height);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();
    
    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

// Game loop
function gameLoop() {
    if (!gameState.isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawCourt();
        drawPaddle(playerPaddle);
        drawPaddle(aiPaddle);
        drawBall();
        
        updateAI();
        updateBall();
    }
    
    requestAnimationFrame(gameLoop);
}

// Utility functions
function resetBall() {
    ball.inPlay = false;
    gameState.isServing = true;
    ball.x = gameState.playerServing ? 120 : COURT_WIDTH - 120;
    ball.y = COURT_HEIGHT / 2;
    ball.dx = 0;
    ball.dy = 0;
    ball.spin = 0;
}

function startServeTimer() {
    gameState.serveTimer = 3;
    updateServeTimer();
    
    const timer = setInterval(() => {
        gameState.serveTimer--;
        updateServeTimer();
        
        if (gameState.serveTimer <= 0) {
            clearInterval(timer);
        }
    }, 1000);
}

function updateServeTimer() {
    const timerElement = document.querySelector('.timer-value');
    if (timerElement) {
        timerElement.textContent = gameState.serveTimer;
    }
}

function updateScoreDisplay() {
    document.getElementById("playerScore").textContent = gameState.playerScore;
    document.getElementById("aiScore").textContent = gameState.aiScore;
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById("gameOverlay").classList.toggle("active");
}

function toggleSound() {
    const soundBtn = document.getElementById("soundBtn");
    const isMuted = soundBtn.querySelector("i").classList.contains("fa-volume-mute");
    
    soundBtn.querySelector("i").className = isMuted ? "fas fa-volume-up" : "fas fa-volume-mute";
    Howler.mute(!isMuted);
}

function endGame() {
    gameState.gameOver = true;
    const winner = gameState.playerScore > gameState.aiScore ? "Player" : "AI";
    
    const overlay = document.getElementById("gameOverlay");
    overlay.querySelector("h2").textContent = `${winner} Wins!`;
    overlay.classList.add("active");
}

// Start the game
initGame();
gameLoop();
