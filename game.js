// Created By: Mohammed Yash Hossain
// Date Created 1/14/25

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game constants
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 8;
const NET_WIDTH = 10;
const KITCHEN_WIDTH = 7 * 12; // 7 feet in pixels
const COURT_WIDTH = 20 * 12; // 20 feet in pixels
const COURT_HEIGHT = 44 * 12; // 44 feet in pixels

// Court dimensions
const COURT = {
    width: COURT_WIDTH,
    height: COURT_HEIGHT,
    netX: COURT_WIDTH / 2,
    kitchenLine: KITCHEN_WIDTH,
    leftServiceBox: COURT_WIDTH / 4,
    rightServiceBox: (COURT_WIDTH / 4) * 3
};

// Game state
const gameState = {
    isPaused: false,
    isServing: true,
    servingSide: 'left', // 'left' or 'right'
    playerScore: 0,
    aiScore: 0,
    rallyCount: 0,
    currentServer: 'player', // 'player' or 'ai'
    gameOver: false,
    winner: null
};

// Sound effects
const sounds = {
    hit: new Audio('sounds/hit.mp3'),
    score: new Audio('sounds/score.mp3'),
    serve: new Audio('sounds/serve.mp3')
};

// Paddle properties
const paddles = {
    player: {
        x: COURT.kitchenLine + 50,
        y: COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: 8,
        type: localStorage.getItem('selectedPaddle') || 'classic'
    },
    ai: {
        x: COURT.width - COURT.kitchenLine - 50 - PADDLE_WIDTH,
        y: COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: 6,
        reactionTime: 0.2,
        type: 'pro'
    }
};

// Ball properties
const ball = {
    x: 0,
    y: 0,
    radius: BALL_RADIUS,
    speed: 0,
    velocityX: 0,
    velocityY: 0,
    spin: 0,
    lastHitBy: null,
    bounces: 0
};

// Initialize game
function init() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = COURT.width;
    canvas.height = COURT.height;
    
    // Reset ball position
    resetBall();
    
    // Update score display
    updateScore();
    
    // Start serve timer
    startServeTimer();
    
    // Event listeners
    canvas.addEventListener('mousemove', movePaddle);
    canvas.addEventListener('click', serveBall);
    
    // Game loop
    function gameLoop() {
        if (!gameState.isPaused && !gameState.gameOver) {
            update();
            draw(ctx);
        }
        requestAnimationFrame(gameLoop);
    }
    
    gameLoop();
}

// Move paddle with mouse
function movePaddle(e) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Keep paddle within court bounds
    paddles.player.y = Math.max(0, Math.min(COURT_HEIGHT - PADDLE_HEIGHT, mouseY - PADDLE_HEIGHT / 2));
}

// Serve the ball
function serveBall() {
    if (gameState.isServing) {
        gameState.isServing = false;
        sounds.serve.play();
        
        // Set initial ball position based on serving side
        ball.x = gameState.servingSide === 'left' ? 
            paddles.player.x + PADDLE_WIDTH + BALL_RADIUS : 
            paddles.ai.x - BALL_RADIUS;
        ball.y = COURT_HEIGHT / 2;
        
        // Set initial velocity
        const angle = gameState.servingSide === 'left' ? 0 : Math.PI;
        const speed = 10;
        ball.velocityX = Math.cos(angle) * speed;
        ball.velocityY = Math.sin(angle) * speed;
        ball.speed = speed;
        ball.lastHitBy = gameState.currentServer;
        ball.bounces = 0;
    }
}

// Update game state
function update() {
    if (gameState.isServing) return;
    
    // Move ball
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    
    // Apply spin effect
    ball.velocityY += ball.spin * 0.1;
    ball.spin *= 0.98; // Spin decay
    
    // Ball collision with top and bottom
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > COURT_HEIGHT) {
        ball.velocityY *= -0.8;
        ball.y = ball.y - ball.radius < 0 ? ball.radius : COURT_HEIGHT - ball.radius;
        sounds.hit.play();
    }
    
    // Ball collision with paddles
    if (ball.lastHitBy !== 'player' && checkPaddleCollision(paddles.player)) {
        hitBall(paddles.player);
    } else if (ball.lastHitBy !== 'ai' && checkPaddleCollision(paddles.ai)) {
        hitBall(paddles.ai);
    }
    
    // AI paddle movement
    moveAIPaddle();
    
    // Check for scoring
    checkScoring();
}

// Check paddle collision
function checkPaddleCollision(paddle) {
    return ball.x + ball.radius > paddle.x &&
           ball.x - ball.radius < paddle.x + paddle.width &&
           ball.y + ball.radius > paddle.y &&
           ball.y - ball.radius < paddle.y + paddle.height;
}

// Hit ball with paddle
function hitBall(paddle) {
    sounds.hit.play();
    
    // Calculate hit angle based on where the ball hit the paddle
    const hitPosition = (ball.y - paddle.y) / paddle.height;
    const angle = (hitPosition - 0.5) * Math.PI / 3; // -30 to 30 degrees
    
    // Calculate new velocity
    const speed = paddle.type === 'pro' ? 12 : paddle.type === 'elite' ? 14 : 10;
    ball.velocityX = Math.cos(angle) * speed * (paddle === paddles.player ? 1 : -1);
    ball.velocityY = Math.sin(angle) * speed;
    ball.speed = speed;
    
    // Apply spin based on paddle type
    ball.spin = (hitPosition - 0.5) * (paddle.type === 'pro' ? 2 : paddle.type === 'elite' ? 3 : 1);
    
    ball.lastHitBy = paddle === paddles.player ? 'player' : 'ai';
    ball.bounces = 0;
    gameState.rallyCount++;
}

