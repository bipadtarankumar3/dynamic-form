const { Worker } = require("worker_threads");
const path = require("path");

class JobQueue {
  constructor(workerFile, idleTimeout = 5 * 60 * 1000) {
    this.workerFile = path.resolve(__dirname, workerFile);
    this.queue = [];
    this.worker = null;
    this.isProcessing = false;
    this.idleTimeout = idleTimeout;
    this.idleTimer = null;
  }

  initWorker() {
    if (this.worker) return;

    this.worker = new Worker(this.workerFile);

    this.worker.on("message", (result) => {

      this.isProcessing = false;
      this.processNext();
    });

    this.worker.on("error", (err) => {
      this.isProcessing = false;
      this.processNext();
    });

    this.worker.on("exit", (code) => {
      this.worker = null;
    });
  }

  addJob(job) {
    this.queue.push(job);
    this.resetIdleTimer();
    this.processNext();
  }

  processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.initWorker();
    const job = this.queue.shift();
    this.worker.postMessage(job);
  }

  resetIdleTimer() {
    // clear previous timer
    if (this.idleTimer) clearTimeout(this.idleTimer);

    // start a new idle timer
    this.idleTimer = setTimeout(() => {
      if (!this.isProcessing && this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }, this.idleTimeout);
  }
}

module.exports = JobQueue;
