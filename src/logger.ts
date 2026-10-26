import pino from "pino";

const logger = pino({
  // Keep test output clean
  level: process.env.VITEST ? "silent" : "info",
  transport: {
    target: "pino-pretty",
  },
});

export default logger;
