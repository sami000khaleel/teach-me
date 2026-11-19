import Cookies from "js-cookies";
import api from "../api/api";

// =====================================================================
// USER STATE HELPERS
// =====================================================================
export const userDataChange = (setUser) => (e) => {
  setUser((pre) => ({ ...pre, [e.target.name]: e.target.value }));
};

// =====================================================================
// AUTH: Signup
// =====================================================================
export const handleSignup =
  (user, image, setModalState, setLoadingFlag, setUser, navigate) =>
  async (e) => {
    e.preventDefault();
    if (!image?.name)
      return setModalState({
        message: "you must upload an image of your self",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    if (!user?.email)
      return setModalState({
        message: "you missed the email",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    if (!user?.firstname)
      return setModalState({
        message: "you missed the firstname",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    if (!user?.lastname)
      return setModalState({
        message: "you missed the lastname",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    if (!user?.password)
      return setModalState({
        message: "you missed the password",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    try {
      setLoadingFlag(true);
      const { data } = await api.signup(user, image);
      const newUser = { ...data, role: "student" };
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser({ ...newUser, code: "" });
      setLoadingFlag(false);
      navigate("/home");
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "error while signing up.",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };

// =====================================================================
// AUTH: Login (student + teacher)
// =====================================================================
export const handleLoginStudent =
  (user, setModalState, setLoadingFlag, setUser, navigate) => async (e) => {
    e.preventDefault();
    if (!user?.email)
      return setModalState({
        message: "you need to fill out all the email",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    if (!user?.password)
      return setModalState({
        message: "you need to fill out all the email",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    try {
      setLoadingFlag(true);
      const { data } = await api.loginStudent(user);
      const newUser = { ...data, role: "student" };
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser({ ...newUser, code: "" });
      setLoadingFlag(false);
      navigate("/home");
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "one or both of the fields are wrong",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };

export const handleLoginTeacher =
  (user, setModalState, setLoadingFlag, setUser, navigate) => async (e) => {
    e.preventDefault();
    if (!user?.email)
      return setModalState({
        message: "you need to fill out all the email",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    if (!user?.password)
      return setModalState({
        message: "you need to fill out all the email",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    try {
      setLoadingFlag(true);
      const { data } = await api.loginTeacher(user);
      const newUser = { ...data, role: "teacher" };
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser({ ...newUser, code: "" });
      setLoadingFlag(false);
      navigate("/home");
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "one or both of the fields are wrong",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };

// =====================================================================
// AUTH: Password recovery
// =====================================================================
export const sendCode =
  (code, navigate, setUser, setModalState, setLoadingFlag, setStep) =>
  async (e) => {
    try {
      if (!code)
        return setModalState({
          message: "you need to type in the code",
          status: 400,
          errorFlag: true,
          hideFlag: false,
        });
      e.preventDefault();
      setLoadingFlag(true);
      const { data } = await api.sendCode(code);
      // the server answers with a fresh login session (token) for the account owning the code
      const newUser = { ...data };
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser({ ...newUser, code: "" });
      setLoadingFlag(false);
      setStep(0);
      navigate("/reset-password");
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "code is not correct !",
        hideFlag: false,
        status: 400,
        errorFlag: true,
      });
    }
  };

export const verifyEmail =
  (setEmailVerifiedFlag, email, role, setModalState, setLoadingFlag, setStep) =>
  async (e) => {
    e.preventDefault();
    if (!email)
      return setModalState({
        message: "you need to fill out the email field",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    try {
      setLoadingFlag(true);
      await api.verifyEmail(email, role);
      setLoadingFlag(false);
      setModalState({
        message: "email sent code you be sent to you immediately !",
        status: 200,
        errorFlag: false,
        hideFlag: false,
      });
      setStep(1);
      setEmailVerifiedFlag(true);
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "this email does not exist",
        status: 404,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };

export const handleResetPassword =
  (password, role, setUser, navigate, setLoadingFlag, setModalState) =>
  async (e) => {
    try {
      e.preventDefault();
      let user = JSON.parse(localStorage.getItem("user"));
      if (!user?.token)
        return setModalState({
          message: "you have to be registered first",
          status: 400,
          errorFlag: true,
          hideFlag: false,
        });
      if (!password)
        return setModalState({
          message: "write the new password",
          status: 400,
          errorFlag: true,
          hideFlag: false,
        });
      setLoadingFlag(true);
      await api.resetPassword(password);
      // keep the session, but never keep the password
      setUser((prev) => ({ ...prev, password: "" }));
      setLoadingFlag(false);
      navigate("/home");
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "error resetting this password",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };

// =====================================================================
// COURSES: Fetching
// =====================================================================
export async function getRandomCourses(
  setCourses,
  setModalState,
  setLoadingFlag
) {
  try {
    setLoadingFlag(true);
    const { data } = await api.getRandomCourses();
    setLoadingFlag(false);
    setCourses(data);
  } catch (err) {
    console.log(err);
    setLoadingFlag(false);
    setModalState({
      message: "failed fetching the courses",
      status: 400,
      hideFlag: false,
      errorFlag: true,
    });
  }
}

export async function checkStudentIsEnrolled(
  studentId,
  setModalState,
  setLoadingFlag,
  setStudentIsEnrolledFlag,
  courseId
) {
  try {
    setLoadingFlag(true);
    const { data } = await api.getStudentCourses(studentId);
    setLoadingFlag(false);
    if (!data.length) return setStudentIsEnrolledFlag(false);
    const ids = data.map((course) => course.id_cours);
    for (let id of ids) {
      if (courseId == id) return setStudentIsEnrolledFlag(true);
    }
    setStudentIsEnrolledFlag(false);
  } catch (err) {
    console.log(err);
    setLoadingFlag(false);
    if (err?.response?.data?.message == "ids do not match") {
      return setStudentIsEnrolledFlag(false);
    }
    setModalState({
      message: "failed fetching the courses",
      status: 400,
      hideFlag: false,
      errorFlag: true,
    });
  }
}

export async function getCourseInfo(
  courseId,
  setLoadingFlag,
  setCourse,
  setModalState
) {
  try {
    setLoadingFlag(true);
    const response = await api.getCourseInfo(courseId);
    const { data } = response;
    setCourse(data[0]);
    setLoadingFlag(false);
  } catch (error) {
    console.log(error);
    setLoadingFlag(false);
    return setModalState({
      message: "failed fething the course",
      code: 404,
      errorFlag: true,
      hideFlag: false,
    });
  }
}

export async function getTeachersCourses(
  setTeachersCourses,
  setModalState,
  setLoadingFlag
) {
  try {
    setLoadingFlag(true);
    const { data } = await api.getTeachersCourses();
    setTeachersCourses(data.courses);
    setLoadingFlag(false);
  } catch (error) {
    setLoadingFlag(false);
    setModalState({
      message: "failed fetching the teachers courses",
      status: 400,
      errorFlag: true,
      hideFlag: false,
    });
  }
}

export async function fetchTeachersCourseDetails(
  courseId,
  setLoadingFlag,
  setModalState,
  setStudents,
  setCourse,
  setTeacherGivesCourseFlag
) {
  try {
    setLoadingFlag(true);
    const { data } = await api.getTeachersCourseInfo(courseId);
    setLoadingFlag(false);
    setStudents(data.students);
    setCourse(data.course[0]);
    setTeacherGivesCourseFlag(true);
  } catch (err) {
    console.log(err);
    setLoadingFlag(false);
    setTeacherGivesCourseFlag(false);
  }
}

export async function getStudentCourses(
  studentId,
  setLoadingFlag,
  setStudentCourses,
  setModalState
) {
  try {
    setLoadingFlag(true);
    const { data } = await api.getStudentCourses(studentId);
    setLoadingFlag(false);
    setStudentCourses(data);
  } catch (error) {
    console.log(error);
    setModalState({
      message: "failed fetching the students courses",
      status: 500,
      errorFlag: true,
      hideFlag: false,
    });
  }
}

// =====================================================================
// ENROLLMENT
// =====================================================================
export const enrollStudent =
  (
    courseId,
    setModalState,
    setLoadingFlag,
    navigate,
    setStudentIsEnrolledFlag
  ) =>
  async (e) => {
    try {
      e.preventDefault();
      setLoadingFlag(true);
      await api.enrollStudent(courseId);
      setStudentIsEnrolledFlag(true);
      setLoadingFlag(false);
      setModalState({
        message: "you have been enrolled to this course successfuly!",
        status: 200,
        errorFlag: false,
        hideFlag: false,
      });
    } catch (err) {
      console.log(err);
      setLoadingFlag(false);
      setModalState({
        message: "error adding the student to the course !",
        hideFlag: false,
        status: 400,
        errorFlag: true,
      });
    }
  };

// =====================================================================
// ACTION BUTTONS on the Course page
// =====================================================================
/**
 * Returns the appropriate action button(s) for the current user.
 *
 * ⚠️  DEMO MODE: Time check is intentionally bypassed.
 *     The `timeFlag` parameter (computed from `checkTime()`) is
 *     received but IGNORED. Both teachers and students always see
 *     the action button, regardless of the schedule.
 *
 *     To restore the schedule gate, uncomment the two commented
 *     blocks below and remove the demo-mode returns.
 */
export function giveCourseAction(
  teacherGivesCourseFlag,
  setStudentIsEnrolledFlag,
  user,
  timeFlag, // ⚠️ received but ignored in demo mode
  navigate,
  courseId
) {
  // -------------------------------------------------------------------
  // STUDENT
  // -------------------------------------------------------------------
  if (user.role == "student") {
    // 🔒 ORIGINAL GATE — uncomment to re-enable schedule enforcement:
    // if (timeFlag) {
    //   return (
    //     <button
    //       onClick={(e) => {
    //         e.preventDefault();
    //         e.stopPropagation();
    //         navigate(`/room/${courseId}`);
    //       }}
    //       className=" text-white bg-primaryDark w-full mx-auto py-2 rounded-xl hover:bg-primarylightText font-bold text"
    //     >
    //       Attend Lesson
    //     </button>
    //   );
    // }
    // return (
    //   <h1 className="text-primaryDark font-bold text">
    //     return at the lessons time
    //   </h1>
    // );

    // 🎮 DEMO MODE — always allow joining
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/room/${courseId}`);
        }}
        className="btn-primary mt-3 w-full py-3 text-base"
      >
        Attend Lesson
      </button>
    );
  }

  // -------------------------------------------------------------------
  // TEACHER
  // -------------------------------------------------------------------
  if (user.role == "teacher") {
    // 🔒 ORIGINAL GATE — uncomment to re-enable schedule enforcement:
    // if (timeFlag) {
    //   return (
    //     <button
    //       onClick={(e) => {
    //         e.preventDefault();
    //         e.stopPropagation();
    //         navigate(`/room/${courseId}`);
    //       }}
    //       className=" text-white bg-primaryDark w-full mx-auto py-2 rounded-xl hover:bg-primarylightText font-bold text"
    //     >
    //       start giving the lecture
    //     </button>
    //   );
    // }
    // return (
    //   <h1 className="text-primaryDark font-bold text">
    //     you can give the lecture only at the specified dates.
    //   </h1>
    // );

    // 🎮 DEMO MODE — always allow starting
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/room/${courseId}`);
        }}
        className="btn-primary mt-3 w-full py-3 text-base"
      >
        Start Lecture
      </button>
    );
  }
}

// =====================================================================
// TIME CHECK
// =====================================================================
/**
 * Returns true if the current time is within 15 minutes before
 * either of the two weekly lesson slots.
 *
 * ⚠️  In demo mode this is computed but IGNORED by giveCourseAction.
 *     It's still exported so we can flip the gate back on easily.
 */
export function checkTime(date1, date2) {
  const parseDate = (dateStr) => {
    const [day, time, period] = dateStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);

    let dayNumber = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ].indexOf(day);
    let date = new Date();
    date.setDate(date.getDate() + ((dayNumber + 7 - date.getDay()) % 7));

    let hour = period === "PM" ? (hours % 12) + 12 : hours % 12;
    date.setHours(hour, minutes, 0, 0);
    return date;
  };

  const isWithin15Minutes = (targetDate) => {
    const now = new Date();
    const fifteenMinutesBefore = new Date(
      targetDate.getTime() - 15 * 60 * 1000
    );
    return now >= fifteenMinutesBefore && now <= targetDate;
  };

  const dateObj1 = parseDate(date1);
  const dateObj2 = parseDate(date2);

  return isWithin15Minutes(dateObj1) || isWithin15Minutes(dateObj2);
}
