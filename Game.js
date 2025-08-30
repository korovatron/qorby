// Delay in ms after drop-in before movement is allowed
const DROPIN_INPUT_DELAY = 100;
// Image loading utility
export const imageSources = {
  qorby: 'images/qorbyTitle.png'
};

export const images = {};

export function loadImages(onAllLoaded) {
  let loadedCount = 0;
  const total = Object.keys(imageSources).length;
  Object.entries(imageSources).forEach(([key, src]) => {
    const img = new Image();
    img.onload = () => {
      loadedCount++;
      if (loadedCount === total) {
        onAllLoaded();
      }
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
    };
    img.src = src;
    images[key] = img;
  });
}
// Game.js
import { InputManager } from './InputManager.js';

export const BASE_WIDTH = 896;
export const BASE_HEIGHT = 1024;
export const GAME_STATE = {
  TITLE: 0,
  PLAYING: 1,
  LEVEL_COMPLETE: 2,
  GAME_OVER: 3
};

const PYRAMID_ROWS = 7;
const BLOCK_SIZE = 100; // width of each cube 
const BLOCK_HEIGHT = 75; // height of each cube 

export class Game {
  // Draws a color progression diagram under the lives display
  drawColorProgressionDiagram() {
    const ctx = this.context;
    const colors = this.getCubeColors();
    const behavior = this.getCubeColorBehavior();
    // Enlarge diagram by scale factor 2
    const scale = 2;
    const cubeW = BLOCK_SIZE * 0.25 * scale;
    const cubeH = BLOCK_HEIGHT * 0.25 * scale;
    const margin = 8 * scale;
    const arrowGap = 10 * scale; // gap before and after arrow
    const arrowLen = 18 * scale;
    const arrowHead = 6 * scale;
    // Position in the center of the space below the pyramid
    // Pyramid typically occupies upper 2/3, so center this in the lower 1/3
    const pyramidBottom = BASE_HEIGHT * 0.67; // Approximate bottom of pyramid
    const availableSpace = BASE_HEIGHT - pyramidBottom;
    const startY = pyramidBottom + (availableSpace / 2) - (cubeH / 2); // Center vertically in available space
    // Calculate total width for center alignment
    const totalWidth = colors.length * cubeW + (colors.length - 1) * (arrowLen + 2 * arrowGap);
    // Center align diagram at bottom
    const startX = (BASE_WIDTH - totalWidth) / 2;
    // Draw cubes and arrows
    for (let i = 0; i < colors.length; i++) {
      // Add gap before each cube except the first
      const cx = startX + i * (cubeW + arrowLen + 2 * arrowGap);
      const cy = startY + cubeH / 2;
      // Draw mini cube (top face only, sides gray)
      this.drawCube(cx + cubeW / 2, cy + cubeH / 2, cubeW, cubeH, colors[i], '#888', '#444');
      // Draw arrow to next (except last, unless cycle)
      if (i < colors.length - 1) {
        // Arrow from right of this cube to left of next, with gaps
        const ax1 = cx + cubeW + arrowGap;
        const ay = cy + cubeH / 2;
        const ax2 = ax1 + arrowLen;
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax1, ay);
        ctx.lineTo(ax2, ay);
        // Arrowhead
        ctx.lineTo(ax2 - arrowHead, ay - arrowHead);
        ctx.moveTo(ax2, ay);
        ctx.lineTo(ax2 - arrowHead, ay + arrowHead);
        ctx.stroke();
        ctx.restore();
      } else if (behavior === 'cycle' && colors.length > 1) {
        // Draw a loop arrow: start at center bottom of last cube, move down past cube, then left, then up to first cube
        const arrowYOffset = 7 * scale; // move the whole arrow down by this many pixels
        const lastCubeCenterX = cx + cubeW / 2;
        const lastCubeBottomY = cy + cubeH + arrowYOffset; // center bottom of last cube, shifted down
        const firstCubeCenterX = startX + cubeW / 2;
        const firstCubeBottomY = cy + cubeH + arrowYOffset; // same y as last cube, shifted down
        const gapBelow = 10 * scale; // visible gap below cube before arrow starts
        const loopDown = 18 * scale; // vertical length after gap
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Move to center bottom of last cube
        ctx.moveTo(lastCubeCenterX, lastCubeBottomY);
        // Move down past the cube (gap)
        ctx.moveTo(lastCubeCenterX, lastCubeBottomY + gapBelow);
        // Draw vertical down (pen to paper)
        ctx.lineTo(lastCubeCenterX, lastCubeBottomY + gapBelow + loopDown);
        // Go left to under first cube
        ctx.lineTo(firstCubeCenterX, lastCubeBottomY + gapBelow + loopDown);
        // Go up with gap before first cube
        ctx.lineTo(firstCubeCenterX, firstCubeBottomY + gapBelow);
        // Arrowhead at top of up line (with gap)
        ctx.lineTo(firstCubeCenterX - arrowHead, firstCubeBottomY + gapBelow + arrowHead);
        ctx.moveTo(firstCubeCenterX, firstCubeBottomY + gapBelow);
        ctx.lineTo(firstCubeCenterX + arrowHead, firstCubeBottomY + gapBelow + arrowHead);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  // List of colors for cube progression (yellow to red)
  getCubeColors() {

    switch (this.level) {
      case 1:
        return ['#fdcb36', '#d63031']; // yellow, red
      case 2:
        return ['#fdcb36', '#d63031']; // yellow, red
      case 3:
        return ['#fdcb36', '#00b894', '#d63031']; // yellow, green, red
      case 4:
        return ['#fdcb36', '#00b894', '#0984e3', '#d63031']; // yellow, green, blue, red
      default:
        return ['#fdcb36', '#00b894', '#0984e3', '#d63031']; // yellow, green, blue, red
    }
  }

  // Decide color change behavior for the current level
  getCubeColorBehavior() {
    // Example: even levels = step and fix at red, odd levels = cycle endlessly
     switch (this.level) {
      case 1:
        return 'step-to-red'; // Behavior 1
      case 2:
        return 'cycle'; // Behavior 2
      default:
        return 'step-to-red'; // Default to Behavior 1
    }
  }

  // Change the color of the cube at (row, col) as if landed on it
  landOnCube(row, col) {
    if (
      this.pyramid &&
      this.pyramid[row] &&
      this.pyramid[row][col]
    ) {
      const cube = this.pyramid[row][col];
      const colors = this.getCubeColors();
      const behavior = this.getCubeColorBehavior();
      const currentIdx = colors.indexOf(cube.color);
      const oldColor = cube.color;
      
      if (behavior === 'step-to-red') {
        // Step to next color, stop at last (red)
        if (currentIdx < colors.length - 1) {
          cube.color = colors[currentIdx + 1];
        }
        // else do nothing (fixed at red)
      } else if (behavior === 'cycle') {
        // Cycle through colors endlessly
        cube.color = colors[(currentIdx + 1) % colors.length];
      }
      
      // Play sound based on color change
      if (cube.color !== oldColor) {
        // Color changed - play appropriate sound
        if (window.audioSprite) {
          const redColor = colors[colors.length - 1]; // Last color in array is red
          if (cube.color === redColor) {
            window.audioSprite.play('red');
          } else {
            window.audioSprite.play('notRed');
          }
        }
      }
      // If color didn't change, play no sound
      
      this._lastLandTime = performance.now();
    }
  }

  // Enemy lands on cube (reverse color change)
  enemyLandOnCube(row, col) {
    if (
      this.pyramid &&
      this.pyramid[row] &&
      this.pyramid[row][col]
    ) {
      const cube = this.pyramid[row][col];
      const colors = this.getCubeColors();
      const behavior = this.getCubeColorBehavior();
      const currentIdx = colors.indexOf(cube.color);
      if (behavior === 'step-to-red') {
        // Step back to previous color, stop at first (yellow)
        if (currentIdx > 0) {
          cube.color = colors[currentIdx - 1];
        }
        // else do nothing (fixed at yellow)
      } else if (behavior === 'cycle') {
        // Cycle backwards through colors
        cube.color = colors[(currentIdx - 1 + colors.length) % colors.length];
      }
    }
  }

  // Get enemy spawn configuration for current level
  getEnemySpawnConfig() {
    switch (this.level) {
      case 1:
        return { maxEnemies: 1, minSpawnDelay: 3, maxSpawnDelay: 6 };
      case 2:
        return { maxEnemies: 1, minSpawnDelay: 4, maxSpawnDelay: 10 };
      case 3:
        return { maxEnemies: 2, minSpawnDelay: 3, maxSpawnDelay: 7 };
      case 4:
        return { maxEnemies: 3, minSpawnDelay: 5, maxSpawnDelay: 10 };
      case 5:
        return { maxEnemies: 2, minSpawnDelay: 1, maxSpawnDelay: 4 };
      case 6:
        return { maxEnemies: 3, minSpawnDelay: 2, maxSpawnDelay: 6 };
      case 7:
        return { maxEnemies: 4, minSpawnDelay: 3, maxSpawnDelay: 8 };
      case 8:
        return { maxEnemies: 3, minSpawnDelay: 1, maxSpawnDelay: 3 };
      default:
        // For levels 9+, gradually increase difficulty
        const maxEnemies = Math.min(3 + Math.floor((this.level - 9) / 3), 6);
        const minDelay = Math.max(1, 4 - Math.floor((this.level - 9) / 2));
        const maxDelay = Math.max(minDelay + 1, 7 - Math.floor((this.level - 9) / 2));
        return { maxEnemies, minSpawnDelay: minDelay, maxSpawnDelay: maxDelay };
    }
  }

  // Get number of enemies for current level 
  getEnemyCount() {
    return this.getEnemySpawnConfig().maxEnemies;
  }

  // Get random spawn delay based on current level
  getRandomSpawnDelay() {
    const config = this.getEnemySpawnConfig();
    const min = config.minSpawnDelay;
    const max = config.maxSpawnDelay;
    return min + Math.random() * (max - min);
  }

  // Create a new enemy
  createEnemy() {
    // Find a random cube that's not apex or edge
    const validPositions = [];
    for (let row = 1; row < PYRAMID_ROWS - 1; row++) { // Skip top and bottom rows
      for (let col = 1; col < row; col++) { // Skip edge columns
        validPositions.push({ row, col });
      }
    }

    // Determine enemy type (50/50 chance)
    const enemyType = Math.random() < 0.5 ? 'A' : 'B';

    if (validPositions.length === 0) {
      // Fallback if no valid positions 
      return {
        row: 1,
        col: 0,
        type: enemyType,
        dropIn: true,
        dropY: -100,
        dropStart: performance.now() / 1000,
        dropDuration: 0.8,
        dropProgress: 0,
        jumping: false,
        jumpFrom: null,
        jumpTo: null,
        jumpStart: 0,
        jumpDuration: 0.35,
        jumpProgress: 0,
        falling: false,
        fallX: null,
        fallY: null,
        fallCurrentX: null,
        fallCurrentY: null,
        fallVelocity: 0,
        fallVelocityX: 0,
        fallBehind: false,
        fallInFront: false,
        direction: this.getRandomDirection(),
        respawning: false,
        destroying: false,
        destructionProgress: 0
      };
    }

    const pos = validPositions[Math.floor(Math.random() * validPositions.length)];
    return {
      row: pos.row,
      col: pos.col,
      type: enemyType,
      dropIn: true,
      dropY: -100,
      dropStart: performance.now() / 1000 + this.getRandomSpawnDelay(),
      dropDuration: 0.8,
      dropProgress: 0,
      jumping: false,
      jumpFrom: null,
      jumpTo: null,
      jumpStart: 0,
      jumpDuration: 0.35,
      jumpProgress: 0,
      falling: false,
      fallX: null,
      fallY: null,
      fallCurrentX: null,
      fallCurrentY: null,
      fallVelocity: 0,
      fallVelocityX: 0,
      fallBehind: false,
      fallInFront: false,
      direction: this.getRandomDirection(),
      respawning: false,
      destroying: false,
      destructionProgress: 0
    };
  }

  // Get random direction for enemy movement
  getRandomDirection() {
    const directions = ['SE', 'SW', 'NE', 'NW'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  // Convert direction to target position
  getDirectionTarget(row, col, direction) {
    switch (direction) {
      case 'SE': return { row: row + 1, col: col + 1 };
      case 'SW': return { row: row + 1, col: col };
      case 'NE': return { row: row - 1, col: col };
      case 'NW': return { row: row - 1, col: col - 1 };
      default: return { row: row + 1, col: col };
    }
  }

  // Spawn enemies for the current level
  spawnEnemies() {
    this.enemies = [];
    const config = this.getEnemySpawnConfig();

    // Start with one enemy, others will spawn dynamically based on level config
    if (config.maxEnemies > 0) {
      const enemy = this.createEnemy();
      enemy.dropStart = performance.now() / 1000 + 2; // Initial delay of 2 seconds
      this.enemies.push(enemy);
    }
  }

  // Check if we need to spawn more enemies and spawn them if needed
  manageEnemySpawning() {
    const config = this.getEnemySpawnConfig();
    const now = performance.now() / 1000;

    // Count all enemies including those being destroyed (they will be replaced automatically)
    const totalEnemies = this.enemies.length;

    // If we have fewer total enemies than the max, spawn a new one
    if (totalEnemies < config.maxEnemies) {
      const newEnemy = this.createEnemy();
      this.enemies.push(newEnemy);
    }
  }

  // Check collision between player and enemies
  checkPlayerEnemyCollision() {
    const xStart = BASE_WIDTH / 2;
    const yStart = (BASE_HEIGHT - (this.pyramid.length * 75)) / 2 + 75 / 2;
    const BLOCK_SIZE = 100;
    const BLOCK_HEIGHT = 75;
    const COLLISION_DISTANCE = 30; // Pixels - how close they need to be to collide

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Skip if either is falling, dropping in, or already destroying
      if (enemy.dropIn || enemy.falling || enemy.destroying ||
        this.player.falling || this.player.dropIn || this.player.destroying) {
        continue;
      }

      // Check for collision in two scenarios:
      // 1. Both are seated on cubes (original logic)
      // 2. At least one is jumping (mid-air collision using actual positions)

      if (!enemy.jumping && !this.player.jumping) {
        // Both seated - check cube coordinates
        if (enemy.row === this.player.row && enemy.col === this.player.col) {
          this.startCollisionDestruction(enemy);
          return true;
        }
      } else {
        // At least one is jumping - check actual screen positions

        // Calculate player position
        let playerX, playerY;
        if (this.player.jumping && this.player.jumpFrom && this.player.jumpTo) {
          const t = this.player.jumpProgress;
          const from = this.player.jumpFrom;
          const to = this.player.jumpTo;
          const fromX = xStart + (from.col - from.row / 2) * BLOCK_SIZE;
          const fromY = yStart + from.row * BLOCK_HEIGHT;
          const toX = xStart + (to.col - to.row / 2) * BLOCK_SIZE;
          const toY = yStart + to.row * BLOCK_HEIGHT;
          const arcHeight = BLOCK_HEIGHT * 1.2;
          playerX = fromX + (toX - fromX) * t;
          playerY = fromY + (toY - fromY) * t - arcHeight * Math.sin(Math.PI * t);
        } else {
          // Player is seated
          playerX = xStart + (this.player.col - this.player.row / 2) * BLOCK_SIZE;
          playerY = yStart + this.player.row * BLOCK_HEIGHT;
        }

        // Calculate enemy position
        let enemyX, enemyY;
        if (enemy.jumping && enemy.jumpFrom && enemy.jumpTo) {
          const t = enemy.jumpProgress;
          const from = enemy.jumpFrom;
          const to = enemy.jumpTo;
          const fromX = xStart + (from.col - from.row / 2) * BLOCK_SIZE;
          const fromY = yStart + from.row * BLOCK_HEIGHT;
          const toX = xStart + (to.col - to.row / 2) * BLOCK_SIZE;
          const toY = yStart + to.row * BLOCK_HEIGHT;
          const arcHeight = BLOCK_HEIGHT * 1.2;
          enemyX = fromX + (toX - fromX) * t;
          enemyY = fromY + (toY - fromY) * t - arcHeight * Math.sin(Math.PI * t);
        } else {
          // Enemy is seated
          enemyX = xStart + (enemy.col - enemy.row / 2) * BLOCK_SIZE;
          enemyY = yStart + enemy.row * BLOCK_HEIGHT;
        }

        // Check distance between positions
        const distance = Math.sqrt((playerX - enemyX) ** 2 + (playerY - enemyY) ** 2);
        if (distance <= COLLISION_DISTANCE) {
          this.startCollisionDestruction(enemy);
          return true;
        }
      }
    }
    return false;
  }

  startCollisionDestruction(enemy) {
    // Mark enemy as having collided with player (for scoring purposes)
    enemy.collidedWithPlayer = true;

    // Reset streak multiplier on collision
    this.updateStreakMultiplier(false);

    // Play smash sound when player collides with enemy
    if (window.audioSprite) {
      window.audioSprite.play('smash');
    }

    const xStart = BASE_WIDTH / 2;
    const yStart = (BASE_HEIGHT - (this.pyramid.length * 75)) / 2 + 75 / 2;
    const BLOCK_SIZE = 100;
    const BLOCK_HEIGHT = 75;

    // Calculate current positions to use as collision center point
    let playerX, playerY;
    if (this.player.jumping && this.player.jumpFrom && this.player.jumpTo) {
      const t = this.player.jumpProgress;
      const from = this.player.jumpFrom;
      const to = this.player.jumpTo;
      const fromX = xStart + (from.col - from.row / 2) * BLOCK_SIZE;
      const fromY = yStart + from.row * BLOCK_HEIGHT;
      const toX = xStart + (to.col - to.row / 2) * BLOCK_SIZE;
      const toY = yStart + to.row * BLOCK_HEIGHT;
      const arcHeight = BLOCK_HEIGHT * 1.2;
      playerX = fromX + (toX - fromX) * t;
      playerY = fromY + (toY - fromY) * t - arcHeight * Math.sin(Math.PI * t);
    } else {
      playerX = xStart + (this.player.col - this.player.row / 2) * BLOCK_SIZE;
      playerY = yStart + this.player.row * BLOCK_HEIGHT;
    }

    let enemyX, enemyY;
    if (enemy.jumping && enemy.jumpFrom && enemy.jumpTo) {
      const t = enemy.jumpProgress;
      const from = enemy.jumpFrom;
      const to = enemy.jumpTo;
      const fromX = xStart + (from.col - from.row / 2) * BLOCK_SIZE;
      const fromY = yStart + from.row * BLOCK_HEIGHT;
      const toX = xStart + (to.col - to.row / 2) * BLOCK_SIZE;
      const toY = yStart + to.row * BLOCK_HEIGHT;
      const arcHeight = BLOCK_HEIGHT * 1.2;
      enemyX = fromX + (toX - fromX) * t;
      enemyY = fromY + (toY - fromY) * t - arcHeight * Math.sin(Math.PI * t);
    } else {
      enemyX = xStart + (enemy.col - enemy.row / 2) * BLOCK_SIZE;
      enemyY = yStart + enemy.row * BLOCK_HEIGHT;
    }

    // Calculate midpoint between current positions as collision center
    const collisionX = (playerX + enemyX) / 2;
    const collisionY = (playerY + enemyY) / 2;

    // Create explosion particles
    this.createExplosionParticles(collisionX, collisionY, enemy);

    // Start destruction animation for both player and enemy
    this.player.destroying = true;
    this.player.destructionStart = performance.now() / 1000;
    this.player.destructionDuration = 0.5; // Shorter duration for explosion effect
    this.player.collisionCenter = { x: collisionX, y: collisionY };
    this.player.destructionStartPos = { x: playerX, y: playerY };

    enemy.destroying = true;
    enemy.destructionStart = performance.now() / 1000;
    enemy.destructionDuration = 0.5; // Shorter duration for explosion effect
    enemy.collisionCenter = { x: collisionX, y: collisionY };
    enemy.destructionStartPos = { x: enemyX, y: enemyY };
  }

  createExplosionParticles(x, y, enemy) {
    // Initialize particles array if it doesn't exist
    if (!this.explosionParticles) {
      this.explosionParticles = [];
    }

    const particleCount = 20; // Number of particles to create

    // Generate color palettes based on the colliding orbs
    const playerColors = [
      '#ff66cc', // Player pink
      '#8e44ad', // Player purple  
      '#ff99dd', // Light pink variant
      '#b359c7', // Mid purple variant
      '#ff33bb'  // Bright pink variant
    ];

    let enemyColors;
    if (enemy.type === 'B') {
      // Green enemy colors
      enemyColors = [
        '#32ff50', // Bright green
        '#20cd32', // Mid green
        '#66ff80', // Light green
        '#40e060', // Lime green
        '#145028'  // Dark green
      ];
    } else {
      // Red/Orange enemy colors (Type A)
      enemyColors = [
        '#e74c3c', // Bright red
        '#f39c12', // Orange
        '#ff6b47', // Red-orange
        '#d35400', // Dark orange
        '#c0392b'  // Dark red
      ];
    }

    // Combine both color palettes for mixed explosion
    const allColors = [...playerColors, ...enemyColors];

    for (let i = 0; i < particleCount; i++) {
      // Random direction and speed
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5; // Spread evenly with some randomness
      const speed = 150 + Math.random() * 100; // 150-250 pixels/second
      const size = 3 + Math.random() * 4; // 3-7 pixel radius

      const particle = {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        initialSize: size,
        color: allColors[Math.floor(Math.random() * allColors.length)],
        life: 1.0, // 1.0 = fully alive, 0.0 = dead
        decay: 0.8 + Math.random() * 0.4, // 0.8-1.2 decay rate per second
        gravity: 200 + Math.random() * 100, // Gravity effect
        createdAt: performance.now() / 1000
      };

      this.explosionParticles.push(particle);
    }
  }

  updateExplosionParticles(deltaTime) {
    if (!this.explosionParticles) return;

    // Update each particle
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const particle = this.explosionParticles[i];

      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // Apply gravity
      particle.vy += particle.gravity * deltaTime;

      // Update life
      particle.life -= particle.decay * deltaTime;

      // Update size (shrink over time)
      particle.size = particle.initialSize * particle.life;

      // Remove dead particles
      if (particle.life <= 0 || particle.size <= 0) {
        this.explosionParticles.splice(i, 1);
      }
    }
  }

  drawExplosionParticles() {
    if (!this.explosionParticles || this.explosionParticles.length === 0) return;

    const ctx = this.context;
    ctx.save();

    this.explosionParticles.forEach(particle => {
      if (particle.life > 0 && particle.size > 0) {
        ctx.save();

        // Set opacity based on life
        ctx.globalAlpha = Math.max(0, particle.life);

        // Draw particle as a small circle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Add a slight glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 2;
        ctx.fill();

        ctx.restore();
      }
    });

    ctx.restore();
  }

  drawEnemyDropShadows(xStart, yStart, enemyPositions) {
    const ctx = this.context;
    const BLOCK_SIZE = 100;
    const BLOCK_HEIGHT = 75;

    ctx.save();

    enemyPositions.forEach(({ enemy }) => {
      // Only draw shadow for enemies that are actively dropping (progress > 0 and < 1)
      if (enemy.dropIn && enemy.dropProgress > 0 && enemy.dropProgress < 1) {
        // Calculate the position of the target cube
        const targetX = xStart + (enemy.col - enemy.row / 2) * BLOCK_SIZE;
        const targetY = yStart + enemy.row * BLOCK_HEIGHT;

        // Shadow opacity based on drop progress - more visible as enemy gets closer
        const shadowOpacity = 0.7 * enemy.dropProgress; // Increased max opacity to 70%

        ctx.save();
        ctx.globalAlpha = shadowOpacity;

        // Draw shadow as a dark ellipse on the cube surface
        const shadowRadius = BLOCK_SIZE * 0.3; // Slightly larger shadow
        const shadowX = targetX;
        const shadowY = targetY - BLOCK_HEIGHT / 8; // Slightly above the cube center

        // Create gradient for shadow depth with stronger contrast
        const shadowGradient = ctx.createRadialGradient(
          shadowX, shadowY, 0,
          shadowX, shadowY, shadowRadius
        );
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)'); // Darker center
        shadowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)'); // More visible mid-range
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Draw shadow ellipse
        ctx.beginPath();
        ctx.save();
        ctx.translate(shadowX, shadowY);
        ctx.scale(1, 0.6); // Flatten the circle into an ellipse for better shadow effect
        ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2);
        ctx.restore();
        ctx.fillStyle = shadowGradient;
        ctx.fill();

        ctx.restore();
      }
    });

