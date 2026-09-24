require("dotenv").config();

const studentmodels = require("../models/student");
const teachermodels = require("../models/teacher");
const get_id = require("../models/get_id");
const https = require("https");
const util = require("util");
const FormData = require("form-data");
const executeQuery = require("../config/db");
const { createReadStream } = require("fs");
const axios = require("axios");
const Call = require("../models/call");
const course_model = require("../models/course");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");

// =====================================================================
// 🔹 Helper: Safely call the Flask AI service.
//    Returns the response data OR null. Never throws.
// =====================================================================
async function callAiService(endpoint, formData, timeoutMs = 5000) {
  const aiBaseUrl = process.env.AI_SERVICE_URL || "https://127.0.0.1:5000";
  const url = `${aiBaseUrl}${endpoint}`;
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.post(url, formData, {
      httpsAgent,
      headers: formData.getHeaders(),
      timeout: timeoutMs,
    });
    console.log(`✅ AI service responded: ${endpoint}`);
    return response.data;
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      console.warn(
        `⚠️  AI service not running at ${aiBaseUrl} — skipping ${endpoint}`
      );
    } else if (err.code === "ECONNABORTED") {
      console.warn(
        `⚠️  AI service timed out after ${timeoutMs}ms — skipping ${endpoint}`
      );
    } else {
      console.warn(`⚠️  AI service error at ${endpoint}:`, err.message);
    }
    return null;
  }
}

class studentcontroller {
  static giveObservationTitle(message) {
    let observationTitle = null;
    switch (message) {
      case "attentive":
        observationTitle = "student is attentive";
        break;
      case "notAttentive":
        observationTitle = "student is not attentive";
        break;
      case "usingPhone":
        observationTitle = "student is using his phone";
        break;
      default:
        break;
    }
    return observationTitle;
  }

  static addObservation(call, studentId, observationTitle, date) {
    studentId = studentId.split(".")[0];
    for (let student of call.students) {
      if (student.studentId == studentId) {
        let foundOneFlag = false;
        for (let observation of student.observations) {
          if (observation?.title != observationTitle) continue;
          foundOneFlag = true;
          observation.occurrencesDates.push(date);
          break;
        }
        if (!foundOneFlag) {
          student.observations.push({
            title: observationTitle,
            occurrencesDates: [date],
          });
        }
      }
      student.checkOccurrences.push(date);
    }
    return call;
  }

