// ===================================================================
// TeachMe — Node.js server entry point (PRODUCTION / Render-only)
//   • REST routes under /api/student and /api/teacher
//   • Socket.IO for realtime messaging
//   • Serves built React frontend from ./dist
//   • MongoDB (Mongoose) + MySQL (via db.js)
//
// TLS: Render terminates TLS at its edge and forwards plain HTTP.
//      This file NEVER creates an HTTPS server. Do not add USE_HTTPS.
// ===================================================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const helmet = require("helmet");

const { localIpAddress } = require("./utilities");
const r2 = require("./config/r2");
const student_router = require("./routes/student_router");
const teacher_router = require("./routes/teacher_router");
const socketHandler = require("./socketHandler");
const Visit = require("./models/visit");

// -------------------------------------------------------------------
// Configuration
// -------------------------------------------------------------------

function parseOrigins(raw) {
  if (!raw || raw.trim() === "*") return "*";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const CLIENT_ORIGIN = parseOrigins(process.env.CLIENT_ORIGIN);
const ALLOW_CREDENTIALS = CLIENT_ORIGIN !== "*";

function buildMongoUri() {
  if (process.env.MONGO_CLUSTER) {
    const user = process.env.MONGO_USER || "";
    const pass = process.env.MONGO_PASSWORD || "";
    const db = process.env.MONGO_DB || "teachMe";
    const cluster = process.env.MONGO_CLUSTER;
    return user && pass
      ? `mongodb+srv://${user}:${encodeURIComponent(pass)}@${cluster}/${db}?retryWrites=true&w=majority`
      : `mongodb+srv://${cluster}/${db}?retryWrites=true&w=majority`;
  }
  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  const host = process.env.MONGO_HOST || "127.0.0.1";
  const port = process.env.MONGO_PORT || "27017";
  const db = process.env.MONGO_DB || process.env.MONGO_INITDB_DATABASE || "teachMe";
  const user = process.env.MONGO_USER || process.env.MONGO_INITDB_ROOT_USERNAME;
  const pass = process.env.MONGO_PASSWORD || process.env.MONGO_INITDB_ROOT_PASSWORD;
  return user && pass
    ? `mongodb://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=admin`
    : `mongodb://${host}:${port}/${db}`;
}

function redactUri(uri) {
  return uri
    .replace(/\/\/[^@]*@/, "//***:***@")
    .replace(/([?&](?:password|token|secret)=)[^&]+/gi, "$1***");
}

// -------------------------------------------------------------------
// Express app
// -------------------------------------------------------------------

const app = express();
app.disable("x-powered-by"); // do not advertise Express
app.set("trust proxy", 1); // Render's reverse proxy
// Helmet's default CSP only allows images from 'self' and data: — profile
// images now live on Cloudflare R2, so that origin must be allowed too.
const r2Origin = r2.publicOrigin();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:", ...(r2Origin ? [r2Origin] : [])],
      },
    },
  })
);
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: ALLOW_CREDENTIALS,
  })
);
// JSON bodies are tiny here (files go through multer), so keep the limit small
app.use(bodyParser.json({ limit: "100kb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100kb" }));

// -------------------------------------------------------------------
// MongoDB
// -------------------------------------------------------------------

const MONGO_URI = buildMongoUri();
console.log(`🔌 Connecting to MongoDB at ${redactUri(MONGO_URI)}`);

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    // Do NOT process.exit in production — let Render keep the process
    // alive and restart it cleanly if Mongo is temporarily unreachable.
  });

// -------------------------------------------------------------------
// HTTP server (always plain HTTP — Render handles TLS)
// -------------------------------------------------------------------

const server = http.createServer(app);
console.log("🔓 HTTP server enabled (TLS terminated by Render proxy)");

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
// Serve built React frontend
// -------------------------------------------------------------------

const distDir = path.join(__dirname, "dist");
// index:false → "/" is NOT served by express.static, it goes through the handler below
app.use(express.static(distDir, { index: false }));

// Visit counter: when index.html is sent to a browser that has no "visited" cookie,
// store ONE document { date } in MongoDB and set the cookie, so the same browser
// is not counted again for a year. No IP, no user agent, no name is stored.
// It does not prove a human opened the page: bots that look like browsers still count.
const BOT = /bot|crawl|spider|slurp|preview|monitor|uptime|health|curl|wget|python|node-fetch|axios/i;

function countVisit(req, res) {
  try {
    if (req.headers.cookie && req.headers.cookie.includes("visited=1")) return;
    if (BOT.test(req.headers["user-agent"] || "")) return;
    if (!(req.headers.accept || "").includes("text/html")) return;

    res.cookie("visited", "1", {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure,
    });
    Visit.create({}).catch((err) => console.error("visit not saved:", err.message));
  } catch (err) {
    console.error("visit counter error:", err.message);
  }
}

app.get(/^\/(?!api\/).*/, (req, res) => {
  countVisit(req, res);
  res.sendFile(path.join(distDir, "index.html"));
});

// -------------------------------------------------------------------
// Startup
// -------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
  if (localIpAddress) console.log("   Local IPs:", localIpAddress);
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

  setTimeout(() => {
    console.error("⚠️  Forced exit after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

module.exports = { app, server, io };
