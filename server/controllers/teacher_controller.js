const course_model = require("../models/course");
const teacher_model = require("../models/teacher");
const relater_model = require("../models/relater");
const Student = require("../models/student");
const multer = require("multer");
const studentmodels = require("../models/student");
const { validatedates } = require("../models/course");
const path=require('path')
const Call = require("../models/call");
const course = require("../models/course");
const executeQuery = require("../config/db");
const fs=require('fs/promises')
const crypto = require("crypto");
const { authenticate } = require("../models/credentials");
const { authResponse } = require("../middleware/auth");

// ---------------------------------------------------------------------
// Lecture files (PDFs on local disk)
// ---------------------------------------------------------------------
const LECTURES_DIR = path.resolve(__dirname, "..", "lectures");
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");

// Builds lectures/<courseId>/<fileName> and refuses anything that could
// escape that folder (../, absolute paths, hidden files, ...).
function lecturePath(courseId, fileName) {
  if (!/^\d+$/.test(String(courseId))) throw new Error("invalid course id");
  const name = String(fileName || "");
  if (!name || name !== path.basename(name) || name.startsWith("."))
    throw new Error("invalid file name");
  const courseDir = path.join(LECTURES_DIR, String(courseId));
  const full = path.resolve(courseDir, name);
  if (!full.startsWith(courseDir + path.sep)) throw new Error("invalid file path");
  return full;
}

const lectureUpload = multer({
  // a string destination makes multer create the folder if it is missing
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }, // 25 MB
  fileFilter: (req, file, cb) => cb(null, file.mimetype === "application/pdf"),
}).single("file");

class teacher_controller {

  // POST /api/teacher/login   { email, password }  →  { id, firstname, ..., role, token }
  static async login(req, res) {
    try {
      const { email, password } = req.body || {};
      const row = await authenticate("teacher", email, password);
      if (!row)
        return res
          .status(401)
          .json({ message: "one or both of the fields are wrong" });
      return res.json(authResponse("teacher", row));
    } catch (err) {
      console.error("❌ teacher login error:", err.message);
      return res.status(500).json({ message: "internal server error" });
    }
  }