  static async checkFrame(req, res) {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "./snapshots");
      },
      filename: function (req, file, cb) {
        req.filepath = path.join(
          __dirname,
          "..",
          "snapshots",
          `${Date.now()}-${file.originalname}`
        );
        cb(null, `${Date.now()}-${file.originalname}`);
      },
    });

    const upload = multer({ storage }).single("file");
    const uploadPromise = util.promisify(upload);

    try {
      await uploadPromise(req, res);

      let call = await Call.findById(req.body.callId);
      const file = req?.file;
      let date = req.body?.date;

      if (!file) {
        console.log("No file was received");
        return res.json({ success: true, observation: "attentive" });
      }

      const formData = new FormData();
      formData.append("file", createReadStream(req.filepath));

      // 🔹 Ask the AI service (optional — returns null if down)
      const aiResponse = await callAiService("/api/observation", formData);

      if (!aiResponse) {
        // AI service unavailable → treat as attentive and continue
        return res
          .status(200)
          .json({ success: true, observation: "attentive" });
      }

      const message = aiResponse.message;

      if (message === "attentive" || !message) {
        return res
          .status(200)
          .json({ success: true, observation: "attentive" });
      }

      // Extract student ID from filename
      const studentId = req.file.filename.split("-")[1];

      for (let student of call.students) {
        if (student.studentId != studentId) continue;
        student.checkOccurrences.push(date);
      }

      call = studentcontroller.addObservation(call, studentId, message, date);
      await call.save();

      return res.json({ warningFlag: true, observation: message });
    } catch (error) {
      console.error("checkFrame error:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    } finally {
      if (req.filepath) {
        fs.unlink(req.filepath).catch((err) =>
          console.error("Failed to delete temp file:", err)
        );
      }
    }
  }

  static async getStudentsByCourse(req, res) {
    try {
      const { courseId } = req.query;
      if (!courseId)
        return res.status(400).json({ message: "no course id was sent" });
      const result = await studentmodels.getstudents_by_course_id(courseId);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async findCall(req, res) {
    try {
      const { courseId } = req.query;
      if (!courseId)
        return res.status(400).json({ message: "no course id was sent" });
      const calls = await Call.find({ courseId, onGoing: true }).sort({
        createdAt: 1,
      });
      if (calls.length == 0)
        return res
          .status(404)
          .json({ message: "no call are onGoing at the momemnt" });
      if (calls.length > 1) console.log("more than a call is taking place");
      return res.json(calls[0]);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  }

  static async sendImage(req, res) {
    try {
      const { imageName, studentId } = req.query;
      if (!imageName || !studentId)
        return res.status(400).json({
          success: false,
          message: "no data about the image was provided",
        });
      return res.sendFile(
        path.join(__dirname, "..", "images", studentId, studentId + ".jpg")
      );
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, message: "internal server error" });
    }
  }

  static async verifyCode(req, res) {
    try {
      const { code } = req.query;
      const codeObject = await get_id.findCode(code);
      const user = await get_id.findUserByCode(codeObject.idcode);
      return res.json(user);
    } catch (error) {
      return res.status(500).json({ message: "intenral server error" });
    }
  }

  static async sendCode(req, res) {
    try {
      const role = req.query.role;
      const email = req.query.email;

      if (!email || !role) {
        return res
          .status(400)
          .json({ message: "email and role are required" });
      }

      const id = await get_id.verifyEmail(email, role);
      const code = Math.floor(1000000 * Math.random());

      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error("❌ GMAIL credentials missing in .env");
        return res
          .status(500)
          .json({ message: "email service is not configured" });
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const emailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Teach-Me — Account Verification",
        text: `Your verification code is: ${code}\n\nThis code will expire soon.`,
      };

      await transporter.sendMail(emailOptions);
      await get_id.saveCode(code, id, role);

      return res.json({ message: "email was sent" });
    } catch (err) {
      console.error("❌ sendCode error:", err.message);
      return res.status(500).json({ message: "internal server error" });
    }
  }

  static async addnewstudent(req, res) {
    try {
      const storage = multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, "./uploads");
        },
        filename: function (req, file, cb) {
          cb(null, Date.now() + file.originalname);
        },
      });
      const upload = multer({ storage }).single("file");

      await upload(req, res, async (err) => {
        try {
          if (err) {
            console.log(err.message);
            return res.status(500).json({
              message: "internal error handling the image",
              m: err.message,
            });
          }

          const { firstname, lastname, email, password } = req.body;

          // 1. Create the student in MySQL
          const student = await studentmodels.addstudent(
            firstname,
            lastname,
            email,
            password
          );

          // 2. Move the uploaded image to the student's folder
          const destinationDir = path.join("./images", String(student.id));
          await fs.mkdir(destinationDir, { recursive: true });

          const filesNames = await fs.readdir(path.join("./", "uploads"));
          for (const fileName of filesNames) {
            const finalPath = path.join(
              destinationDir,
              String(student.id) + ".jpg"
            );
            await fs.rename(
              path.join("./", "uploads", fileName),
              finalPath
            );
          }

          // 3. Save the image URL in MySQL
          const url = `/api/student/image?studentId=${student.id}&imageName=${
            req.file?.filename || student.id + ".jpg"
          }`;
          await studentmodels.addImageUrl(url, student.id);

          // 4. Register the student's face with the AI service (optional)
          const formData = new FormData();
          formData.append(
            "file",
            createReadStream(
              path.join(destinationDir, String(student.id) + ".jpg")
            )
          );

          const aiResult = await callAiService("/api/store_image", formData);
          if (aiResult) {
            console.log(`👤 Face registered for student ${student.id}`);
          }

          // 5. Always return the student — signup succeeds regardless of AI
          return res.json(student);
        } catch (err) {
          console.error("addnewstudent inner error:", err);
          return res.status(500).json({ success: false, message: err.message });
        }
      });
    } catch (err) {
      console.error("addnewstudent outer error:", err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async reinsert(req, res) {
    try {
      const { email } = req.query;
      var password = req.headers.password;
      var student = await studentmodels.reinsert(email, password);
      res.json(student);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_courses(req, res) {
    try {
      var results = await studentmodels.get_courses();
      for (let course of results) {
        const id_teacher = await executeQuery(
          "select id_teacher from relater where id_cours=?",
          [course.id_cours]
        );
        const teacher = await executeQuery(
          "select id_teacher,first_name,last_name,email from teacher where id_teacher=?",
          [id_teacher[0].id_teacher]
        );
        course.teacher = { ...teacher[0] };
      }
      res.send(results);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  static async course_info(req, res) {
    try {
      var id_course = req.query.id_course;
      var result = await studentmodels.course_info(id_course);
      res.json(result);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async login_course(req, res) {
    try {
      var email = req.headers.email;
      var password = req.headers.password;
      var id_student = req.body.id_student;
      var id_course = req.body.id_course;
      var student_id = await get_id.student(email, password);

      if (req.body.id_student != student_id.id_stu)
        return res.status(400).json({ message: "ids do not match" });

      var results = await studentmodels.login_course(id_student, id_course);
      res.send(results);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async searchcourse_bycoursename(req, res) {
    try {
      var course_name = req.query?.course_name;
      if (!course_name)
        return res
          .status(400)
          .json({ success: false, message: "no query was sent" });

      var results = await course_model.searchcourse_bycoursename(course_name);
      res.send(results);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async get_my_courses(req, res) {
    try {
      var email = req.headers.email;
      var password = req.headers.password;
      var id = req.query.id;

      var g_i = await get_id.student(email, password);
      if (req.query.id != g_i.id_stu)
        return res.status(400).json({ message: "ids do not match" });

      var id_course = await course_model.get_idcourse_forstudent(id);
      var results = await course_model.get_courses(id_course);
      res.send(results);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  static async reset_password(req, res) {
    try {
      var role = req.body.role;
      var password2 = req.body.password;
      var password = req.headers.password;
      var email = req.headers.email;
      if (role == "teacher") {
        var id_teacher = await get_id.teacher(email, password);
        await teachermodels.update_password(password2, id_teacher.id_teacher);
      } else {
        var id_student = await get_id.student(email, password);
        await studentmodels.update_password(password2, id_student.id_stu);
      }

      return res.json("rsest password is finish");
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }
}

module.exports = studentcontroller;