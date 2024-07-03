const studentmodels = require("../models/student");
const teachermodels = require("../models/teacher");
const get_id = require("../models/get_id");
const https = require("https");
const util = require("util");
const FormData = require("form-data");
const { createReadStream, readFileSync } = require("fs");
const axios = require("axios");
const Call = require("../models/call");
const course_model = require("../models/course");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");
const { teacher } = require("../models/get_id");
const { models } = require("mongoose");
const { title } = require("process");
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
      case "usingPhone":
        observationTitle = "student is using his phone";
        break;
      default:
        break;
    }
    return observationTitle;
  }

  static addObservation(call, studentId, observationTitle, date) {
    for (let student of call.students) {
      if (student.studentId == studentId) {
        let foundOneFlag = false;
        for (let observation of student.observations) {
          if (observation?.title !== observationTitle) continue;
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
      date = new Date(date);
  
      if (!file) {
        console.log("No file was received");
        return res.json({ success: true });
      }
  
      const formData = new FormData();
      formData.append("file", createReadStream(req.filepath));
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const probability = Math.random();
      let response;
  
      if (probability < 0.5) {
        response = await axios.post(
          `https://127.0.0.1:5000/api/action_student`,
          formData,
          {
            httpsAgent,
            headers: {
              ...formData.getHeaders(),
            },
          }
        );
      } else {
        response = await axios.post(
          `https://127.0.0.1:5000/api/check_student`,
          formData,
          {
            httpsAgent,
            headers: {
              ...formData.getHeaders(),
            },
          }
        );
      }
        console.log(response.data);
          let studentId  
          studentId = req.file.filename.split("-")[1]; // Extract student ID
          console.log('student id', studentId)
            for (let student of call.students) {
              if (student.studentId != studentId) 
                continue
              student.checkOccurrences.push(date);
              console.log('got it')
              
            }
        
      
  
      if (response?.data?.result) {
        return res.json({ warningFlag: false,observation:'attentive' });
      }
  
      let message = response?.data?.message;
      console.log(response.data);
      if (message == "attentive") {
        return res.status(200).json({ success: true,observation:'attentive' });
      }
  
       studentId = req.file.filename.split("-")[1];
      call = studentcontroller.addObservation(call, studentId, message, date);
      
      await call.save(); // Save the updated call object
  
      return res.json({ warningFlag: true, observation: message });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ success: false, message: error.message });
    } finally {
      if (req.filepath) {
        fs.unlink(req.filepath, (err) => {
          if (err) {
            console.error("Failed to delete temporary file:", err);
          }
        });
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
      return res.status(500).json({ message: err.message });
    }
  }
  static async findCall(req, res) {
    try {
      const { courseId } = req.query;
      if (!courseId)
        return res.status(400).json({ message: "no course id was sent" });
      const calls = await Call.find({ courseId, onGoing: true }).sort({
        createdAt: 1,
      }); // Sort by createdAt ascending
      if (calls.length == 0)
        return res
          .status(404)
          .json({ message: "no call are onGoing at the momemnt" });
      console.log(calls.length);
      if (calls.length > 1) console.log("more than a call is taking place");
      // return res.status(500).json({message:'more than a call is being on for a course that is a no no'})
      return res.json(calls[0]);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: err.message });
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
        path.join(__dirname, "..", "images", studentId, imageName)
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

  // /////////////////////////////////////////////
  static async sendCode(req, res) {
    try {
      const role = req.query.role;
      const email = req.query.email;
      const id = await get_id.verifyEmail(email, role);
      console.log(email);
      const code = Math.floor(1000000 * Math.random());
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "samihellstrong@gmail.com",
          pass: "aygk wlub dppn ftum",
        },
      });
      const emialOptions = {
        from: "samihellstrong@gmail.com",
        to: email,
        subject: "account verification",
        text: `your code is : ${code}`,
      };
      const info = await transporter.sendMail(emialOptions);
      await get_id.saveCode(code, id, role);
      res.json({ message: "email was sent" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "internal server error" });
    }
  }

  //***************************************************************** */

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
          // if (!req.file ||!req.file.buffer) {
          //   return res.status(400).json({ message: 'No image file provided' })
          // }
          const { firstname, lastname, email, password } = req.body;
          const student = await studentmodels
            .addstudent(firstname, lastname, email, password)
            .catch((err) =>
              res
                .status(500)
                .json({ success: false, message: "error with users" })
            );
          const destinationDir = path.join("./images", String(student.id)); // Create directory based on product ID
          await fs.mkdir(destinationDir, { recursive: true }); // Ensure directory exists
          const filesNames = await fs.readdir(path.join("./", "uploads"));
          for (const fileName of filesNames) {
            const finalPath = path.join(
              destinationDir,
              String(student.id) + ".jpg"
            );
            await fs.rename(path.join("./", "uploads", fileName), finalPath); // Move each file
          }

          const url = `api/student/image?studentId=${student.id}&imageName=${req.file.filename}`;
          await studentmodels.addImageUrl(url, student.id);
          const formData = new FormData();
          const httpsAgent = new https.Agent({ rejectUnauthorized: false });
          formData.append(
            "file",
            createReadStream(
              path.join(destinationDir, String(student.id) + ".jpg")
            )
          );
          const response = await axios.post(
            "https://127.0.0.1:5000/api/store_image",
            formData,
            {
              httpsAgent,
              headers: {
                ... formData.getHeaders()
              },
            }
          );
          return res.json(student);
        } catch (err) {
          console.log(err);
          return res.status(500).json({ success: false });
        }
      });
    } catch (err) {
      // console.log(err)
      return res.status(400).json({ message: err.message });
    }
  }

  //*****************************************/

  static async reinsert(req, res) {
    try {
      const { email } = req.query;
      console.log(email, "email");
      var password = req.headers.password;
      var student = await studentmodels.reinsert(email, password);
      console.log(student);
      res.json(student);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  //******************************************************** */

  static async get_courses(req, res) {
    try {
      var results = await studentmodels.get_courses();
      res.send(results);
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }

  //********************************************************* */

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
      console.log(g_i.id_stu, req.query.id, "aaaaaaa");
      if (req.query.id != g_i.id_stu)
        return res.status(400).json({ message: "ids do not match" });

      var id_course = await course_model.get_idcourse_forstudent(id);
      var results = await course_model.get_courses(id_course);
      console.log(results);
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
      console.log(email, password, password2, role);
      if (role == "teacher") {
        var id_teacher = await get_id.teacher(email, password);
        var update_password = await teachermodels.update_password(
          password2,
          id_teacher.id_teacher
        );
      } else {
        var id_student = await get_id.student(email, password);
        var update_password1 = await studentmodels.update_password(
          password2,
          id_student.id_stu
        );
      }

      return res.json("rsest password is finish");
    } catch (err) {
      console.log(err);
      return res.status(400).json({ message: err.message });
    }
  }
}
module.exports = studentcontroller;
