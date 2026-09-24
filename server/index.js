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

const app = express();

// ---------- Middleware ----------
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- Database (MongoDB) ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ---------- HTTP / HTTPS Server ----------
let server;
const useHttps = process.env.USE_HTTPS === "true";

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

// ---------- Socket.IO ----------
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socketHandler(socket);
});

// ---------- Routes ----------
app.use("/api/student", student_router);
app.use("/api/teacher", teacher_router);

// ---------- Serve frontend (production build) ----------
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ---------- Startup ----------
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Local IPs:`, localIpAddress);

  // ---------- AI Service Health Check (non-blocking) ----------
  const aiUrl = process.env.AI_SERVICE_URL || "https://127.0.0.1:5000";
  fetch(aiUrl, { method: "HEAD" })
    .then(() => console.log(`✅ AI service reachable at ${aiUrl}`))
    .catch(() =>
      console.warn(
        `⚠️  AI service NOT running at ${aiUrl} — face observation will be skipped`
      )
    );
});

// ---------- Global error handling ----------
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

module.exports = { io };