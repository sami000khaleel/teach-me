const course_model = require("../models/course");
const teacher_model = require("../models/teacher");
const get_id = require("../models/get_id");
const relater_model = require("../models/relater");
const Student = require("../models/student");
const multer = require("multer");
const studentmodels = require("../models/student");
const { validatedates } = require("../models/course");
const Call = require("../models/call");
const course = require("../models/course");
const executeQuery = require("../config/db");
class teacher_controller {
  static async create_test_call(req, res) {
    try {
      const call = await Call.create(req.body);
      return res.json(call.id);
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, err: "internal server error" });
    }
  }
  static getStartAndEndOfDay = (dateString) => {
    const date = new Date(dateString);

    // Start of the day in UTC
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0); // Set the time to 00:00:00.000 UTC
  
    // End of the day in UTC
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999); // Set the time to 23:59:59.999 UTC
  
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
            "students face had not matched": [],
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
              console.log(timeJump, "calculatede time jump");
              // ensures there is a linear action
              if (timeJump < 0) throw new Error("error");
              if (timeJump > 2) {
                console.log("time jump ", timeJump, obs.title);
                // console.log(observationStart, observationEnd);
                observationStart = --observationEnd;
                timeDifference = 0;
                break;
              }
              timeDifference =
                (new Date(obs.occurrencesDates[observationEnd]) -
                  new Date(obs.occurrencesDates[observationStart])) /
                1000;
              // he must be caught in the act for 5 seconds
              if (timeDifference < 5) continue;

              // console.log(tempObservation);
              // console.log(observation);
              // if (observation.title != obs.tempObservation) continue;
              // console.log('just saying hi')

              studentReports[student.studentId].observations[
                tempObservation
              ].push({
                from: obs.occurrencesDates[observationStart],
                to: obs.occurrencesDates[observationEnd],
              });

              // occurrenceCount++;
              // console.log(observationStart, observationEnd);
              observationStart = --observationEnd;
              // console.log(obs.title);
              // console.log(timeDifference);
              timeDifference = 0;
              break;
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
      const { email, password } = req.headers;
      console.log(email, password);
      const teacher = await teacher_model.get_teacher(email, password);
      let reports = [];
      const { date, courseId } = req.query;
      if (!date || !courseId) {
        return res.status(400).send("Date and courseId are required");
      }

      const { start, end } = teacher_controller.getStartAndEndOfDay(
        date
      );
      console.log(start,end)
      const calls = await Call.find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
        courseId: courseId,
      }).sort({ createdAt: -1 });
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
      const { email, password } = req.headers;
      const teacher = await teacher_model.get_teacher(email, password);
      // const { date, courseId } = req.query;
      const { callId } = req.query;
      const call = await Call.findById(callId);
      if (!call) return res.status(404).json({ message: "no call was found" });
      // if (!date || !courseId) {
      //   return res.status(400).send("Date and courseId are required");
      // }

      // const { start, end } = getStartAndEndOfDay(new Date(date));

      // const calls = await Call.find({
      //   createdAt: {
      //     $gte: start,
      //     $lte: end,
      //   },
      //   courseId,
      // });

      // if (!calls.length) {
      //   return res
      //     .status(404)
      //     .send("No calls found for the specified date and courseId");
      // }
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
          `select first_name_stu,last_name_stu,email_stu,image_url from student where id_stu=${student.studentId}`
        );
        if (!result.length) {
          console.log("did not find student");
          throw new Error(
            `did not find the student with the id of ${student.studentId}`
          );
        }
        student.name = result[0].first_name_stu + " " + result[0].last_name_stu;
        student.email = result[0].email_stu;
        student.image_url = result[0].image_url;
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
      const ids = await relater_model.get_students(courseId);
      return res.json(ids);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message });
    }
  }
  static async createLesson(req, res) {
    try {
      const { courseId, teacherId } = req.body;
      const { email, password } = req.headers;
      const objectId = await get_id.teacher(email, password);
      if (objectId.id_teacher != teacherId)
        return res.status(400).json({ message: "ids do not match" });
      let calls = await Call.find({ teacherId, onGoing: true });
      console.log(
        `found ${calls?.length} calls ongoing shutting them down ...`
      );
      for (let call of calls) {
        call.onGoing = false;
        call.endedAt = new Date();
        await call.save();
      }
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

  static async checkTeacherGivesCourse(req, res) {
    try {
      var email = req.headers.email;
      var password = req.headers.password;
      var courseId = req.query.courseId;
      var id_teacher = await get_id.teacher(email, password);
      if (req.query.id != id_teacher.id_teacher)
        return res.status(400).json({ message: "ids do not match" });

      let teacher_id = await teacher_model.get_teacher_id(course_id);
      let teacher = await teacher_model.get_teacher_by_id(teacher_id);
      let students = await studentmodels.getstudents_by_course_id(course_id);
      course.teacher = teacher;
      course.students = students;
      console.log(course.teacher);
      return res.json({ course, teacher, students });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_course_info(req, res) {
    try {
      var email = req.headers.email;
      var password = req.headers.password;
      var id = req.query.id;
      const course_id = req.query.course_id;
      var id_teacher = await get_id.teacher(email, password);
      if (req.query.id != id_teacher.id_teacher)
        return res.status(400).json({ message: "ids do not match" });

      let course = await teacher_model.get_course(course_id);
      let teacher_id = await teacher_model.get_teacher_id(course_id);
      let teacher = await teacher_model.get_teacher_by_id(teacher_id);
      let students = await studentmodels.getstudents_by_course_id(course_id);
      course.teacher = teacher;
      course.students = students;
      console.log(course.teacher);
      return res.json({ course, teacher, students });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async insert_teacher(req, res) {
    try {
      const email = req.headers.email;
      const password = req.headers.password;
      console.log(email, password);
      const result = await teacher_model.get_teacher(email, password);
      return res.json(result);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  //************************************************************************* */
  static async add_course(req, res) {
    try {
      var email = req.headers.email;
      var password = req.headers.password;
      var course_name = req.body.course_name;
      var course_discription = req.body.course_discription;
      var first_course = req.body.first_course;
      var end_course = req.body.end_course;
      var date2 = req.body.date2;
      var date1 = req.body.date1;
      course_model.validatedates(first_course, end_course);
      var teacher = await get_id.teacher(email, password);
      var course_id = await teacher_model.add_course(
        course_name,
        course_discription,
        first_course,
        end_course,
        date1,
        date2
      );
      const relation = await relater_model.add_relation(
        course_id,
        teacher.id_teacher
      );
      console.log("hello");
      return res.json(course_id);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_courses(req, res) {
    try {
      var email = req.headers.email;
      var password = req.headers.password;

      const id_teacher = req.query.id_teacher;
      var teacher_id = await get_id.teacher(email, password);
      if (req.query.id_teacher != teacher_id.id_teacher)
        return res.status(400).json({ message: "ids do not match" });
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
      const id_teacher = req.body.id_teacher;
      const course_name = req.body.course_name;
      const course_description = req.body.course_description;
      const id_course = req.body.id_course;
      let first_course = req.body.first_course;
      let end_course = req.body.end_course
      
      const date1 = req.body.date1;
      const date2 = req.body.date2;
      var email = req.headers.email;
      var password = req.headers.password;
      console.log(req.body)
      console.log(first_course,end_course)
        var teacher_id = await get_id.teacher(email, password);
      if (req.body.id_teacher != teacher_id.id_teacher)
        return res.status(400).json({ message: "ids do not match" });
      const validatedates = await course_model.validatedates(
        first_course,
        end_course
      );
      const update_d = await course_model.update(
        course_name,
        course_description,
        first_course,
        end_course,
        date1,
        date2,
        id_course
      );
      return res.json(update_d);
    } catch (err) {
      console.log(err.message);
      return res.status(400).json({ message: err.message });
    }
  }

  static async delete_course(req, res) {
    try {
      var id = req.query.id;
      const id_course = req.query.id_course;
      var email = req.headers.email;
      var password = req.headers.password;
      var teacher_id = await get_id.teacher(email, password);
      if (req.query.id != teacher_id.id_teacher)
        return res.status(400).json({ message: "ids do not match" });
      const dlt_course = await course_model.delete_course(id_course);
      return res.json("delete succes");
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_courses_mystudent(req, res) {
    try {
      const id_stu = req.query.id_stu;
      const id_teacher = req.query.id_teacher;
      var email = req.headers.email;
      var password = req.headers.password;
      var teacher_id = await get_id.teacher(email, password);
      if (req.query.id_teacher != teacher_id.id_teacher)
        return res.status(400).json({ message: "ids do not match" });

      const id_courses = await course_model.get_courses_mystudent_id(
        id_stu,
        id_teacher
      );
      const courses_mystudent = await course_model.get_courses(id_courses);
      return res.json(courses_mystudent);
    } catch (err) {
      // console.log(err)
      return res.status(400).json({ message: err.message });
    }
  }
}
module.exports = teacher_controller;
