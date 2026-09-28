// ===================================================================
// TeachMe — Node.js server entry point
//   - Serves REST routes under /api/student and /api/teacher
//   - Hosts Socket.IO for realtime messaging
//   - Serves the built React frontend from ./dist
//   - Connects to MongoDB (sessions) and MySQL (relational via db.js)
//
// Runs both:
//   • In Docker  → env vars injected by docker-compose.yml
//   • On host    → env vars loaded from server/.env
// ===================================================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const https = require("https");
const http = require("http");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const { localIpAddress } = require("./utilities");
const student_router = require("./routes/student_router");
const teacher_router = require("./routes/teacher_router");
const socketHandler = require("./socketHandler");

// -------------------------------------------------------------------
// Configuration helpers
// -------------------------------------------------------------------

/**
 * Parse CLIENT_ORIGIN into an array so CORS can accept multiple origins.
 * "*" stays as a wildcard string (no credentials allowed in that case).
 */
function parseOrigins(raw) {
  if (!raw || raw.trim() === "*") return "*";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const CLIENT_ORIGIN = parseOrigins(process.env.CLIENT_ORIGIN);
const ALLOW_CREDENTIALS = CLIENT_ORIGIN !== "*";

/**
 * Build the MongoDB connection URI.
 *   • If MONGO_URI is provided (Docker path), use it verbatim.
 *   • Otherwise assemble from parts (host path).
 */
function buildMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  const host = process.env.MONGO_HOST || "127.0.0.1";
  const port = process.env.MONGO_PORT || "27017";
  const db =
    process.env.MONGO_DB ||
    process.env.MONGO_INITDB_DATABASE ||
    "teachMe";
  const user =
    process.env.MONGO_USER || process.env.MONGO_INITDB_ROOT_USERNAME;
  const pass =
    process.env.MONGO_PASSWORD || process.env.MONGO_INITDB_ROOT_PASSWORD;

  if (user && pass) {
    return `mongodb://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

/** Strip credentials from a URI before logging it. */
function redactUri(uri) {
  return uri.replace(/\/\/[^@]*@/, "//***:***@");
}

// -------------------------------------------------------------------
// Express app
// -------------------------------------------------------------------

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: ALLOW_CREDENTIALS,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// -------------------------------------------------------------------
// MongoDB connection
// -------------------------------------------------------------------

const MONGO_URI = buildMongoUri();
console.log(`🔌 Connecting to MongoDB at ${redactUri(MONGO_URI)}`);

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// -------------------------------------------------------------------
// HTTP / HTTPS server
// -------------------------------------------------------------------

const useHttps = process.env.USE_HTTPS === "true";
let server;

if (useHttps) {
  try {
    const serverOptions = {
      ca: fs.readFileSync(process.env.SSL_CA_PATH),
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
    server = https.createServer(serverOptions, app);
    console.log("🔒 HTTPS server enabled");
  } catch (err) {
    console.error("❌ Failed to load TLS certs:", err.message);
    console.error("   Falling back to HTTP. Check SSL_* paths in .env");
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  console.log("🔓 HTTP server enabled");
}

// -------------------------------------------------------------------
// Socket.IO
// -------------------------------------------------------------------

const io = require("socket.io")(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: ALLOW_CREDENTIALS,
  },
});

io.on("connection", (socket) => {
  socketHandler(socket);
});

// -------------------------------------------------------------------
// Routes
// -------------------------------------------------------------------

app.use("/api/student", student_router);
app.use("/api/teacher", teacher_router);

// -------------------------------------------------------------------
// Serve built React frontend (production build)
// -------------------------------------------------------------------

const distDir = path.join(__dirname, "dist");

app.use(express.static(distDir));

// SPA fallback — anything not matched by /api/* returns index.html.
// Use a regex instead of "*" to avoid swallowing /api routes on
// Express 5 (which rejects bare "*" as a path).
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// -------------------------------------------------------------------
// Startup
// -------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // bind all interfaces inside Docker

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http${useHttps ? "s" : ""}://${HOST}:${PORT}`);
  if (localIpAddress) {
    console.log("   Local IPs:", localIpAddress);
  }

  // ---------- AI Service Health Check (non-blocking) ----------
  const aiUrl = process.env.AI_SERVICE_URL;
  if (!aiUrl) {
    console.warn("⚠️  AI_SERVICE_URL not set — face observation will be skipped");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(aiUrl, { method: "HEAD", signal: controller.signal })
    .then(() => console.log(`✅ AI service reachable at ${aiUrl}`))
    .catch((err) => {
      const reason = err.name === "AbortError" ? "timed out" : err.message;
      console.warn(
        `⚠️  AI service NOT reachable at ${aiUrl} (${reason}) — face observation will be skipped`
      );
    })
    .finally(() => clearTimeout(timeout));
});

// -------------------------------------------------------------------
// Graceful shutdown
// -------------------------------------------------------------------

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  io.close();
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
    } catch (err) {
      console.error("⚠️  Error closing MongoDB:", err.message);
    }
    process.exit(0);
  });

  // Force exit if graceful shutdown hangs
  setTimeout(() => {
    console.error("⚠️  Forced exit after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// -------------------------------------------------------------------
// Global error handling
// -------------------------------------------------------------------

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

module.exports = { io };