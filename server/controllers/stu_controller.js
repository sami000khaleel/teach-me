require("dotenv").config();

const crypto = require("crypto");
const studentmodels = require("../models/student");
const teachermodels = require("../models/teacher");
const get_id = require("../models/get_id");
const executeQuery = require("../config/db");
const Call = require("../models/call");
const course_model = require("../models/course");
const multer = require("multer");
const nodemailer = require("nodemailer");
const r2 = require("../config/r2");
const { authenticate, hashPassword, validatePassword, storeHash } = require("../models/credentials");
const { authResponse } = require("../middleware/auth");

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
  // POST /api/student/login   { email, password }  →  { id, firstname, ..., role, token }
  static async login(req, res) {
    try {
      const { email, password } = req.body || {};
      const row = await authenticate("student", email, password);
      if (!row)
        return res
          .status(401)
          .json({ message: "one or both of the fields are wrong" });
      return res.json(authResponse("student", row));
    } catch (err) {
      console.error("❌ student login error:", err.message);
      return res.status(500).json({ message: "internal server error" });
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

  // GET /api/student/get_student_image?id_student=5
  // Reads the picture from R2 with the server's own keys and streams it to the browser,
  // so it works whatever address is stored in the DB (private S3 address, public address, or key).
  static async getStudentImage(req, res) {
    try {
      const id = req.query.id_student;
      if (!/^\d+$/.test(String(id)))
        return res.status(400).json({ message: "invalid student id" });

      const rows = await executeQuery(
        "select image_url from student where id_stu=?",
        [id]
      );
      if (!rows.length || !rows[0].image_url)
        return res.status(404).json({ message: "this student has no image" });

      const { body, contentType } = await r2.getObject(
        r2.keyFromStoredUrl(rows[0].image_url)
      );
      res.set("Content-Type", contentType || "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400");
      body.on("error", () => res.destroy());
      return body.pipe(res);
    } catch (error) {
      if (error.name === "NoSuchKey")
        return res.status(404).json({ message: "image file not found in the bucket" });
      console.log(error.message);
      return res.status(500).json({ message: "internal server error" });
    }
  }

  static async verifyCode(req, res) {
    try {
      const code = String(req.query.code || "").trim();
      if (!/^\d{6}$/.test(code))
        return res.status(400).json({ message: "code is not correct" });

      const codeObject = await get_id.findCode(code);
      if (!codeObject)
        return res
          .status(400)
          .json({ message: "code is not correct or has expired" });

      const found = await get_id.findUserByCode(codeObject.idcode);
      await get_id.consumeCode(codeObject.idcode); // single use
      if (!found)
        return res.status(400).json({ message: "code is not correct" });

      return res.json(authResponse(found.role, found.row));
    } catch (error) {
      console.error("❌ verifyCode error:", error.message);
      return res.status(500).json({ message: "intenral server error" });
    }
  }

  static async sendCode(req, res) {
    try {
      const role = req.query.role;
      const email = req.query.email;

      if (!email || !["student", "teacher"].includes(role)) {
        return res
          .status(400)
          .json({ message: "email and role are required" });
      }

      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error("❌ GMAIL credentials missing in .env");
        return res
          .status(500)
          .json({ message: "email service is not configured" });
      }

      const id = await get_id.verifyEmail(email, role);
      // 6 digits from a cryptographically secure source
      const code = String(crypto.randomInt(100000, 1000000));

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
        text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes and can be used once.`,
      };

      await transporter.sendMail(emailOptions);
      await get_id.saveCode(code, id, role);

      return res.json({ message: "email was sent" });
    } catch (err) {
      console.error("❌ sendCode error:", err.message);
      if (err.message === "no account was found with this email")
        return res.status(404).json({ message: err.message });
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

    const firstname = String(req.body.firstname || "").trim();
    const lastname = String(req.body.lastname || "").trim();
    const email = String(req.body.email || "").trim();
    if (!firstname || !lastname || !email)
      return res
        .status(400)
        .json({ message: "first name, last name and email are required" });
    if (!/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ message: "this email is not valid" });
    try {
      validatePassword(req.body.password);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      // 2. Create the student in MySQL (password is stored as a bcrypt hash)
      const student = await studentmodels.addstudent(
        firstname,
        lastname,
        email,
        await hashPassword(req.body.password)
      );

      // 3. Upload the image to R2 and save its public URL in MySQL
      let uploadedKey = null;
      try {
        const { key, url } = await r2.uploadProfileImage(student.id, req.file);
        uploadedKey = key;
        await studentmodels.addImageUrl(url, student.id);
        // 4. Respond with the new user + a login token (never the password)
        return res.json(
          authResponse("student", {
            id_stu: student.id,
            first_name_stu: firstname,
            last_name_stu: lastname,
            email_stu: email,
            image_url: url, // publicUser turns this into the /get_student_image route
          })
        );
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
      if (err.code === "ER_DUP_ENTRY")
        return res
          .status(409)
          .json({ message: "an account with this email already exists" });
      console.error("addnewstudent error:", err);
      return res
        .status(500)
        .json({ success: false, message: "internal server error" });
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
        if (!id_teacher.length) {
          course.teacher = null; // a course without a teacher must not crash the whole list
          continue;
        }
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

  // Enroll the logged-in student in a course (id comes from the token)
  static async login_course(req, res) {
    try {
      const id_course = req.body?.id_course;
      if (!id_course)
        return res.status(400).json({ message: "no course id was sent" });

      var results = await studentmodels.login_course(req.user.id, id_course);
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
      var id_course = await course_model.get_idcourse_forstudent(req.user.id);
      var results = await course_model.get_courses(id_course);
      res.send(results);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  // PATCH /api/student/reset_password   { password }   (any logged-in role)
  static async reset_password(req, res) {
    try {
      try {
        validatePassword(req.body?.password);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
      await storeHash(req.user.role, req.user.id, req.body.password);
      return res.json({ message: "password was reset" });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }
}

module.exports = studentcontroller;
