import Cookies from "js-cookies";
import api from "./api/api";
/**
 * Sets the theme based on the user's preferred color scheme and stores it in a cookie.
 * @param {Function} setTheme - A function that sets the theme of the application.
 */
export function handleThemeInit(setTheme) {
  let isDarkMode = false;
  if (Cookies.getItem("theme")) {
    isDarkMode = Cookies.getItem("theme") === "dark" ? true : false;
    isDarkMode
      ? document.documentElement.classList.add("dark")
      : document.documentElement.classList.remove("dark");
    isDarkMode ? setTheme("dark") : setTheme("light");
    isDarkMode
      ? Cookies.setItem("theme", "dark")
      : Cookies.setItem("theme", "light");

    return;
  }
  isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  console.log(isDarkMode);
  const theme = isDarkMode ? "dark" : "light";
  console.log(theme);
  setTheme(theme);
  Cookies.setItem("theme", theme);
  isDarkMode
    ? document.documentElement.classList.add("dark")
    : document.documentElement.classList.remove("dark");
}
export function handleThemeChange(setTheme) {
  return (e) => {
    const theme = Cookies.getItem("theme");
    if (theme === "dark") {
      setTheme("light");
      Cookies.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      return;
    }
    if (theme === "light") {
      setTheme("dark");
      Cookies.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
      return;
    }
  };
}
export function dateTrimmer(date) {
  if (!date) return date;
  if (date.includes("T")) return date.split("T")[0];
  return date;
}
export function handleDeleteCourse(
  course,
  setLoadingFlag,
  setDeletedFlag,
  setModalState,
  setUpdateMode,
  setSelectedCourse
) {
  const user = JSON.parse(localStorage.getItem("user"));
  return async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setLoadingFlag(false);
      await api.deleteCourse(user.id, course.id_cours);
      setLoadingFlag(true);
      setDeletedFlag(true);
      setUpdateMode(false);
      setUpdateMode(false);
      setSelectedCourse({});
      setModalState({
        message: "course was deleted successfuly",
        status: 200,
        hideFlag: false,
        errorFlag: false,
      });
    } catch (error) {
      console.log(error);
      setLoadingFlag(false);
      setModalState({
        message: "could not delete this course",
        status: 400,
        hideFlag: false,
        errorFlag: true,
      });
    }
  };
}
export function updateCourse(
  formData,
  setLoadingFlag,
  setModalState,
  setTeacherCourses,
  setUpdateMode
) {
  return async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setLoadingFlag(true);
      const { id_course } = formData;

      const response = await api.updateCourse({
        ...formData,
        end_course: new Date(formData.end_course)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
          .split(" ")[0],
        first_course: new Date(formData.first_course)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
          .split(" ")[0],
      });
      setLoadingFlag(false);
      setUpdateMode(false);
      window.location.reload()
    } catch (error) {
      console.log(error);
      setLoadingFlag(false);
      setModalState({
        message: "error updating the course",
        status: 400,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };
}
