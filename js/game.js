import {
  LETTERS,
  BOX_WIDTH,
  BUTTON_COUNT,
  WRONG_PX,
  CORRECT_PX,
  COMPLETE_PX,
  getSpeedFactor,
  updatePixelConstants,
} from "./constants.js";
import { shuffleArray } from "./utils.js";
import { FlashMessage, ButtonGrid, StatusMessage } from "./ui.js";
import { Canvas } from "./canvas.js";

export class Game {
  constructor() {
    this.canvas = new Canvas();
    this.flashMessage = new FlashMessage();
    this.buttonGrid = new ButtonGrid();
    this.statusMessage = new StatusMessage();

    this.buttons = [];
    this.targetSequence = [];
    this.userSequence = [];
    this.gameOver = false;
    this.underTimer = 0;
    this.gameStartTime = null;
    this.gamePaused = true;

    // Performance optimization
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;

    // Reduce FPS when not focused
    document.addEventListener("visibilitychange", () => {
      this.targetFPS = document.hidden ? 30 : 60;
      this.frameInterval = 1000 / this.targetFPS;
    });

    this.t = 0;
    this.baseY = this.canvas.height;
    this.destY = this.baseY;
    this.elapsedTime = 0;

    // Calculate initial rise speed
    this.updateRiseSpeed();

    console.log("Initial rise speed:", this.riseSpeed);

    // House position
    this.boxX = this.canvas.width / 2 - BOX_WIDTH / 2;
    this.boxY = (2 * this.canvas.height) / 7 - BOX_WIDTH / 2;
    this.floorX = this.boxX + BOX_WIDTH / 2;
    this.floorY = this.boxY + BOX_WIDTH / 2;

    this.handleClick = this.handleClick.bind(this);
  }

  start() {
    this.newGame();
    this.newRound();
    this.draw();
  }

  newGame() {
    this.gameOver = false;
    this.underTimer = 0;
    this.gameStartTime = Date.now();
    this.elapsedTime = 0;
    this.gamePaused = false;
    this.baseY = (6 * this.canvas.height) / 7;
    this.destY = this.baseY;
  }

  newRound() {
    const lettersArray = shuffleArray(LETTERS.split("")).slice(0, BUTTON_COUNT);
    this.buttons = lettersArray.map((letter, index) => ({
      id: `btn-${index}`,
      letter,
      correct: false,
    }));
    this.targetSequence = shuffleArray([...lettersArray]);
    this.userSequence = [];
    this.gamePaused = false;

    this.buttonGrid.createButtons(this.buttons, this.handleClick);
    this.buttonGrid.show(true);
  }

  handleClick(button) {
    if (this.gameOver || button.correct || this.gamePaused) return;

    const nextLetter = this.targetSequence[this.userSequence.length];
    const btnElem = document.getElementById(button.id);

    if (button.letter === nextLetter) {
      this.userSequence.push(button.letter);
      this.destY += CORRECT_PX;
      button.correct = true;
      btnElem.classList.add("correct");

      if (this.userSequence.length === this.targetSequence.length) {
        this.flashMessage.show(`Round ` + BUTTON_COUNT + ` Complete!`);
        this.destY += COMPLETE_PX;
        this.buttonGrid.show(false);
        setTimeout(() => this.nextRound(), 1000);
      }
    } else {
      this.destY -= WRONG_PX;
      if (this.destY < 0) this.destY = 0;
      this.userSequence = [];
      btnElem.classList.add("wrong");
      setTimeout(() => btnElem.classList.remove("wrong"), 500);

      this.buttons.forEach((b) => {
        if (b.correct) {
          document.getElementById(b.id).classList.remove("correct");
          b.correct = false;
        }
      });
    }
  }

  updateRiseSpeed() {
    const speedFactor = getSpeedFactor(BUTTON_COUNT);
    this.riseSpeed =
      Math.round((100 * this.canvas.height) / 10000) / speedFactor;
  }

  nextRound() {
    if (this.gameOver) return;
    if (BUTTON_COUNT < 9) {
      updatePixelConstants(BUTTON_COUNT + 1);
      this.updateRiseSpeed(); // Update speed for new level
      this.newRound();
    } else if (BUTTON_COUNT == 9) {
      this.flashMessage.show("You Win!", true);
      this.gameOver = true; // You win!
    } else {
      this.gameOver = true; // shouldn't get here
    }
  }

  draw(currentTime) {
    requestAnimationFrame((time) => this.draw(time));

    // Frame rate control
    if (currentTime - this.lastFrameTime < this.frameInterval) return;
    this.lastFrameTime = currentTime;

    this.canvas.clear();

    if (!this.gameOver && !this.gamePaused) {
      this.destY -= this.riseSpeed;
      if (this.destY < 0) this.destY = 0;
    }

    this.baseY += (this.destY - this.baseY) * 0.05;

    // Draw first wave layer
    this.canvas.drawWave(this.baseY, this.t, 1);

    // Draw terrain and house
    this.canvas.drawTerrain(this.floorX, this.floorY, BOX_WIDTH);
    this.canvas.drawHouse(this.boxX, this.boxY, BOX_WIDTH);

    // Draw second wave layer
    this.canvas.drawWave(this.baseY, this.t, 1.3);

    // Check game state
    if (this.boxY > this.baseY) {
      if (!this.gamePaused) {
        this.underTimer += 1 / this.targetFPS; // Adjust for frame rate
        if (this.underTimer >= 5 && !this.gameOver) {
          this.gameOver = true; // YOU LOSE
          this.flashMessage.show("Game Over!", true);
          this.buttonGrid.show(false);
        }
      }
    } else {
      this.underTimer = 0;
    }

    if (!this.gameOver && !this.gamePaused && this.gameStartTime) {
      this.elapsedTime = ((Date.now() - this.gameStartTime) / 1000).toFixed(1);
    }

    // Adjust wave animation speed based on frame rate
    this.t += 1.5 * (60 / this.targetFPS);
  }
}
