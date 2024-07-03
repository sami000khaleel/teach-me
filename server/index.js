const express = require("express");
const path = require('path');
const https = require("https");
const {localIpAddress}=require('./utilities')
console.log(localIpAddress)
const fs = require("fs");
const app = express();
const Course = require("./models/course");
const multer = require("multer");
const serverOptions = {
  ca: fs.readFileSync("ca.crt"),
  key: fs.readFileSync("cert.key"),
  cert: fs.readFileSync("cert.crt")
};

const server = https.createServer( serverOptions,app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const student_router = require("./routes/student_router");
const teacher_router = require("./routes/teacher_router");
const executeQuery = require("./config/db");
const get_id = require("./models/get_id");
const cors = require("cors");
const bodyparser = require("body-parser");
const { Socket } = require("socket.io");

const mongoose = require("mongoose");
app.use(bodyparser.json());
const Call = require("./models/call");
app.use(cors());
app.use(bodyparser.urlencoded({ extended: true }));
mongoose
  .connect("mongodb://127.0.0.1:27017/teachMe")
  .then(() => console.log("connected to database"));
  const socketHandler=require('./socketHandler')
io.on("connection",  (socket) => {
  socketHandler(socket)
});
server.listen(3000, () => {
  console.log("server is runing");
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Perform some error handling or logging here
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Perform some error handling or logging here
});
app.use("/api/student", student_router);
app.use("/api/teacher", teacher_router);
app.use(express.static(path.join(__dirname, './dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
module.exports={io}
