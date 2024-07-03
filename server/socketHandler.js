const Call = require("./models/call");
const get_id = require("./models/get_id");
const Course = require("./models/course");

let connectedSockets = [];
async function socketHandler(socket) {
  try {
    let call;
    let userId;
    let studentsIds;
    const { auth } = socket.handshake; // Accessing the query parameters
    const { role, email, password, id } = auth;

    if (!role) {
      throw new Error("A role must be sent");
    }

    if (role === "teacher") {
      const { id_teacher } = await get_id.teacher(email, password);
      console.log("connected ", role);
      if (id_teacher != id) {
        throw new Error("Error validating the teacher");
      }
      userId = id_teacher;
    } else if (role === "student") {
      const student = await get_id.student(email, password);
      userId = student.id_stu;
      let coursesIds = await Course.get_idcourse_forstudent(userId);
      console.log("connected ", role);
      socket.emit("student-connected", { message: "student connected" });
    } else {
      throw new Error("Invalid role");
    }

    connectedSockets.push({
      socketId: socket.id,
      role,
      userId,
    });
    socket.on("request-offer", async ({ callId }) => {
      call = await Call.findById(callId).catch((err) => {
        socket.emit("error", { message: "call was not found" });
      });
      if (!call) return;
      for (let connectedSocket of connectedSockets) {
        if (connectedSocket.userId == call.teacherId)
          socket
            .to(connectedSocket.socketId)
            .emit("request-offer", { studentId: userId });
        console.log("student requested offer");
      }
    });
    socket.on("ask-me-for-offer", async ({ callId }) => {
      call = await Call.findById(callId).catch((err) => console.log(err));
      if (!call?.students?.length) return;
      studentsIds = call.students.map((stu) => stu.studentId);
      for (let connectedSocket of connectedSockets) {
        for (let id of studentsIds) {
          if (id == connectedSocket.userId) {
            console.log(connectedSocket.userId);
            socket
              .to(connectedSocket.socketId)
              .emit("ask-me-for-offer", { callId });
          }
        }
      }
    });
    socket.on("request-messages", async ({ callId }) => {
      call = await Call.findById(callId);
      if (!call) return;
      const { messages } = call;
      socket.emit("recieve-messages", { messages });
    });
    socket.on("teacher-end-call", async ({ callId }) => {
      let calls = await Call.find({ teacherId: userId, onGoing: true });
      if (!calls?.length) return;
      for (let call of calls) {
        call.onGoing = false;
        call.endedAt = new Date();
        for (let student of call.students) {
          if (!student?.studentLogs?.length) continue;
          student.studentLogs[student.studentLogs.length - 1].disconnectedAt =
            call.endedAt;
        }
        await call.save();
      }
      if (!call?.students?.length) return;
      studentsIds = call?.students?.map((stu) => stu.studentId);

      for (let connectedSocket of connectedSockets)
        if (studentsIds?.includes(String(connectedSocket.userId))) {
          socket
            .to(connectedSocket.socketId)
            .emit("teacher-end-call", { callId });
        }
    });
    socket.on("message", async ({ message, callId }) => {
      if (
        !message?.content ||
        !message?.studentId ||
        !message?.studentName ||
        !message?.studentImage
      )
        return;
      console.log("got message");
      const call = await Call.findById(callId);
      if (!call) return;
      if (!call?.students?.length) return;
      call.messages.push(message);
      await call.save();
      studentsIds = call.students.map((stu) => stu.studentId);
      const teacherSocket = connectedSockets.find(
        (socket) => socket.userId == call.teacherId
      );
      socket.to(teacherSocket.socketId).emit("message", { message });
      socket.emit("message", { message, callId });

      for (let connectedSocket of connectedSockets) {
        if (studentsIds.includes(String(connectedSocket.userId))) {
          console.log("found it ", connectedSocket.socketId);
          socket.to(connectedSocket.socketId).emit("message", { message });
        }
      }
    });
    socket.on("teacher-offer", async ({ callId, offer }) => {
      call = await Call.findById(callId).catch((err) => {
        socket.emit("error", { message: "call was not found" });
        throw err;
      });

      if (call.teacherId != userId) {
        throw new Error("This teacher does not give this course");
      }

      studentsIds = call.students.map((stu) => stu.studentId);

      call.offer = offer;
      call.onGoing = true;

      await call.save().catch((err) => {
        socket.emit("error", { message: "Call could not be saved" });
        throw err;
      });
      console.log(studentsIds);
      for (let connectedSocket of connectedSockets) {
        if (studentsIds.includes(String(connectedSocket.userId))) {
          console.log(connectedSocket);
          socket
            .to(connectedSocket.socketId)
            .emit("teacher-offer", { offer, callId });
        }
      }
    });

    socket.on("teacher-candidate", async ({ teacherId, callId, candidate }) => {
      call = await Call.findById(callId).catch((err) => {
        socket.emit("error", { message: "call was not found" });
        throw err;
      });

      if (call.teacherId != userId) {
        throw new Error("Teacher is not the owner of this call");
      }

      call.teacherCandidate = candidate;

      await call.save().catch((err) => {
        socket.emit("error", { message: "Call could not be saved" });
        throw err;
      });

      for (let connectedSocket of connectedSockets) {
        if (studentsIds?.includes(String(connectedSocket.userId))) {
          socket.to(connectedSocket.socketId).emit("teacher-candidate", {
            candidate,
            callId,
            courseId: call.courseId,
          });
        }
      }
    });
    socket.on("student-answer", async ({ callId, answer }) => {
      call = await Call.findById(callId).catch((err) => {
        socket.emit("error", { message: "call was not found" });
        throw err;
      });
      for (let student of call.students) {
        if (student.studentId == userId) {
          student.answer = answer;
          await call.save();
        }
      }
      for (let connectedSocket of connectedSockets) {
        if (connectedSocket.userId == Number(call.teacherId))
          socket
            .to(connectedSocket.socketId)
            .emit("student-answer", { answer, studentId: userId });
        console.log("student answer was sent");
      }
    });
    socket.on("student-candidate", async ({ callId, candidate }) => {
      const call = await Call.findById(callId).catch((err) => {
        socket.emit("error", { message: "call was not found" });
        throw err;
      });
      for (let student of call.students) {
        if (student.studentId == userId) {
          student.candidate = candidate;
          await call.save();
        }
      }
      for (let connectedSocket of connectedSockets) {
        if (connectedSocket.userId == call.teacherId)
          socket
            .to(connectedSocket.socketId)
            .emit("student-candidate", { candidate, studentId: userId });
        console.log("student canidiate was sent");
      }
    });
    socket.on("student-ask-for-call", async ({ courseId }) => {
      if (!userId) return;
      let calls = await Call.find({ courseId, onGoing: true }).sort({
        createdAt: -1,
      });
      // console.log(calls.length, " number of ongoing calls");
      if (!calls?.length)
        return socket.emit("no-calls", { message: "no calls are being made" });
      call = calls[0];

      if (call?.offer) {
        socket.emit("teacher-offer", { offer: call.offer, callId: call._id });
        // console.log('offer sent to student',call.offer)
      }
      if (call?.teacherCandidate) {
        socket.emit("teacher-candidate", { candidate: call.teacherCandidate });
        // console.log('candidate sent to student',call.teacherCandidate)
      }
    });
    socket.on("student-request-call", async ({ callId, teacherId }) => {
      for (let connectedSocket of connectedSockets) {
        if (connectedSocket.userId == call.teacherId)
          socket
            .to(connectedSocket.socketId)
            .emit("student-request-call", { studentId: userId });
        console.log("student-request-call");
      }
    });
    socket.on("student-exit-call", async () => {
      if (call)
        for (let connectedSocket of connectedSockets) {
          if (connectedSocket.userId == call.teacherId)
            socket
              .to(connectedSocket.socketId)
              .emit("student-exit-call", { studentId: userId });
          console.log("student-exited");
        }
    });
    socket.on("disconnect", async () => {
      console.log("Disconnected");
      connectedSockets = connectedSockets.filter(
        (cs) => cs.socketId !== socket.id
      );
      if (role === "teacher" && call?._id) {
        let calls = await Call.find({
          teacherId: socket.userId,
          onGoing: true,
        });
        for (let call of calls) {
          call.onGoing = false;
          call.endedAt = new Date();
          await call.save();
        }
        if (call.onGoing) {
          call.onGoing = false;
          call.endedAt = new Date();
          for (let student of call.students) {
            if (!student?.studentLogs?.length) continue;
            student.studentLogs[student.studentLogs.length - 1].disconnectedAt =
              call.endedAt;
          }
          await call.save();
        }
        studentsIds = call.students.map((stu) => stu.studentId);

        for (let connectedSocket of connectedSockets) {
          for (let id of studentsIds) {
            if (id == connectedSocket.userId) {
              console.log(connectedSocket.userId);
              socket
                .to(connectedSocket.socketId)
                .emit("teacher-disconnected", { teacherId: call.teacherId });
            }
          }
        }
      }
      if (call?._id) {
        if (role == "student") {
          console.log("student disconnected");

          await handleStudentOut(call, socket);
          // Emit event to teacher that student has disconnected
          for (let connectedSocket of connectedSockets) {
            if (connectedSocket.userId == call.teacherId) {
              {
                socket
                  .to(connectedSocket.userId)
                  .emit("student-disconnected", { studentId: userId });
              }
            }
          }
        }
      }
    });
    socket.on("student-out", async ({ studentId, callId }) => {
      console.log('student is out')
        call = await Call.findById(callId);
      if (!call) return;
      for(let student of call.students){
        if(student.studentId==studentId){
            console.log(student.studentLogs[student.studentLogs.length-1])
            student.studentLogs[student.studentLogs.length - 1].disconnectedAt = new Date();
        }
      }
      await call.save()
    });
    socket.on("student-joined-call", async ({ studentId, callId }) => {
      call = await Call.findById(callId);
      if (!call) return;
      for (let student of call.students) {
          if (student.studentId == studentId) {
            console.log("student joined");
          student.studentLogs.push({
            connectedAt: new Date(),
            disconnectedAt: null,
          });
        }
      }
      await call.save()
    });
  } catch (err) {
    console.log(err);
    socket.emit("error", { message: err.message });
  }
}
async function handleStudentOut(call, socket) {
  for (let student of call.students) {
    if (student.studentId != socket.userId) continue;
    student.studentLogs[student.studentLogs.length - 1].disconnectedAt =
      new Date();
  }
  await call.save();
}
async function handleStudentIn(call, socket) {
  for (let student of call.students) {
    if (student.studentId != socket.userId) continue;
    student.studentLogs.push({ connectedAt: new Date(), disconnectedAt: null });
  }
  await call.save();
}
module.exports = socketHandler;