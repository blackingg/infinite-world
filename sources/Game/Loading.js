import Game from "./Game.js";
import State from "./State/State.js";

export default class Loading {
  constructor() {
    this.game = Game.getInstance();
    this.state = State.getInstance();

    this.element = document.querySelector(".loading-screen");
    if (!this.element) return;
    this.logsElement = this.element.querySelector(".logs");

    this.mainChunksCount = 0;
    this.readyChunksCount = 0;

    // Handle existing chunks
    for (const [key, chunk] of this.state.chunks.mainChunks) {
      this.handleChunk(chunk);
    }

    // Listen for new chunks
    this.state.chunks.events.on("create", (chunk) => {
      this.handleChunk(chunk);
    });
  }

  handleChunk(chunk) {
    if (!chunk.parent) {
      this.mainChunksCount++;
      this.updateLogs();

      if (chunk.ready) {
        this.readyChunksCount++;
        this.updateLogs();
        this.checkCompleted();
      } else {
        chunk.events.once("ready", () => {
          this.readyChunksCount++;
          this.updateLogs();
          this.checkCompleted();
        });
      }
    }
  }

  checkCompleted() {
    if (this.readyChunksCount === 9) {
      this.completed();
    }
  }

  updateLogs() {
    const percentage = Math.round((this.readyChunksCount / 9) * 100);
    this.setLogs(`Generating world... ${percentage}%`);
  }

  setLogs(text) {
    this.logsElement.textContent = text;
  }

  completed() {
    this.setLogs("World ready!");

    window.setTimeout(() => {
      this.element.classList.add("fade-out");

      window.setTimeout(() => {
        this.element.remove();
      }, 1000);
    }, 500);
  }
}
