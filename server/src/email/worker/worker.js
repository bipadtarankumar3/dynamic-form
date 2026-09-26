const { parentPort } = require("worker_threads");
const emailSender = require("../emailSender");

parentPort.on("message", async (job) => {
  try {
    const { type, payload } = job;

    if (type === "SEND_EMAIL") {
      const info = await emailSender.sendMail(payload);
      parentPort.postMessage({ success: true, info });
    } else {
      parentPort.postMessage({ success: false, error: "Unknown job type" });
    }
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