    ctx.restore();
  }

  // Check if all cubes are red (level complete)
  isLevelComplete() {
    for (let row = 0; row < this.pyramid.length; row++) {
      for (let col = 0; col <= row; col++) {
        if (this.pyramid[row][col].color !== '#d63031') {
          return false;
        }
      }
    }
    return true;
  }
  // Draw the main gameplay screen (pyramid and player) with correct z-index for falling
  drawGamePlay(hidePlayer = false) {
    const ctx = this.context;
    const xStart = BASE_WIDTH / 2;
    const yStart = (BASE_HEIGHT - (this.pyramid.length * BLOCK_HEIGHT)) / 2 + BLOCK_HEIGHT / 2;

    // Calculate player position
    let playerRow = this.player.row;
    let playerCol = this.player.col;
    let cx = xStart + (playerCol - playerRow / 2) * BLOCK_SIZE;
    let cy = yStart + playerRow * BLOCK_HEIGHT;
    if (this.player.jumping && this.player.jumpFrom && this.player.jumpTo) {
      const t = this.player.jumpProgress;
      const from = this.player.jumpFrom;
      const to = this.player.jumpTo;
      const fromX = xStart + (from.col - from.row / 2) * BLOCK_SIZE;
      const fromY = yStart + from.row * BLOCK_HEIGHT;
      const toX = xStart + (to.col - to.row / 2) * BLOCK_SIZE;
      const toY = yStart + to.row * BLOCK_HEIGHT;
      const arcHeight = BLOCK_HEIGHT * 1.2;
      cx = fromX + (toX - fromX) * t;
      cy = fromY + (toY - fromY) * t - arcHeight * Math.sin(Math.PI * t);
    }
    if (this.player.falling && typeof this.player.fallCurrentX === 'number' && typeof this.player.fallCurrentY === 'number') {
      cx = this.player.fallCurrentX;
      cy = this.player.fallCurrentY;
    }
    if (this.player.dropIn && typeof this.player.dropY === 'number') {
      const t = this.player.dropProgress;
      const dropStartY = -100;
      const dropEndY = yStart + playerRow * BLOCK_HEIGHT;
      cy = dropStartY + (dropEndY - dropStartY) * t;
    }
    // Handle destruction convergence - move toward collision center
    if (this.player.destroying && this.player.collisionCenter && this.player.destructionStartPos) {
      const destructionT = this.player.destructionProgress || 0;
      const startX = this.player.destructionStartPos.x;
      const startY = this.player.destructionStartPos.y;
      const targetX = this.player.collisionCenter.x;
      const targetY = this.player.collisionCenter.y;
      cx = startX + (targetX - startX) * destructionT;
      cy = startY + (targetY - startY) * destructionT;
    }

    // Calculate enemy positions
    const enemyPositions = this.enemies.map(enemy => {
      let ex = xStart + (enemy.col - enemy.row / 2) * BLOCK_SIZE;
      let ey = yStart + enemy.row * BLOCK_HEIGHT;

      if (enemy.jumping && enemy.jumpFrom && enemy.jumpTo) {
        const t = enemy.jumpProgress;
        const from = enemy.jumpFrom;
        const to = enemy.jumpTo;
        const fromX = xStart + (from.col - from.row / 2) * BLOCK_SIZE;
        const fromY = yStart + from.row * BLOCK_HEIGHT;
        const toX = xStart + (to.col - to.row / 2) * BLOCK_SIZE;
        const toY = yStart + to.row * BLOCK_HEIGHT;
        const arcHeight = BLOCK_HEIGHT * 1.2;
        ex = fromX + (toX - fromX) * t;
        ey = fromY + (toY - fromY) * t - arcHeight * Math.sin(Math.PI * t);
      } else if (enemy.falling && typeof enemy.fallCurrentX === 'number' && typeof enemy.fallCurrentY === 'number') {
        ex = enemy.fallCurrentX;
        ey = enemy.fallCurrentY;
      } else if (enemy.dropIn && typeof enemy.dropY === 'number') {
        const t = enemy.dropProgress;
        const dropStartY = -100;
        const dropEndY = yStart + enemy.row * BLOCK_HEIGHT;
        ey = dropStartY + (dropEndY - dropStartY) * t;
      }

      // Handle destruction convergence - move toward collision center
      if (enemy.destroying && enemy.collisionCenter && enemy.destructionStartPos) {
        const destructionT = enemy.destructionProgress || 0;
        const startX = enemy.destructionStartPos.x;
        const startY = enemy.destructionStartPos.y;
        const targetX = enemy.collisionCenter.x;
        const targetY = enemy.collisionCenter.y;
        ex = startX + (targetX - startX) * destructionT;
        ey = startY + (targetY - startY) * destructionT;
      }

      return { enemy, x: ex, y: ey };
    });

    // Draw player behind pyramid if falling behind
    if (!hidePlayer && this.player.falling && this.player.fallBehind && !this.player.respawning) {
      this.drawPlayer(cx, cy);
    }

    // Draw enemies behind pyramid if falling behind
    enemyPositions.forEach(({ enemy, x, y }) => {
      if (enemy.falling && enemy.fallBehind) {
        this.drawEnemy(x, y, enemy);
      }
    });

    // Draw pyramid cubes
    for (let row = 0; row < this.pyramid.length; row++) {
      for (let col = 0; col <= row; col++) {
        const cube = this.pyramid[row][col];
        const cubeCx = xStart + (col - row / 2) * BLOCK_SIZE;
        const cubeCy = yStart + row * BLOCK_HEIGHT;
        const leftColor = '#888';   // fixed gray for left face
        const rightColor = '#444';  // fixed darker gray for right face
        this.drawCube(cubeCx, cubeCy, BLOCK_SIZE, BLOCK_HEIGHT, cube.color, leftColor, rightColor);
      }
    }

    // Draw enemy drop shadows for enemies that are dropping in
    this.drawEnemyDropShadows(xStart, yStart, enemyPositions);

    // Collect all orbs (player + enemies) with their positions and z-order info
    const allOrbs = [];

    // Add player if visible and not respawning
    if (!hidePlayer && !this.player.respawning) {
      let effectiveRow = this.player.row;

      // If jumping, use interpolated row position for z-ordering
      if (this.player.jumping && this.player.jumpFrom && this.player.jumpTo) {
        const t = this.player.jumpProgress;
        effectiveRow = this.player.jumpFrom.row + (this.player.jumpTo.row - this.player.jumpFrom.row) * t;
      }

      // Skip if falling behind pyramid
      if (!this.player.falling || this.player.fallInFront || (this.player.falling && !this.player.fallBehind && !this.player.fallInFront)) {
        allOrbs.push({
          type: 'player',
          x: cx,
          y: cy,
          zOrder: effectiveRow,
          entity: this.player
        });
      }
    }

    // Add enemies
    enemyPositions.forEach(({ enemy, x, y }) => {
      let effectiveRow = enemy.row;

      // If jumping, use interpolated row position for z-ordering
      if (enemy.jumping && enemy.jumpFrom && enemy.jumpTo) {
        const t = enemy.jumpProgress;
        effectiveRow = enemy.jumpFrom.row + (enemy.jumpTo.row - enemy.jumpFrom.row) * t;
      }

      // Skip if falling behind pyramid
      if (!enemy.falling || enemy.fallInFront || (enemy.falling && !enemy.fallBehind && !enemy.fallInFront)) {
        allOrbs.push({
          type: 'enemy',
          x: x,
          y: y,
          zOrder: effectiveRow,
          entity: enemy
        });
      }
    });

    // Sort orbs by z-order (row position) - back to front (lower row numbers first)
    allOrbs.sort((a, b) => a.zOrder - b.zOrder);

    // Draw orbs in correct z-order
    allOrbs.forEach(orb => {
      if (orb.type === 'player') {
        this.drawPlayer(orb.x, orb.y);
      } else {
        this.drawEnemy(orb.x, orb.y, orb.entity);
      }
    });

    // Draw explosion particles on top
    this.drawExplosionParticles();
  }

  // Utility to shade a color (hex) by percent
  shadeColor(color, percent) {
    // color: '#rrggbb', percent: -20 (darker) or 20 (lighter)
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.min(255, Math.max(0, R + Math.round(2.55 * percent)));
    G = Math.min(255, Math.max(0, G + Math.round(2.55 * percent)));
    B = Math.min(255, Math.max(0, B + Math.round(2.55 * percent)));
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }
  // Reset the pyramid and player position for a new level or game
  resetPyramid() {
    this.pyramid = this.createPyramid();
    this.resetLevelScoring(); // Reset level-specific scoring counters
    this.player.row = 0;
    this.player.col = 0;
    this.player.jumping = false;
    this.player.jumpFrom = null;
    this.player.jumpTo = null;
    this.player.jumpStart = 0;
    this.player.jumpProgress = 0;
    this.player.falling = false;
    this.player.fallX = null;
    this.player.fallY = null;
    this.player.respawning = false;
    this.player.dropIn = true;
    this.player.dropY = -100;
    this.player.dropStart = performance.now() / 1000;
    this.player.dropDuration = 0.5;
    this.player.dropProgress = 0;

    // Spawn enemies for this level
    this.spawnEnemies();
  }
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
    this.scale = 1;
    this.deltaTime = 0;
    this.oldTimeStamp = 0;
    this.keyboardTimer = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mute = false;
    this.gameState = GAME_STATE.TITLE;
    this.spacePressed = false;
    this._tapDetected = false;
    this.input = new InputManager();
    this.input.onTap = this.handleTap.bind(this);
    this._inputBlockedUntil = 0; // timestamp in ms
    this.lives = 4; // Player starts with 4 lives
    this.level = 1; // Start at level 1

    // Scoring system
    this.score = 0;
    this.levelStartTime = 0;
    this.streakMultiplier = 1;
    this.consecutivePerfectMoves = 0;
    this.enemiesAvoided = 0;
    this.movesThisLevel = 0;
    this.lastScoreBreakdown = null;

    // Player position (row, col)
    this.player = {
      row: 0,
      col: 0,
      jumping: false,
      jumpFrom: null, // {row, col}
      jumpTo: null,   // {row, col}
      jumpStart: 0,
      jumpDuration: 0.3, // seconds
      jumpProgress: 0,
      falling: false,
      fallX: null,
      fallY: null,
      respawning: false,
      dropIn: false,
      dropY: null
    };
    // Enemies array
    this.enemies = [];
    // For swipe detection
    this._swipeStart = null;
    this.pyramid = this.createPyramid();
    this.attachEvents();
    this.resizeCanvas();
    window.requestAnimationFrame(this.gameLoop.bind(this));
  }

  createPyramid() {
    let pyramid = [];
    for (let row = 0; row < PYRAMID_ROWS; row++) {
      pyramid[row] = [];
      for (let col = 0; col <= row; col++) {
        pyramid[row][col] = {
          color: '#fdcb36', // yellow/orange (default)
          visited: false
        };
      }
    }
    return pyramid;
  }

  handleTap(touch) {
    if (this.gameState === GAME_STATE.TITLE) {
      this._tapDetected = true;
    } else if (this.gameState === GAME_STATE.GAME_OVER) {
      // Return to title screen on tap
      this.resetToTitle();
    } else if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      if (this.completedLevel === 28) {
        // Game complete - return to title instead of advancing
        this.resetToTitle();
      } else {
        // Regular level progression
        this.level++;
        this.resetPyramid();
        this.gameState = GAME_STATE.PLAYING;
      }
    }
    // Add more tap logic for other states if needed
  }

  attachEvents() {
    window.addEventListener('resize', this.resizeCanvas.bind(this));
    window.addEventListener('orientationchange', this.resizeCanvas.bind(this));
    document.addEventListener('mousedown', e => this.getMouseClickPosition(e));
    document.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        this.spacePressed = true;
        if (this.gameState === GAME_STATE.GAME_OVER) {
          this.resetToTitle();
        } else if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
          if (this.completedLevel === 28) {
            // Game complete - return to title instead of advancing
            this.resetToTitle();
          } else {
            // Regular level progression
            this.level++;
            this.resetPyramid();
            this.gameState = GAME_STATE.PLAYING;
          }
        }
      }
      if (this.gameState === GAME_STATE.PLAYING) {
        this.handlePlayerMoveKey(e.code);
      }
    });
    // Touch events for swipe (now on document for global detection)
    document.addEventListener('touchstart', e => this.handleTouchStart(e));
    document.addEventListener('touchmove', e => this.handleTouchMove(e));
    document.addEventListener('touchend', e => this.handleTouchEnd(e));
  }

  handlePlayerMoveKey(code = '') {
    // Don't allow new move if already jumping/falling/respawning/destroying or during drop-in or input delay
    if (this.player.jumping || this.player.falling || this.player.respawning || this.player.dropIn || this.player.destroying) return;
    if (performance.now() < this._inputBlockedUntil) return;
    let { row, col } = this.player;
    let target = null;
    if (code === 'ArrowUp') {
      target = { row: row - 1, col: col };
    } else if (code === 'ArrowRight') {
      target = { row: row + 1, col: col + 1 };
    } else if (code === 'ArrowLeft') {
      target = { row: row - 1, col: col - 1 };
    } else if (code === 'ArrowDown') {
      target = { row: row + 1, col: col };
    }
    if (target) {
      // Check if target is on the pyramid
      const onPyramid = target.row >= 0 && target.row < PYRAMID_ROWS && target.col >= 0 && target.col <= target.row;
      this.player.jumping = true;
      this.player.jumpFrom = { row, col };
      this.player.jumpTo = target;
      this.player.jumpStart = performance.now() / 1000;
      this.player.jumpProgress = 0;
      this.player.fallAfterJump = !onPyramid;

      // Add movement scoring
      this.movesThisLevel++;
      this.addScore(25, 'Movement');

      // Check for perfect move (no enemies very close)
      const nearbyEnemies = this.enemies.filter(enemy => {
        const dist = Math.abs(enemy.row - target.row) + Math.abs(enemy.col - target.col);
        return dist <= 2 && !enemy.destroying;
      });

      this.updateStreakMultiplier(nearbyEnemies.length === 0);
    }
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      this._swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this._swipeLastDir = null;
      this._swipeActive = true;
      this._swipeRepeatTimer = 0;
    }
  }

  handleTouchMove(e) {
    if (!this._swipeStart || !this._swipeActive) return;
    let touch = e.touches[0];
    let dx = touch.clientX - this._swipeStart.x;
    let dy = touch.clientY - this._swipeStart.y;
    let absDx = Math.abs(dx);
    let absDy = Math.abs(dy);
    if (absDx < 20 && absDy < 20) return; // ignore tiny swipes
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    let dir = null;
    if ((angle >= -70 && angle <= -20)) {
      dir = 'ArrowUp';
    } else if (angle > 20 && angle < 70) {
      dir = 'ArrowRight';
    } else if (angle > 110 && angle < 160) {
      dir = 'ArrowDown';
    } else if (angle < -110 && angle > -160) {
      dir = 'ArrowLeft';
    }
    if (dir && dir !== this._swipeLastDir) {
      this._swipeLastDir = dir;
      this._swipeRepeatTimer = 0;
      this._swipeLastMoveTime = performance.now();
      this.handlePlayerMoveKey(dir);
      // Reset swipe start to current position for more sensitive direction changes
      this._swipeStart = { x: touch.clientX, y: touch.clientY };
    }
  }

  handleTouchEnd(e) {
    this._swipeStart = null;
    this._swipeActive = false;
    this._swipeLastDir = null;
    this._swipeRepeatTimer = 0;
  }

  resizeCanvas() {
    const gameWidth = this.canvas.width = BASE_WIDTH;
    const gameHeight = this.canvas.height = BASE_HEIGHT;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scaleX = windowWidth / gameWidth;
    const scaleY = windowHeight / gameHeight;
    this.scale = Math.min(scaleX, scaleY);
    this.canvas.style.transform = `scale(${this.scale})`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${(windowWidth - gameWidth * this.scale) / 2}px`;
    this.canvas.style.top = `${(windowHeight - gameHeight * this.scale) / 2}px`;
  }

  getMouseClickPosition(event) {
    let rect = this.canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    this.mouseX = Math.round(x / this.scale);
    this.mouseY = Math.round(y / this.scale);
    this.checkMouseClickButtons();
  }

  checkMouseClickButtons() {
    // Add mute button or other UI logic here if needed
  }

  gameLoop(timeStamp) {
    this.deltaTime = (timeStamp - this.oldTimeStamp) / 1000;
    this.oldTimeStamp = timeStamp;
    this.update(this.deltaTime);
    this.deltaTime = Math.min(this.deltaTime, 0.1);
    this.draw(this.deltaTime);
    window.requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    switch (this.gameState) {
      case GAME_STATE.TITLE:
        if (this.spacePressed || this._tapDetected) {
          this.gameState = GAME_STATE.PLAYING;
          this.spacePressed = false;
          this._tapDetected = false;
          this.lives = 4; // Reset lives on new game
          this.level = 1; // Reset to level 1
          this.resetScoring();
          this.resetPyramid();
        }
        break;
      case GAME_STATE.PLAYING:
        // Update all animations and full enemy logic during gameplay
        this.updatePlayerJump();
        this.updateEnemies(deltaTime); // Full enemy logic including AI/movement
        this.updateExplosionParticles(deltaTime);

        // Game-specific updates only happen during playing
        this.manageEnemySpawning(); // Check if we need more enemies
        this.checkPlayerEnemyCollision();

        // Handle drop-in animation (game-specific)
        if (this.player.dropIn) {
          const now = performance.now() / 1000;
          const elapsed = now - this.player.dropStart;
          let t = Math.min(elapsed / this.player.dropDuration, 1);
          this.player.dropProgress = t;
          if (t >= 1) {
            this.player.dropIn = false;
            this.player.dropY = null;
            // Clear any queued movement input (keyboard and swipe)
            this.spacePressed = false;
            this._swipeLastDir = null;
            this._swipeRepeatTimer = 0;
            this._swipeActive = false;
            // Block input for a short delay after landing
            this._inputBlockedUntil = performance.now() + DROPIN_INPUT_DELAY;
            // Simulate landing on apex after respawn
            this.landOnCube(0, 0);
          }
        }

        // Handle player falling
        if (this.player.falling) {
          const GRAVITY = 1800; // px/s^2
          if (typeof this.player.fallCurrentY !== 'number') {
            this.player.fallCurrentY = this.player.fallY;
            this.player.fallCurrentX = this.player.fallX;
            this.player.fallVelocity = this.player.fallVelocity || 0;
            this.player.fallVelocityX = this.player.fallVelocityX || 0;
          }
          this.player.fallVelocity += GRAVITY * deltaTime;
          this.player.fallCurrentY += this.player.fallVelocity * deltaTime;
          this.player.fallCurrentX += this.player.fallVelocityX * deltaTime;

          // Check if player has fallen far enough to be off-screen
          if (this.player.fallCurrentY > BASE_HEIGHT + 200) {
            this.player.falling = false;
            this.player.fallCurrentY = null;
            this.player.fallCurrentX = null;
            this.player.fallVelocity = null;
            this.player.fallVelocityX = null;

            // Lose a life
            this.lives--;
            if (this.lives > 0) {
              // Respawn player at top
              this.player.respawning = true;
              this.player.respawnStart = performance.now() / 1000;
              this.player.respawnDelay = 0.7;
            } else {
              // Game over
              this.gameState = GAME_STATE.GAME_OVER;
              // Play game over sound
              if (window.audioSprite) {
                window.audioSprite.play('gameOver');
              }
            }
          }
        }

        // Handle player destruction animation
        if (this.player.destroying) {
          const now = performance.now() / 1000;
          const elapsed = now - this.player.destructionStart;
          this.player.destructionProgress = Math.min(elapsed / this.player.destructionDuration, 1);

          if (this.player.destructionProgress >= 1) {
            // Destruction animation complete - clean up all destruction-related properties
            this.player.destroying = false;
            this.player.destructionProgress = 0;
            this.player.collisionCenter = null;
            this.player.destructionStartPos = null;

            // Lose a life when destruction is complete
            this.lives--;

            if (this.lives > 0) {
              // Respawn player
              this.player.respawning = true;
              this.player.respawnStart = now;
              this.player.respawnDelay = 0.7;
            } else {
              // Game over
              this.gameState = GAME_STATE.GAME_OVER;
              // Play game over sound
              if (window.audioSprite) {
                window.audioSprite.play('gameOver');
              }
            }
          }
        }

        // Handle player respawning
        if (this.player.respawning) {
          const now = performance.now() / 1000;
          const elapsed = now - this.player.respawnStart;
          if (elapsed >= this.player.respawnDelay) {
            this.player.respawning = false;
            // Reset player to top of pyramid with drop-in animation
            this.player.row = 0;
            this.player.col = 0;
            this.player.dropIn = true;
            this.player.dropY = -100; // Start well above the canvas
            this.player.dropStart = now;
            this.player.dropDuration = 0.5;
            this.player.dropProgress = 0;
          }
        }

        // Check for level completion (all cubes red)
        if (this.isLevelComplete()) {
          this.completedLevel = this.level;
          this.applyLevelBonus(); // Calculate and apply level completion bonuses
          this.gameState = GAME_STATE.LEVEL_COMPLETE;
          // Play new level sound
          if (window.audioSprite) {
            window.audioSprite.play('newLevel');
          }
        }
        this.updateSwipeRepeat(deltaTime);
        break;
      case GAME_STATE.LEVEL_COMPLETE:
        // Continue animations while waiting for tap or space to proceed to next level
        this.updateAnimations(deltaTime);
        break;
      case GAME_STATE.GAME_OVER:
        // Continue animations while waiting for tap or space to return to title
        this.updateAnimations(deltaTime);
        break;
    }
  }

  updateSwipeRepeat(deltaTime) {
    // If finger is held and not moving, repeat last direction
    if (this._swipeActive && this._swipeLastDir && !this.player.jumping && !this.player.destroying) {
      // Block swipe repeat if still in drop-in or input delay
      if (this.player.dropIn || performance.now() < this._inputBlockedUntil) return;
      if (!this._swipeRepeatTimer) this._swipeRepeatTimer = 0;
      this._swipeRepeatTimer += deltaTime;
      // Initial delay, then repeat rate
      const initialDelay = 0.25; // seconds before repeat
      const repeatRate = 0.12;   // seconds between repeats
      if (this._swipeRepeatTimer > initialDelay) {
        if (!this._swipeLastMoveTime || (performance.now() - this._swipeLastMoveTime) / 1000 > repeatRate) {
          this.handlePlayerMoveKey(this._swipeLastDir);
          this._swipeLastMoveTime = performance.now();
        }
      }
    }
  }

  updateAnimations(deltaTime) {
    // Update all ongoing animations regardless of game state
    this.updatePlayerJump();
    this.updateEnemyAnimations(deltaTime); // Only enemy animations, no AI/spawning
    this.updateExplosionParticles(deltaTime);

    // Handle player falling
    if (this.player.falling) {
      const GRAVITY = 1800; // px/s^2
      if (typeof this.player.fallCurrentY !== 'number') {
        this.player.fallCurrentY = this.player.fallY;
        this.player.fallCurrentX = this.player.fallX;
        this.player.fallVelocity = this.player.fallVelocity || 0;
        this.player.fallVelocityX = this.player.fallVelocityX || 0;
      }
      this.player.fallVelocity += GRAVITY * deltaTime;
      this.player.fallCurrentY += this.player.fallVelocity * deltaTime;
      this.player.fallCurrentX += this.player.fallVelocityX * deltaTime;

      // Check if player has fallen far enough to be off-screen
      if (this.player.fallCurrentY > BASE_HEIGHT + 200) {
        this.player.falling = false;
        this.player.fallCurrentY = null;
        this.player.fallCurrentX = null;
        this.player.fallVelocity = null;
        this.player.fallVelocityX = null;

        // Don't lose life or respawn in overlay states - just clear the falling state
        if (this.gameState === GAME_STATE.PLAYING) {
          // Lose a life
          this.lives--;
          
          if (this.lives > 0) {
            // Respawn player at top
            this.player.respawning = true;
            this.player.respawnStart = performance.now() / 1000;
            this.player.respawnDelay = 0.7;
          } else {
            // Game over - play game over sound
            this.gameState = GAME_STATE.GAME_OVER;
            if (window.audioSprite) {
              console.log('Playing game over sound');
              window.audioSprite.play('gameOver');
            }
          }
        }
      }
    }

    // Handle player destruction animation
    if (this.player.destroying) {
      const now = performance.now() / 1000;
      const elapsed = now - this.player.destructionStart;
      this.player.destructionProgress = Math.min(elapsed / this.player.destructionDuration, 1);

      if (this.player.destructionProgress >= 1) {
        // Destruction animation complete - clean up all destruction-related properties
        this.player.destroying = false;
        this.player.destructionProgress = 0;
        this.player.collisionCenter = null;
        this.player.destructionStartPos = null;

        // Only handle life loss and respawn in playing state
        if (this.gameState === GAME_STATE.PLAYING) {
          // Lose a life when destruction is complete
          this.lives--;

          if (this.lives > 0) {
            // Respawn player
            this.player.respawning = true;
            this.player.respawnStart = now;
            this.player.respawnDelay = 0.7;
          } else {
            // Game over
            this.gameState = GAME_STATE.GAME_OVER;
            // Play game over sound
            if (window.audioSprite) {
              window.audioSprite.play('gameOver');
            }
          }
        } else {
          // During overlay states, reset player to a safe state without affecting lives
          this.player.row = 0;
          this.player.col = 0;
          this.player.jumping = false;
          this.player.jumpFrom = null;
          this.player.jumpTo = null;
          this.player.jumpProgress = 0;
          this.player.falling = false;
          this.player.dropIn = false;
        }
      }
    }

    // Handle player respawning
    if (this.player.respawning) {
      const now = performance.now() / 1000;
      const elapsed = now - this.player.respawnStart;
      if (elapsed >= this.player.respawnDelay) {
        this.player.respawning = false;
        // Reset player to top of pyramid
        this.player.row = 0;
        this.player.col = 0;
        this.player.dropIn = true;
        this.player.dropStart = now;
        this.player.dropDuration = 0.5;
        this.player.dropProgress = 0;
        if (this.gameState === GAME_STATE.PLAYING) {
          this.landOnCube(0, 0);
        }
      }
    }
  }

  updatePlayerJump() {
    if (!this.player.jumping) return;
    const now = performance.now() / 1000;
    const elapsed = now - this.player.jumpStart;
    const t = Math.min(elapsed / this.player.jumpDuration, 1);
    this.player.jumpProgress = t;
    if (t >= 1) {
      // Finish jump
      this.player.row = this.player.jumpTo.row;
      this.player.col = this.player.jumpTo.col;
      // Check if landed on pyramid
      const landedRow = this.player.row;
      const landedCol = this.player.col;
      const onPyramid = landedRow >= 0 && landedRow < this.pyramid.length && landedCol >= 0 && landedCol <= landedRow;
      if (onPyramid) {
        // Use per-level color logic
        this.landOnCube(landedRow, landedCol);
      } else {
        // Start falling animation for any off-pyramid jump (including apex side-jumps)
        const xStart = BASE_WIDTH / 2;
        const yStart = (BASE_HEIGHT - (this.pyramid.length * 75)) / 2 + 75 / 2;
        const from = this.player.jumpFrom;
        const to = this.player.jumpTo;
        const fromX = xStart + (from.col - from.row / 2) * 100;
        const fromY = yStart + from.row * 75;
        const toX = xStart + (to.col - to.row / 2) * 100;
        const toY = yStart + to.row * 75;
        const arcHeight = 75 * 1.2;
        const jumpDuration = this.player.jumpDuration;
        // At t=1, velocities:
        // vx = (toX - fromX) / jumpDuration
        // vy = (toY - fromY) / jumpDuration + arcHeight * 4 / jumpDuration
        const vx = (toX - fromX) / jumpDuration;
        const vy = (toY - fromY) / jumpDuration + arcHeight * 4 / jumpDuration;
        const x = xStart + (this.player.col - this.player.row / 2) * 100;
        const y = yStart + this.player.row * 75;
        this.player.falling = true;
        this.player.fallX = x;
        this.player.fallY = y;
        this.player.fallStart = performance.now() / 1000;
        this.player.fallDuration = 0.5;
        this.player.fallProgress = 0;
        
        // Play fall sound when player starts falling off pyramid
        if (window.audioSprite) {
          console.log('Playing fall sound (start of fall)');
          window.audioSprite.play('fall');
        }
        // Player falls behind pyramid if off top, left, or right
        this.player.fallBehind = (
          this.player.row < 0 ||
          this.player.col < 0 ||
          this.player.col > this.player.row
        );
        // Set fallInFront flag for Z-order
        // If falling SW or SE from bottom row, draw in front
        const fromRow = this.player.jumpFrom.row;
        const fromCol = this.player.jumpFrom.col;
        const toRow = this.player.jumpTo.row;
        const toCol = this.player.jumpTo.col;
        // SW: (toRow == fromRow + 1 && toCol == fromCol)
        // SE: (toRow == fromRow + 1 && toCol == fromCol + 1)
        if (
          fromRow === PYRAMID_ROWS - 1 &&
          (
            (toRow === fromRow + 1 && toCol === fromCol) ||
            (toRow === fromRow + 1 && toCol === fromCol + 1)
          )
        ) {
          this.player.fallInFront = true;
        } else {
          this.player.fallInFront = false;
        }
        // Set initial fall velocities to match end of jump
        this.player.fallVelocity = vy;
        this.player.fallVelocityX = vx;
        this.player.fallCurrentY = y;
        this.player.fallCurrentX = x;
      }
      this.player.jumping = false;
      this.player.jumpFrom = null;
      this.player.jumpTo = null;
      this.player.jumpProgress = 0;
      this.player.fallAfterJump = false;
    }
  }

  updateEnemyAnimations(deltaTime) {
    // Update enemy animations only, without any spawning/respawning logic
    const GRAVITY = 1800; // px/s^2
    const now = performance.now() / 1000;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Handle enemy destruction animation
      if (enemy.destroying) {
        const elapsed = now - enemy.destructionStart;
        enemy.destructionProgress = Math.min(elapsed / enemy.destructionDuration, 1);

        if (enemy.destructionProgress >= 1) {
          // Destruction animation complete - remove enemy but don't respawn during overlays
          // Award avoidance points if enemy was destroyed by falling off, not by collision
          if (!enemy.collidedWithPlayer) {
            this.enemiesAvoided++;
            this.addScore(50, 'Enemy Avoided');
          }

          // Clean up any collision-related properties before removal
          enemy.collisionCenter = null;
          enemy.destructionStartPos = null;
          this.enemies.splice(i, 1);
          continue;
        }
      }

      // Handle enemy drop-in animation - pause during overlays
      if (enemy.dropIn) {
        // Don't progress drop-in animation during overlays - just maintain current state
        // The animation will resume when returning to PLAYING state
        continue;
      }

      // Handle enemy jumping
      if (enemy.jumping) {
        const elapsed = now - enemy.jumpStart;
        const t = Math.min(elapsed / enemy.jumpDuration, 1);
        enemy.jumpProgress = t;
        if (t >= 1) {
          // Finish jump
          enemy.row = enemy.jumpTo.row;
          enemy.col = enemy.jumpTo.col;
          enemy.jumping = false;
          enemy.jumpFrom = null;
          enemy.jumpTo = null;
          enemy.jumpProgress = 0;

          // Don't handle landing logic during overlays
          enemy.nextMoveTime = now + 0.8;
        }
        continue;
      }

      // Handle enemy falling
      if (enemy.falling) {
        if (typeof enemy.fallCurrentY !== 'number') {
          enemy.fallCurrentY = enemy.fallY;
          enemy.fallCurrentX = enemy.fallX;
          enemy.fallVelocity = enemy.fallVelocity || 0;
          enemy.fallVelocityX = enemy.fallVelocityX || 0;
        }
        enemy.fallVelocity += GRAVITY * deltaTime;
        enemy.fallCurrentY += enemy.fallVelocity * deltaTime;
        enemy.fallCurrentX += enemy.fallVelocityX * deltaTime;

        if (enemy.fallCurrentY > BASE_HEIGHT + 200) {
          // Enemy has fallen off screen - remove without respawning during overlays
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Don't update enemy AI/movement during overlays - just maintain their state
    }
  }

  // Update all enemies
  updateEnemies(deltaTime) {
    const GRAVITY = 1800; // px/s^2
    const now = performance.now() / 1000;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Handle enemy destruction animation
      if (enemy.destroying) {
        const elapsed = now - enemy.destructionStart;
        enemy.destructionProgress = Math.min(elapsed / enemy.destructionDuration, 1);

        if (enemy.destructionProgress >= 1) {
          // Destruction animation complete, respawn enemy
          this.enemies[i] = this.createEnemy();
        }
        continue; // Skip other updates while destroying
      }

      // Handle enemy drop-in animation
      if (enemy.dropIn) {
        const elapsed = now - enemy.dropStart;
        let t = Math.min(elapsed / enemy.dropDuration, 1);
        enemy.dropProgress = t;
        if (t >= 1) {
          enemy.dropIn = false;
          enemy.dropY = null;
          // Land on cube and change its color
          this.enemyLandOnCube(enemy.row, enemy.col);
          // Start movement after a brief delay
          enemy.nextMoveTime = now + 0.5; // 0.5 second delay before first move
        }
      }
      // Handle enemy jumping
      else if (enemy.jumping) {
        const elapsed = now - enemy.jumpStart;
        const t = Math.min(elapsed / enemy.jumpDuration, 1);
        enemy.jumpProgress = t;
        if (t >= 1) {
          // Finish jump
          enemy.row = enemy.jumpTo.row;
          enemy.col = enemy.jumpTo.col;
          // Check if landed on pyramid
          const landedRow = enemy.row;
          const landedCol = enemy.col;
          const onPyramid = landedRow >= 0 && landedRow < this.pyramid.length && landedCol >= 0 && landedCol <= landedRow;

          if (onPyramid) {
            // Enemy lands on cube - reverse color change
            this.enemyLandOnCube(landedRow, landedCol);
            // Schedule next move
            enemy.nextMoveTime = now + 0.8; // 0.8 second delay between moves
          } else {
            // Enemy falls off pyramid - same logic as player falling
            this.startEnemyFalling(enemy);
          }

          enemy.jumping = false;
          enemy.jumpFrom = null;
          enemy.jumpTo = null;
          enemy.jumpProgress = 0;
        }
      }
      // Handle enemy falling
      else if (enemy.falling) {
        if (typeof enemy.fallCurrentY !== 'number') {
          enemy.fallCurrentY = enemy.fallY;
          enemy.fallCurrentX = enemy.fallX;
        }
        enemy.fallVelocity += GRAVITY * deltaTime;
        enemy.fallCurrentY += enemy.fallVelocity * deltaTime;
        enemy.fallCurrentX += enemy.fallVelocityX * deltaTime;

        if (enemy.fallCurrentY > BASE_HEIGHT + 50) {
          // Enemy fell off screen, respawn it
          this.enemies[i] = this.createEnemy();
        }
      }
      // Handle enemy movement (when not dropping, jumping, or falling)
      else if (!enemy.dropIn && !enemy.jumping && !enemy.falling && now >= (enemy.nextMoveTime || 0)) {
        this.moveEnemy(enemy);
      }
    }
  }

  // Start enemy falling with same logic as player
  startEnemyFalling(enemy) {
    const xStart = BASE_WIDTH / 2;
    const yStart = (BASE_HEIGHT - (this.pyramid.length * 75)) / 2 + 75 / 2;
    const from = enemy.jumpFrom;
    const to = enemy.jumpTo;
    const fromX = xStart + (from.col - from.row / 2) * 100;
    const fromY = yStart + from.row * 75;
    const toX = xStart + (to.col - to.row / 2) * 100;
    const toY = yStart + to.row * 75;
    const arcHeight = 75 * 1.2;
    const jumpDuration = enemy.jumpDuration;

    // Calculate velocities at end of jump
    const vx = (toX - fromX) / jumpDuration;
    const vy = (toY - fromY) / jumpDuration + arcHeight * 4 / jumpDuration;
    const x = xStart + (enemy.col - enemy.row / 2) * 100;
    const y = yStart + enemy.row * 75;

    enemy.falling = true;
    enemy.fallX = x;
    enemy.fallY = y;
    enemy.fallStart = performance.now() / 1000;

    // Same Z-order logic as player
    enemy.fallBehind = (
      enemy.row < 0 ||
      enemy.col < 0 ||
      enemy.col > enemy.row
    );

    // Set fallInFront flag for Z-order
    const fromRow = enemy.jumpFrom.row;
    const fromCol = enemy.jumpFrom.col;
    const toRow = enemy.jumpTo.row;
    const toCol = enemy.jumpTo.col;

    if (
      fromRow === PYRAMID_ROWS - 1 &&
      (
        (toRow === fromRow + 1 && toCol === fromCol) ||
        (toRow === fromRow + 1 && toCol === fromCol + 1)
      )
    ) {
      enemy.fallInFront = true;
    } else {
      enemy.fallInFront = false;
    }

    // Set initial fall velocities
    enemy.fallVelocity = vy;
    enemy.fallVelocityX = vx;
    enemy.fallCurrentY = y;
    enemy.fallCurrentX = x;
  }

  // Move enemy in its chosen direction
  moveEnemy(enemy) {
    // Type B enemies choose a new random direction each time they move
    if (enemy.type === 'B') {
      enemy.direction = this.getRandomDirection();
    }
    // Type A enemies keep their original direction

    const target = this.getDirectionTarget(enemy.row, enemy.col, enemy.direction);

    enemy.jumping = true;
    enemy.jumpFrom = { row: enemy.row, col: enemy.col };
    enemy.jumpTo = target;
    enemy.jumpStart = performance.now() / 1000;
    enemy.jumpProgress = 0;
  }

  draw() {
    this.context.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    this.context.fillStyle = '#000';
    this.context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    // Draw lives (top left)
    this.drawLives();
    // Draw score (top center)
    this.drawScore();
    // Draw level pyramid (top right)
    this.drawLevelPyramid();
    switch (this.gameState) {
      case GAME_STATE.TITLE:
        this.drawTitleScreen();
        break;
      case GAME_STATE.PLAYING:
        this.drawGamePlay();
        break;
      case GAME_STATE.LEVEL_COMPLETE:
        this.drawGamePlay();
        this.drawLevelComplete();
        break;
      case GAME_STATE.GAME_OVER:
        this.drawGamePlay(true); // pass flag to hide player
        this.drawGameOverOverlay();
        break;
    }

    // Draw color progression diagram at bottom center (only during gameplay, not on title screen)
    if (this.gameState !== GAME_STATE.TITLE) {
      this.drawColorProgressionDiagram();
    }
  }

  // Draw level complete message overlay
  drawLevelComplete() {
    const ctx = this.context;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, BASE_HEIGHT / 2 - 200, BASE_WIDTH, 320);
    ctx.globalAlpha = 1.0;
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Check if this is the final level (28)
    if (this.completedLevel === 28) {
      // Game complete celebration!
      ctx.fillStyle = '#ffd700'; // Gold for ultimate victory
      ctx.fillText('🎉 GAME COMPLETE! 🎉', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 140);
      ctx.font = '48px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('You conquered the pyramid!', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 80);
    } else {
      // Regular level complete
      ctx.fillText(`Level ${this.completedLevel} Complete!`, BASE_WIDTH / 2, BASE_HEIGHT / 2 - 140);
    }

    // Show score breakdown if available
    if (this.lastScoreBreakdown) {
      const breakdown = this.lastScoreBreakdown;
      ctx.font = '28px sans-serif';
      ctx.fillStyle = '#ffd700'; // Gold color for bonuses

      // Adjust starting position based on whether this is level 28 or regular level
      let yPos = this.completedLevel === 28 ? BASE_HEIGHT / 2 - 40 : BASE_HEIGHT / 2 - 80;
      const lineHeight = 32;

      ctx.fillText(`Level Bonus: ${breakdown.levelCompletionBonus.toLocaleString()}`, BASE_WIDTH / 2, yPos);
      yPos += lineHeight;

      if (breakdown.livesBonus > 0) {
        ctx.fillText(`Lives Bonus: ${breakdown.livesBonus.toLocaleString()}`, BASE_WIDTH / 2, yPos);
        yPos += lineHeight;
      }

      if (breakdown.timeBonus > 0) {
        ctx.fillText(`Time Bonus: ${breakdown.timeBonus.toLocaleString()}`, BASE_WIDTH / 2, yPos);
        yPos += lineHeight;
      }

      if (breakdown.movementBonus > 0) {
        ctx.fillText(`Movement Bonus: ${breakdown.movementBonus.toLocaleString()}`, BASE_WIDTH / 2, yPos);
        yPos += lineHeight;
      }

      if (breakdown.avoidanceBonus > 0) {
        ctx.fillText(`Avoidance Bonus: ${breakdown.avoidanceBonus.toLocaleString()}`, BASE_WIDTH / 2, yPos);
        yPos += lineHeight;
      }

      // Total bonus
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = '#00ff00'; // Bright green for total
      yPos += 10;
      ctx.fillText(`Total Bonus: ${breakdown.totalBonus.toLocaleString()}`, BASE_WIDTH / 2, yPos);
    }

    ctx.restore();
  }

  // Draw game over message overlay (same style as level complete, but with improved text layout)
  drawGameOverOverlay() {
    const ctx = this.context;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, BASE_HEIGHT / 2 - 120, BASE_WIDTH, 240);
    ctx.globalAlpha = 1.0;
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Center the "Game Over" text in the upper part of the overlay
    ctx.fillText('Game Over', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 40);

    // Show final score
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#ffd700'; // Gold color
    ctx.fillText(`Final Score: ${this.score.toLocaleString()}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 10);

    // Instructions
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Press Space or Tap to play again', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 60);

    ctx.restore();
  }

  drawPlayer(cx, cy) {
    const ctx = this.context;
    ctx.save();

    // Calculate destruction scale if destroying
    let destructionScale = 1.0;
    if (this.player.destroying && typeof this.player.destructionProgress === 'number') {
      destructionScale = 1.0 - this.player.destructionProgress; // Shrink from 1 to 0
    }

    // Don't draw if fully destroyed
    if (destructionScale <= 0) {
      ctx.restore();
      return;
    }

    // Orb parameters
    const orbRadius = BLOCK_SIZE * 0.32 * destructionScale; // Apply destruction scale
    const orbX = cx;
    const orbY = cy - BLOCK_HEIGHT / 4;
    // SQUASH effect: only after landing and not destroying
    let squashX = 1, squashY = 1;
    const SQUASH_AMOUNT = 0.38; // more dramatic
    const SQUASH_DURATION = 0.22; // seconds
    if (!this.player.jumping && !this.player.destroying) {
      if (!this._lastLandTime) this._lastLandTime = 0;
      const sinceLand = (performance.now() - this._lastLandTime) / 1000;
      if (sinceLand < SQUASH_DURATION) {
        let squash = 1 - sinceLand / SQUASH_DURATION;
        squashX = 1 + SQUASH_AMOUNT * squash;
        squashY = 1 - SQUASH_AMOUNT * squash;
      }
    }
    // Animate pulse (between pink and purple, more dramatic)
    const time = performance.now() / 1000;
    const pulse = (Math.sin(time * 3.5) + 1) / 2; // 0..1, faster
    // Interpolate color between pink (#ff66cc) and purple (#8e44ad)
    const r = Math.round(255 - (255 - 142) * pulse); // 255..142
    const g = Math.round(102 - (102 - 68) * pulse);  // 102..68
    const b = Math.round(204 - (204 - 173) * pulse); // 204..173
    const mainColor = `rgba(${r},${g},${b},1)`;
    // Radial gradient for 3D effect
    const grad = ctx.createRadialGradient(
      orbX - orbRadius * 0.4 * squashX, orbY - orbRadius * 0.4 * squashY, orbRadius * 0.2,
      orbX, orbY, orbRadius
    );
    grad.addColorStop(0, 'rgba(255,200,255,1)'); // highlight (light pink)
    grad.addColorStop(0.35, mainColor);
    grad.addColorStop(0.8, `rgba(${r - 40},${Math.max(0, g - 40)},${Math.max(0, b - 40)},1)`); // shadow
    grad.addColorStop(1, 'rgba(60,0,80,1)'); // edge shadow (deep purple)
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.ellipse(orbX, orbY, orbRadius * squashX, orbRadius * squashY, 0, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // Optional: subtle white highlight
    ctx.globalAlpha = 0.25;
    ctx.ellipse(orbX - orbRadius * 0.4 * squashX, orbY - orbRadius * 0.5 * squashY, orbRadius * 0.5 * squashX, orbRadius * 0.18 * squashY, -0.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  drawEnemy(cx, cy, enemy) {
    const ctx = this.context;
    ctx.save();

    // Calculate destruction scale if destroying
    let destructionScale = 1.0;
    if (enemy.destroying && typeof enemy.destructionProgress === 'number') {
      destructionScale = 1.0 - enemy.destructionProgress; // Shrink from 1 to 0
    }

    // Don't draw if fully destroyed
    if (destructionScale <= 0) {
      ctx.restore();
      return;
    }

    // Enemy orb parameters (slightly different from player)
    const orbRadius = BLOCK_SIZE * 0.28 * destructionScale; // Apply destruction scale
    const orbX = cx;
    const orbY = cy - BLOCK_HEIGHT / 4;

    // Animate pulse with different colors based on enemy type
    const time = performance.now() / 1000;
    const pulse = (Math.sin(time * 4.2) + 1) / 2; // 0..1, slightly different speed

    let r, g, b, mainColor;
    if (enemy.type === 'B') {
      // Type B: Green colors (lime to dark green)
      r = Math.round(50 + (127 - 50) * pulse);   // 50..127
      g = Math.round(205 - (205 - 255) * pulse); // 205..255  
      b = Math.round(50 + (80 - 50) * pulse);    // 50..80
    } else {
      // Type A: Red/Orange colors (original)
      r = Math.round(231 - (231 - 243) * pulse); // 231..243
      g = Math.round(76 + (156 - 76) * pulse);   // 76..156
      b = Math.round(60 - (60 - 18) * pulse);    // 60..18
    }
    mainColor = `rgba(${r},${g},${b},1)`;

    // Radial gradient for 3D effect
    const grad = ctx.createRadialGradient(
      orbX - orbRadius * 0.4, orbY - orbRadius * 0.4, orbRadius * 0.2,
      orbX, orbY, orbRadius
    );

    if (enemy.type === 'B') {
      grad.addColorStop(0, 'rgba(200,255,200,1)'); // highlight (light green)
      grad.addColorStop(0.35, mainColor);
      grad.addColorStop(0.8, `rgba(${Math.max(0, r - 30)},${Math.max(0, g - 50)},${Math.max(0, b - 30)},1)`); // shadow
      grad.addColorStop(1, 'rgba(20,80,20,1)'); // edge shadow (dark green)
    } else {
      grad.addColorStop(0, 'rgba(255,180,120,1)'); // highlight (light orange)
      grad.addColorStop(0.35, mainColor);
      grad.addColorStop(0.8, `rgba(${Math.max(0, r - 50)},${Math.max(0, g - 50)},${Math.max(0, b - 20)},1)`); // shadow
      grad.addColorStop(1, 'rgba(80,20,0,1)'); // edge shadow (dark red)
    }

    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.ellipse(orbX, orbY, orbRadius, orbRadius, 0, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Optional: subtle white highlight
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(orbX - orbRadius * 0.4, orbY - orbRadius * 0.5, orbRadius * 0.5, orbRadius * 0.18, -0.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  drawCube(cx, cy, w, h, topColor, leftColor, rightColor) {
    const ctx = this.context;
    const halfW = w / 2;
    const halfH = h / 2;
    ctx.save();
    // Top face
    ctx.beginPath();
    ctx.moveTo(cx, cy - halfH); // top
    ctx.lineTo(cx + halfW, cy);
    ctx.lineTo(cx, cy + halfH);
    ctx.lineTo(cx - halfW, cy);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.stroke();
    // Left face
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy);
    ctx.lineTo(cx, cy + halfH);
    ctx.lineTo(cx, cy + halfH + halfH);
    ctx.lineTo(cx - halfW, cy + halfH);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();
    ctx.stroke();
    // Right face
    ctx.beginPath();
    ctx.moveTo(cx + halfW, cy);
    ctx.lineTo(cx, cy + halfH);
    ctx.lineTo(cx, cy + halfH + halfH);
    ctx.lineTo(cx + halfW, cy + halfH);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
    ctx.restore();
  }

  // Reset game to title screen
  resetToTitle() {
    this.gameState = GAME_STATE.TITLE;
    this.spacePressed = false;
    this._tapDetected = false;
    this.lives = 4;
    this.resetScoring(); // Reset all scoring when returning to title
    // Reset player state
    this.player.row = 0;
    this.player.col = 0;
    this.player.jumping = false;
    this.player.jumpFrom = null;
    this.player.jumpTo = null;
    this.player.jumpStart = 0;
    this.player.jumpProgress = 0;
    this.player.falling = false;
    this.player.fallX = null;
    this.player.fallY = null;
    this.player.respawning = false;
    this.player.dropIn = false;
    this.player.dropY = null;
    this.player.destroying = false;
    this.player.destructionProgress = 0;
    // Clear enemies
    this.enemies = [];
    // Optionally reset pyramid
    this.pyramid = this.createPyramid();
  }

  // Draw the title screen
  drawTitleScreen() {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    // Draw title image if loaded
    if (images.qorby && images.qorby.complete) {
      const img = images.qorby;
      const imgW = 896;
      const imgH = 1024;
      ctx.drawImage(img, (BASE_WIDTH - imgW) / 2, 0, imgW, imgH);
    }
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Press Space or Tap to Start', BASE_WIDTH / 2, 400);
    ctx.font = '22px sans-serif';
    ctx.fillText('Use Arrow Keys or Swipe to Move', BASE_WIDTH / 2, 460);
    ctx.restore();
  }

  drawLives() {
    const ctx = this.context;
    ctx.save();

    // Draw lives as pulsing player orbs at half size to be less distracting
    const orbRadius = (BLOCK_SIZE * 0.32) * 0.5; // Half size of in-game player orb (16px)
    const orbSpacing = orbRadius * 2.5; // Space between orbs
    const startX = 20 + orbRadius; // Left margin + radius for proper positioning
    const startY = 20 + orbRadius; // Top margin + radius for proper positioning

    // Draw spare orbs (total lives - 1, since one is in play)
    const spareOrbs = this.lives - 1;
    for (let i = 0; i < spareOrbs; i++) {
      const orbX = startX + (i * orbSpacing);
      const orbY = startY;

      // Same pulsing animation as main player orb, but with phase offset for wave effect
      const time = performance.now() / 1000;
      const phaseOffset = i * 0.3; // Each orb is 0.3 seconds behind the previous one
      const pulse = (Math.sin((time + phaseOffset) * 3.5) + 1) / 2; // 0..1, same speed as player

      // Same color interpolation between pink (#ff66cc) and purple (#8e44ad)
      const r = Math.round(255 - (255 - 142) * pulse); // 255..142
      const g = Math.round(102 - (102 - 68) * pulse);  // 102..68
      const b = Math.round(204 - (204 - 173) * pulse); // 204..173
      const mainColor = `rgba(${r},${g},${b},1)`;

      // Same radial gradient for 3D effect
      const grad = ctx.createRadialGradient(
        orbX - orbRadius * 0.4, orbY - orbRadius * 0.4, orbRadius * 0.2,
        orbX, orbY, orbRadius
      );
      grad.addColorStop(0, 'rgba(255,200,255,1)'); // highlight (light pink)
      grad.addColorStop(0.35, mainColor);
      grad.addColorStop(0.8, `rgba(${r - 40},${Math.max(0, g - 40)},${Math.max(0, b - 40)},1)`); // shadow
      grad.addColorStop(1, 'rgba(60,0,80,1)'); // edge shadow (deep purple)

      // Draw main orb
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.ellipse(orbX, orbY, orbRadius, orbRadius, 0, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw subtle white highlight
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(orbX - orbRadius * 0.4, orbY - orbRadius * 0.5, orbRadius * 0.5, orbRadius * 0.18, -0.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  drawScore() {
    const ctx = this.context;
    ctx.save();
    ctx.font = '48px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${this.score.toLocaleString()}`, BASE_WIDTH / 2, 12);
    ctx.restore();
  }

  resetScoring() {
    this.score = 0;
    this.levelStartTime = performance.now() / 1000;
    this.streakMultiplier = 1;
    this.consecutivePerfectMoves = 0;
    this.enemiesAvoided = 0;
    this.movesThisLevel = 0;
    this.lastScoreBreakdown = null;
  }

  resetLevelScoring() {
    this.levelStartTime = performance.now() / 1000;
    this.streakMultiplier = 1;
    this.consecutivePerfectMoves = 0;
    this.enemiesAvoided = 0;
    this.movesThisLevel = 0;
  }

  addScore(points, reason = '') {
    const earnedPoints = Math.floor(points * this.streakMultiplier);
    this.score += earnedPoints;
    // Optional: console.log for debugging
    // console.log(`+${earnedPoints} points (${reason}) - Streak: ${this.streakMultiplier}x`);
  }

  updateStreakMultiplier(perfect = true) {
    if (perfect) {
      this.consecutivePerfectMoves++;
      this.streakMultiplier = Math.min(5, 1 + Math.floor(this.consecutivePerfectMoves / 3) * 0.5);
    } else {
      this.consecutivePerfectMoves = 0;
      this.streakMultiplier = 1;
    }
  }

  calculateLevelBonus() {
    const currentTime = performance.now() / 1000;
    const levelDuration = currentTime - this.levelStartTime;
    const targetTime = 30 + (this.level * 5); // Base 30s + 5s per level

    const levelCompletionBonus = 1000 * this.level;
    const livesBonus = (this.lives - 1) * 500; // Don't count current life
    const timeBonus = Math.max(0, Math.floor((targetTime - levelDuration) * 10));
    const movementBonus = this.movesThisLevel * 25;
    const avoidanceBonus = this.enemiesAvoided * 50;

    return {
      levelCompletionBonus,
      livesBonus,
      timeBonus,
      movementBonus,
      avoidanceBonus,
      totalBonus: levelCompletionBonus + livesBonus + timeBonus + movementBonus + avoidanceBonus
    };
  }

  applyLevelBonus() {
    const breakdown = this.calculateLevelBonus();
    this.score += breakdown.totalBonus;
    this.lastScoreBreakdown = breakdown;
    return breakdown;
  }

  drawLevelPyramid() {
    const ctx = this.context;
    ctx.save();

    // Pyramid of pyramids - 28 levels total in pyramid formation
    // Row structure: 7, 6, 5, 4, 3, 2, 1 (bottom to top)
    const pyramidSize = 20; // Base width of triangle
    const triangleHeight = Math.round(pyramidSize * 0.866); // Height for equilateral triangle (√3/2)
    const horizontalSpacing = pyramidSize + 1; // Small gap to prevent horizontal overlap
    const verticalSpacing = triangleHeight; // Exact triangle height so apexes touch bases
    const startX = BASE_WIDTH - 150; // Adjusted for new size
    const startY = 20; // Top margin

    // Define the pyramid structure (level numbers for each position)
    const pyramidStructure = [
      [28],                    // Row 1 (top)
      [26, 27],               // Row 2
      [23, 24, 25],          // Row 3
      [19, 20, 21, 22],      // Row 4
      [14, 15, 16, 17, 18],  // Row 5
      [8, 9, 10, 11, 12, 13], // Row 6
      [1, 2, 3, 4, 5, 6, 7]   // Row 7 (bottom)
    ];

    const time = performance.now() / 1000;

    pyramidStructure.forEach((row, rowIndex) => {
      row.forEach((levelNum, colIndex) => {
        // Calculate position for this mini pyramid with proper pyramid formation
        // Each row should be offset to create the pyramid shape
        const rowWidth = row.length * horizontalSpacing;
        const rowStartX = startX - (rowWidth / 2); // Center the row
        const xOffset = rowStartX + (colIndex * horizontalSpacing);
        // Offset each row by half a pyramid width to create proper pyramid formation
        // But we need to center the entire pyramid structure, so we offset from the center
        const maxRowWidth = pyramidStructure[pyramidStructure.length - 1].length * horizontalSpacing; // Bottom row width
        const currentRowCenterOffset = (maxRowWidth - rowWidth) / 2; // How much to center this row
        const finalXOffset = startX - (maxRowWidth / 2) + currentRowCenterOffset + (colIndex * horizontalSpacing);
        const yOffset = startY + (rowIndex * verticalSpacing);

        // Determine the state and color of this pyramid
        let color, alpha;
        if (levelNum < this.level) {
          // Completed level - pulsing red (goal color)
          const phaseOffset = (rowIndex + colIndex) * 0.2; // Wave effect
          const pulse = (Math.sin((time + phaseOffset) * 3.5) + 1) / 2;
          const intensity = Math.round(200 + (pulse * 55)); // 200-255 for red intensity
          color = `rgb(${intensity},0,0)`; // Pure red with pulsing intensity
          alpha = 0.9;
        } else if (levelNum === this.level) {
          // Current level - bright yellow pulse (starting color)
          const pulse = (Math.sin(time * 4) + 1) / 2;
          const intensity = 200 + (pulse * 55); // 200-255
          color = `rgb(${intensity},${intensity},0)`;
          alpha = 1.0;
        } else {
          // Future level - brighter outline for mobile visibility
          color = 'rgb(140,140,140)'; // Brighter gray
          alpha = 0.7; // Higher opacity
        }

        // Draw mini pyramid
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff'; // White outline for all triangles
        ctx.lineWidth = 1;

        // Draw equilateral triangle for pyramid
        ctx.beginPath();
        ctx.moveTo(finalXOffset, yOffset + triangleHeight); // Bottom left
        ctx.lineTo(finalXOffset + pyramidSize, yOffset + triangleHeight); // Bottom right
        ctx.lineTo(finalXOffset + (pyramidSize / 2), yOffset); // Top center (equilateral apex)
        ctx.closePath();

        if (levelNum <= this.level) {
          ctx.fill(); // Fill completed and current levels
        } else {
          ctx.stroke(); // Just outline for future levels
        }
      });
    });

    // Add current level label underneath the entire pyramid
    ctx.globalAlpha = 1.0; // Full opacity for text
    ctx.fillStyle = '#fff'; // White text
    ctx.font = '30px sans-serif'; // 50% larger font size (20 * 1.5 = 30)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Position below the bottom row of pyramids, centered on the pyramid structure
    const bottomRowY = startY + (6 * verticalSpacing) + pyramidSize; // Bottom of last row
    // Center the text on the pyramid structure
    const pyramidCenterX = startX;
    ctx.fillText(`LEVEL ${this.level}`, pyramidCenterX, bottomRowY + 8);

    ctx.restore();
  }
}