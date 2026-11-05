require("dotenv").config();

const studentmodels = require("../models/student");
const teachermodels = require("../models/teacher");
const get_id = require("../models/get_id");
const executeQuery = require("../config/db");
const Call = require("../models/call");
const course_model = require("../models/course");
const multer = require("multer");
const nodemailer = require("nodemailer");
const r2 = require("../config/r2");

// =====================================================================
// 🔹 Profile image upload
//    memoryStorage → the file never touches Render's (ephemeral) disk,
//    it goes straight from the request into Cloudflare R2.
// =====================================================================
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => cb(null, r2.ALLOWED_MIME_TYPES.has(file.mimetype)),
}).single("file");

function parseProfileImage(req, res) {
  return new Promise((resolve, reject) => {
    profileImageUpload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

class studentcontroller {
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

  // Legacy route: old rows in the DB still hold
  //   /api/student/image?studentId=<id>&imageName=...
  // New signups store the full R2 URL, so this only redirects old rows
  // (after their images were copied to R2 as profiles/<id>.jpg).
  static async sendImage(req, res) {
    try {
      const { imageName, studentId } = req.query;
      if (!imageName || !studentId)
        return res.status(400).json({
          success: false,
          message: "no data about the image was provided",
        });
      if (!/^\d+$/.test(String(studentId)))
        return res
          .status(400)
          .json({ success: false, message: "invalid student id" });
      if (!r2.configured)
        return res
          .status(503)
          .json({ success: false, message: "image storage is not configured" });

      return res.redirect(302, r2.publicUrlFor(`profiles/${studentId}.jpg`));
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
    // 1. Read the multipart body (profile image stays in memory)
    try {
      await parseProfileImage(req, res);
    } catch (err) {
      console.log(err.message);
      if (err.code === "LIMIT_FILE_SIZE")
        return res
          .status(400)
          .json({ message: "the image is too large (max 5 MB)" });
      return res.status(500).json({
        message: "internal error handling the image",
        m: err.message,
      });
    }

    if (!req.file)
      return res.status(400).json({
        message: "a profile image is required (jpg, png, webp or gif, max 5 MB)",
      });

    try {
      const { firstname, lastname, email, password } = req.body;

      // 2. Create the student in MySQL
      const student = await studentmodels.addstudent(
        firstname,
        lastname,
        email,
        password
      );

      // 3. Upload the image to R2 and save its public URL in MySQL
      let uploadedKey = null;
      try {
        const { key, url } = await r2.uploadProfileImage(student.id, req.file);
        uploadedKey = key;
        await studentmodels.addImageUrl(url, student.id);
        // 4. Return the student (with the image url, so the UI can show it right away)
        return res.json({ ...student, imageUrl: url });
      } catch (err) {
        // Roll back so the user can sign up again with the same email
        console.error("❌ profile image upload failed:", err.message);
        if (uploadedKey) await r2.deleteObject(uploadedKey).catch(() => {});
        await executeQuery("delete from student where id_stu=?", [
          student.id,
        ]).catch((e) => console.error("rollback failed:", e.message));
        return res.status(500).json({
          success: false,
          message: "could not store the profile image, please try again",
        });
      }
    } catch (err) {
      console.error("addnewstudent error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async reinsert(req, res) {
    try {
      const email  = req.body.email;
      var password = req.body.password;
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