  static async delete_lecture(req,res){
    try {
      const { courseId, file_name } = req.query;
      await course_model.checkTeacherGivesCourse(courseId, req.user.id);
      const filePath = lecturePath(courseId, file_name);
      await fs.unlink(filePath).catch((err) => {
        if (err.code !== "ENOENT") throw err;
      });
      await course_model.delete_leceture(courseId, file_name)
      return res.send('done')
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: error.message })
    }
  }


  static async get_lectures(req, res) {
    try {
        console.log('hello')
      const courseId = req.query.courseId;
      
     const lectures= await course_model.get_lectures_by_course_id(courseId)
     res.json(lectures)
     
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }


  static async get_lectures_by_course(req, res) {
    try {
      const { courseId, lectureName } = req.query;
      const filePath = lecturePath(courseId, lectureName);
      res.download(filePath, lectureName, (err) => {
        if (err && !res.headersSent) {
          console.log(err.message);
          return res.status(404).json({ message: "lecture file was not found" });
        }
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async add_lecture(req,res){
    try {
      await new Promise((resolve, reject) =>
        lectureUpload(req, res, (err) => (err ? reject(err) : resolve()))
      );
    } catch (err) {
      console.log(err.message)
      if (err.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ message: "the PDF is too large (max 25 MB)" })
      return res.status(500).json({ message: 'internal error handling the file', m: err.message })
    }

    const tempPath = req.file?.path;
    try {
      if (!req.file)
        return res.status(400).json({ message: "a PDF file is required" })
      const id_course = req.body.id_course;

      // only the teacher of this course may add lectures to it
      await course_model.checkTeacherGivesCourse(id_course, req.user.id);
      const finalPath = lecturePath(id_course, req.body.fileName);
      await fs.mkdir(path.dirname(finalPath), { recursive: true });

      const { id: lectureId } = await teacher_model.add_idCourse(id_course)
      await fs.rename(tempPath, finalPath);
      await teacher_model.addlectureUrl(req.body.fileName, lectureId)

      return res.json("ok")
    } catch (err) {
      if (tempPath) await fs.unlink(tempPath).catch(() => {});
      return res.status(400).json({ message: err.message })
    }
  }

  static getStartAndEndOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0); // Set the time to 00:00:00.000

    const end = new Date(date);
    end.setHours(23, 59, 59, 999); // Set the time to 23:59:59.999

    return { start, end };
  };

  static calculateTotalLectureTime = (calls) => {
    return calls.reduce((total, call) => {
      if (call.endedAt) {
        total += new Date(call.endedAt) - new Date(call.createdAt);
      }
      return total;
    }, 0);
  };

  static formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours} hours, ${minutes} minutes`;
  };
  static processStudentLogs = (students) => {
    const studentReports = {};

    students.forEach((student) => {
      if (!studentReports[student.studentId]) {
        studentReports[student.studentId] = {
          studentId: student.studentId,
          loginCount: 0,
          totalTimeAttending: 0,
          logs: [],
          observations: {
            "student had been using his phone": [],
            "student was not attentive": [],
            "student had gotten out of the cameras range": [],
            "students face had not matched": []
          },
        };
      }

      const report = studentReports[student.studentId];

      // Count logins and total time connected
      student.studentLogs.forEach((log) => {
        if (log.connectedAt && log.disconnectedAt) {
          report.loginCount += 1;
          report.totalTimeAttending +=
            new Date(log.disconnectedAt) - new Date(log.connectedAt);
          report.logs.push(log);
        }
      });
      report.totalTimeAttending = teacher_controller.formatDuration(
        report.totalTimeAttending
      );
      if (student.observations.length == 1) return studentReports;
      // Process observations
      student.observations.forEach((obs) => {
        console.log(obs);
        if (obs.title !== "attentive") {
          let tempObservation = null;
          if (obs.title == "notAttentive")
            tempObservation = "student was not attentive";
          if (obs.title == "usingPhone")
            tempObservation = "student had been using his phone";
          if (obs.title == "noFace")
            tempObservation = "student had gotten out of the cameras range";
          if (obs.title == "facesDoNotMatch")
            tempObservation = "students face had not matched";
          console.log(tempObservation);
          let occurrenceCount = 0;
          let timeDifference = 0;
          for (
            let observationStart = 0;
            observationStart < obs.occurrencesDates.length - 1;
            observationStart++
          ) {
            for (
              let observationEnd = observationStart + 1;
              observationEnd < obs.occurrencesDates.length;
              observationEnd++
            ) {
              let timeJump =
                (new Date(obs.occurrencesDates[observationEnd]) -
                  new Date(obs.occurrencesDates[observationEnd - 1])) /
                1000;
              if (timeJump > 1) {
                timeDifference =
                (new Date(obs.occurrencesDates[observationEnd]) -
                  new Date(obs.occurrencesDates[observationStart])) /
                1000;
              if (timeDifference < 2) continue;

              studentReports[student.studentId].observations[
                tempObservation
              ].push({
                from: obs.occurrencesDates[observationStart],
                to: obs.occurrencesDates[observationEnd],
              });
                console.log("time jump ", timeJump, obs.title);
                observationStart = --observationEnd;
                timeDifference = 0;
                
                break;
              }
              
            }
          }
          // if (occurrenceCount > 1)
          //   studentReports[student.studentId].observations.push(
          //     `${tempObservation} ${occurrenceCount} times`
          //   );
          // if (occurrenceCount == 1)
          //   studentReports[student.studentId].observations.push(
          //     `${tempObservation} once`
          //   );
        }
      });
    });
    return studentReports;
  };
  static async get_days_report(req, res) {
    try {
      let reports = [];
      const { date, courseId } = req.query;
      if (!date || !courseId) {
        return res.status(400).send("Date and courseId are required");
      }
      await course_model.checkTeacherGivesCourse(courseId, req.user.id);

      const { start, end } = teacher_controller.getStartAndEndOfDay(
        new Date(date)
      );
      const calls = await Call.find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
        courseId: courseId,
      }).sort({ createdAt: -1 });
      console.log(calls);
      if (!calls.length) {
        return res
          .status(404)
          .send("No calls found for the specified date and courseId");
      }
      for (let call of calls) {
        const totalLectureTime =
          new Date(call.endedAt) - new Date(call.createdAt);
        // const studentReports = teacher_controller.processStudentLogs(
        //   call.students
        //   // calls.flatMap((call) => call.students)
        // );
        const report = {
          totalLectureTime: teacher_controller.formatDuration(totalLectureTime),
          numberOfAttendences: call.students.filter((stu) =>
            stu?.studentLogs?.length ? true : false
          ).length,
          startedAt: call.createdAt,
          endedAt: call.endedAt,
          callId: call.id,
          // students: Object.values(studentReports),
        };
        reports.push(report);
      }
      return res.json(reports);
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  static get_report = async (req, res) => {
    try {
      const { callId } = req.query;
      const call = await Call.findById(callId);
      if (!call) return res.status(404).json({ message: "no call was found" });
      if (String(call.teacherId) !== String(req.user.id))
        return res
          .status(403)
          .json({ message: "you are not the teacher of this call" });
      const totalLectureTime =
        new Date(call.endedAt) - new Date(call.createdAt);
      // const totalLectureTime = teacher_controller.calculateTotalLectureTime(calls);
      const studentReports = teacher_controller.processStudentLogs(
        call.students
        // calls.flatMap((call) => call.students)
      );

      let report = {
        totalLectureTime: teacher_controller.formatDuration(totalLectureTime),
        students: Object.values(studentReports),
      };
      for (let student of report.students) {
        const result = await executeQuery(
          "select first_name_stu,last_name_stu,email_stu,image_url from student where id_stu=?",
          [student.studentId]
        );
        if (!result.length) {
          console.log("did not find student");
          throw new Error(
            `did not find the student with the id of ${student.studentId}`
          );
        }
        student.name = result[0].first_name_stu + " " + result[0].last_name_stu;
        student.email = result[0].email_stu;
        student.image_url = result[0].image_url
          ? `/api/student/get_student_image?id_student=${student.studentId}`
          : "";
      }

      return res.json(report);
    } catch (error) {
      console.log(error);
      res.status(500).send("An error occurred while fetching the report");
    }
  };
  static async getCoursesStudents(req, res) {
    try {
      const { courseId } = req.query;
      await course_model.checkTeacherGivesCourse(courseId, req.user.id);
      const ids = await relater_model.get_students(courseId);
      return res.json(ids);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message });
    }
  }
  static async createLesson(req, res) {
  try {
    const { courseId } = req.body;
    const teacherId = req.user.id; // from the token, not from the request body

    // Shut down any ongoing calls for this teacher
    let calls = await Call.find({ teacherId, onGoing: true });
    console.log(`found ${calls?.length} calls ongoing shutting them down ...`);
    for (let call of calls) {
      call.onGoing = false;
      call.endedAt = new Date();
      await call.save();
    }

    // Verify the teacher actually teaches this course
    await course_model.checkTeacherGivesCourse(courseId, teacherId);

    const students = await studentmodels.getstudents_by_course_id(courseId);
    const ids = students.map((student) => ({ studentId: student.id_stu }));

    const call = await Call.create({
      courseId,
      teacherId,
      students: ids,
      onGoing: true,
    });
    return res.json(call);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: err.message });
  }
}

  static async get_course_info(req, res) {
    try {
      const course_id = req.query.course_id;
      // only the teacher of this course may see its students
      await course_model.checkTeacherGivesCourse(course_id, req.user.id);

      let course = await teacher_model.get_course(course_id);
      let teacher_id = await teacher_model.get_teacher_id(course_id);
      let teacher = await teacher_model.get_teacher_by_id(teacher_id);
      let students = await studentmodels.getstudents_by_course_id(course_id);
      course.teacher = teacher;
      course.students = students;
      return res.json({ course, teacher, students });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  //************************************************************************* */
  static async add_course(req, res) {
    try {
      var course_name = req.body.course_name;
      var course_discription = req.body.course_discription;
      var first_course = req.body.first_course;
      var end_course = req.body.end_course;
      var date2 = req.body.date2;
      var date1 = req.body.date1;
      course_model.validatedates(first_course, end_course);
      var course_id = await teacher_model.add_course(
        course_name,
        course_discription,
        first_course,
        end_course,
        date1,
        date2
      );
      await relater_model.add_relation(course_id, req.user.id);
      return res.json(course_id);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_courses(req, res) {
    try {
      const id_teacher = req.user.id;
      const teacher = await teacher_model.get_teacher_by_id(id_teacher);
      const id_courses = await course_model.get_courses_id(id_teacher);
      const courses = await course_model.get_courses(id_courses);

      return res.json({ courses, teacher });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async update_date(req, res) {
    try {
      const id_course = req.body.id_course;
      const first_course = req.body.first_course;
      const end_course = req.body.end_course;
      const date1 = req.body.date1;
      const date2 = req.body.date2;
      // only the teacher of this course may change it
      await course_model.checkTeacherGivesCourse(id_course, req.user.id);
      await course_model.validatedates(first_course, end_course);
      const update_d = await course_model.update(
        first_course,
        end_course,
        date1,
        date2,
        id_course
      );
      return res.json(update_d);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  static async delete_course(req, res) {
    try {
      const id_course = req.query.id_course;
      // only the teacher of this course may delete it
      await course_model.checkTeacherGivesCourse(id_course, req.user.id);
      await course_model.delete_course(id_course);
      return res.json("delete succes");
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_courses_mystudent(req, res) {
    try {
      const id_stu = req.query.id_stu;
      const id_courses = await course_model.get_courses_mystudent_id(
        id_stu,
        req.user.id
      );
      const courses_mystudent = await course_model.get_courses(id_courses);
      return res.json(courses_mystudent);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }
}
module.exports = teacher_controller;