// Move AI paddle
function moveAIPaddle() {
    const targetY = ball.y - paddles.ai.height / 2;
    const currentY = paddles.ai.y;
    
    // Add some prediction based on ball trajectory
    const prediction = ball.velocityY * paddles.ai.reactionTime;
    const predictedY = targetY + prediction;
    
    // Move towards predicted position
    if (predictedY > currentY) {
        paddles.ai.y += Math.min(paddles.ai.speed, predictedY - currentY);
    } else {
        paddles.ai.y -= Math.min(paddles.ai.speed, currentY - predictedY);
    }
    
    // Keep paddle within bounds
    paddles.ai.y = Math.max(0, Math.min(COURT_HEIGHT - PADDLE_HEIGHT, paddles.ai.y));
}

// Check for scoring
function checkScoring() {
    // Ball out of bounds
    if (ball.x < 0 || ball.x > COURT.width) {
        const scorer = ball.x < 0 ? 'ai' : 'player';
        scorePoint(scorer);
    }
    
    // Kitchen rule
    if (ball.bounces > 0 && 
        ((ball.x < COURT.kitchenLine && ball.lastHitBy === 'player') ||
         (ball.x > COURT.width - COURT.kitchenLine && ball.lastHitBy === 'ai'))) {
        const scorer = ball.lastHitBy === 'player' ? 'ai' : 'player';
        scorePoint(scorer);
    }
}

// Score a point
function scorePoint(scorer) {
    sounds.score.play();
    
    if (scorer === 'player') {
        gameState.playerScore++;
    } else {
        gameState.aiScore++;
    }
    
    // Check for game over
    if (gameState.playerScore >= 11 || gameState.aiScore >= 11) {
        gameState.gameOver = true;
        gameState.winner = gameState.playerScore > gameState.aiScore ? 'player' : 'ai';
    }
    
    // Update score display
    updateScore();
    
    // Reset for next point
    resetBall();
    gameState.isServing = true;
    gameState.servingSide = gameState.servingSide === 'left' ? 'right' : 'left';
    gameState.currentServer = gameState.currentServer === 'player' ? 'ai' : 'player';
}

// Reset ball position
function resetBall() {
    ball.x = COURT.width / 2;
    ball.y = COURT_HEIGHT / 2;
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.speed = 0;
    ball.spin = 0;
    ball.lastHitBy = null;
    ball.bounces = 0;
}

// Draw game elements
function draw(ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, COURT.width, COURT.height);
    
    // Draw court
    drawCourt(ctx);
    
    // Draw paddles
    drawPaddle(ctx, paddles.player);
    drawPaddle(ctx, paddles.ai);
    
    // Draw ball
    drawBall(ctx);
    
    // Draw serve timer if serving
    if (gameState.isServing) {
        drawServeTimer(ctx);
    }
    
    // Draw game over screen
    if (gameState.gameOver) {
        drawGameOver(ctx);
    }
}

// Draw court
function drawCourt(ctx) {
    // Court background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, COURT.width, COURT.height);
    
    // Net
    ctx.fillStyle = '#333';
    ctx.fillRect(COURT.netX - NET_WIDTH / 2, 0, NET_WIDTH, COURT_HEIGHT);
    
    // Kitchen lines
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(COURT.kitchenLine, 0);
    ctx.lineTo(COURT.kitchenLine, COURT_HEIGHT);
    ctx.moveTo(COURT.width - COURT.kitchenLine, 0);
    ctx.lineTo(COURT.width - COURT.kitchenLine, COURT_HEIGHT);
    ctx.stroke();
    
    // Service boxes
    ctx.strokeStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(COURT.leftServiceBox, 0);
    ctx.lineTo(COURT.leftServiceBox, COURT_HEIGHT);
    ctx.moveTo(COURT.rightServiceBox, 0);
    ctx.lineTo(COURT.rightServiceBox, COURT_HEIGHT);
    ctx.stroke();
}

// Draw paddle
function drawPaddle(ctx, paddle) {
    ctx.fillStyle = paddle.type === 'pro' ? '#2196F3' : 
                   paddle.type === 'elite' ? '#FF9800' : '#4CAF50';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

// Draw ball
function drawBall(ctx) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF5722';
    ctx.fill();
    ctx.closePath();
}

// Draw serve timer
function drawServeTimer(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, COURT.width, COURT_HEIGHT);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Click to Serve', COURT.width / 2, COURT_HEIGHT / 2);
}

// Draw game over screen
function drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, COURT.width, COURT_HEIGHT);
    
    ctx.fillStyle = '#fff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
        `Game Over - ${gameState.winner === 'player' ? 'You Win!' : 'AI Wins!'}`,
        COURT.width / 2,
        COURT_HEIGHT / 2
    );
    
    ctx.font = '24px Arial';
    ctx.fillText(
        'Click to Play Again',
        COURT.width / 2,
        COURT_HEIGHT / 2 + 40
    );
}

// Update score display
function updateScore() {
    document.getElementById('playerScore').textContent = gameState.playerScore;
    document.getElementById('aiScore').textContent = gameState.aiScore;
}

// Start serve timer
function startServeTimer() {
    const timer = document.getElementById('serveTimer');
    timer.style.display = 'block';
    setTimeout(() => {
        timer.style.display = 'none';
    }, 3000);
}

// Initialize game when window loads
window.onload = init;
