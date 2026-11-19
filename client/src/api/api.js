import axios from "axios";
import { getStoredUser } from "../auth";

// Authentication is handled once, in src/auth.js: an axios interceptor adds
// `Authorization: Bearer <token>` to every request, so nothing here sends
// an e-mail or a password header any more.
export default class api {
  static url = `/api`;

  static async resetPassword(password) {
    const response = await axios.patch(`${api.url}/student/reset_password`, {
      password,
    });
    return response;
  }
  static async signup({ firstname, lastname, email, password }, image) {
    const formData = new FormData();
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("file", image);
    const response = await axios.post(
      `${api.url}/student/addstudent`,
      formData
    );
    return response;
  }
  static async loginStudent({ email, password }) {
    const response = await axios.post(`${api.url}/student/login`, {
      email,
      password,
    });
    return response;
  }
  static async loginTeacher({ email, password }) {
    const response = await axios.post(`${api.url}/teacher/login`, {
      email,
      password,
    });
    return response;
  }
  static async verifyEmail(email, role) {
    const response = await axios.get(`${api.url}/student/send_code`, {
      params: { email, role },
    });
    return response;
  }
  static async sendCode(code) {
    const response = await axios.get(`${api.url}/student/verify_code`, {
      params: { code },
    });
    return response;
  }
  static async getRandomCourses() {
    const response = await axios.get(`${api.url}/student/get_courses`);
    return response;
  }
  static async getStudentCourses() {
    const response = await axios.get(`${api.url}/student/get_my_courses`);
    return response;
  }

  static async getCourseInfo(courseId) {
    const response = await axios.get(`${api.url}/student/course_info`, {
      params: { id_course: courseId },
    });
    return response;
  }
  static async enrollStudent(courseId) {
    const response = await axios.post(`${api.url}/student/login_course`, {
      id_course: courseId,
    });
    return response;
  }
  static async searchCourses(query) {
    const response = await axios.get(
      `${api.url}/student/searchcourse_bycoursename`,
      { params: { course_name: query } }
    );
    return response;
  }
  static async teacherAddCourse(
    course_name,
    course_discription,
    first_course,
    end_course,
    date1,
    date2
  ) {
    const response = await axios.post(`${api.url}/teacher/add_course`, {
      course_name,
      course_discription,
      first_course,
      end_course,
      date1,
      date2,
    });
    return response;
  }
  static async getTeachersCourses() {
    if (!getStoredUser()?.id) return;
    const response = await axios.get(`${api.url}/teacher/get_courses`);
    return response;
  }
  static async getTeachersCourseInfo(courseId) {
    const response = await axios.get(`${api.url}/teacher/get-course-info`, {
      params: { course_id: courseId },
    });
    return response;
  }
  static async getStudentImage(imageUrl) {
    const response = await axios.get(imageUrl);
    return response;
  }
  static async deleteCourse(userId, courseId) {
    await axios.delete(`${api.url}/teacher/delete_course`, {
      params: { id_course: courseId },
    });
  }
  static async updateCourse(formData) {
    formData.date1 = formData.date1.day + " " + formData.date1.time;
    formData.date2 = formData.date2.day + " " + formData.date2.time;
    formData.first_course = formData.first_course
      .toString()
      .slice(0, 19)
      .replace("T", " ")
      .split(" ")[0];
    formData.end_course = formData.end_course
      .toString()
      .slice(0, 19)
      .replace("T", " ")
      .split(" ")[0];
    const response = await axios.patch(`${api.url}/teacher/update_date`, {
      ...formData,
    });
    return response;
  }
  static async downloadLecture(courseId, lectureName) {
    try {
      // Make a GET request to download the file
      const response = await axios.get(
        `${api.url}/teacher/download_lecture?lectureName=${encodeURIComponent(
          lectureName
        )}&courseId=${courseId}`,
        {
          responseType: "blob", // Important for handling binary data
        }
      );

      // If filename is not provided in headers, use lectureName as fallback
      let fileName = `${lectureName}.pdf`;

      // Create a new Blob object using the response data
      const file = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      // Create a URL for the Blob and set it as the href attribute
      const fileURL = URL.createObjectURL(file);

      // Create an anchor element and set the download attribute
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute("download", fileName);

      // Append the link to the body and trigger the click
      document.body.appendChild(link);
      link.click();

      // Clean up by removing the link element and revoking the object URL
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error("Error downloading the file:", error);
    }
  }

  static async addLecture(file, id_course, id_teacher, fileName) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("id_course", id_course);
    formData.append("fileName", fileName);

    const response = await axios.post(
      `${api.url}/teacher/add_lecture`,
      formData
    );
    return response;
  }

  static async getLectures(couresId) {
    const response = await axios.get(`${api.url}/teacher/get_lectures`, {
      params: { courseId: couresId },
    });
    return response;
  }

  static async deleteLecture(courseId, fileName) {
    const response = await axios.delete(`${api.url}/teacher/delete_lecture`, {
      params: { courseId, file_name: fileName },
    });
    return response;
  }
}
