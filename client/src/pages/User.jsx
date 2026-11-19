import React, { useEffect, useState } from "react";
import CourseForm from "../Components/CourseForm/CourseForm";
import { useOutletContext } from "react-router-dom";
import { getTeachersCourses, getStudentCourses } from "./utilities.jsx";
import Courses from "../Components/Courses/Courses";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";
const User = () => {
  const [updateMode,setUpdateMode]=useState(false)
  const [loadingFlag, setLoadingFlag] = useState(false);
  const { user, setModalState } = useOutletContext();
  const [teachersCourses, setTeachersCourses] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse,setSelectedCourse]=useState({})
  useEffect(() => {
    // fetch the teachers courses
    if (user.role == "teacher")
      getTeachersCourses(setTeachersCourses, setModalState, setLoadingFlag);
    if (user.role == "student")
      getStudentCourses(
        user.id,
        setLoadingFlag,
        setStudentCourses ,
        setModalState
      );
  }, []);
  return (
    <section
      id="uesrs page"
      className="flex w-full flex-col items-center justify-center"
    >
      {user.role == "teacher" ? (
        <article id='form' className="flex w-full items-center justify-center px-4 py-10">
          <CourseForm setSelectedCourse={setSelectedCourse}  userId={user.id} selectedCourse={selectedCourse} setUpdateMode={setUpdateMode} updateMode={updateMode} setTeachersCourses={setTeachersCourses} />
        </article>
      ) : null}

      {loadingFlag ? (
        <div className="flex w-full flex-col items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : teachersCourses.length||studentCourses.length ? (
        <article
          className="page-wrap mt-6 flex flex-col items-center pb-16"
          id="teachers courses"
        >
          <h1 className="mb-8 w-full text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            your courses
          </h1>
          <div className="flex w-full flex-col items-center justify-center">
            <Courses setUpdateMode={setUpdateMode} setSelectedCourse={setSelectedCourse}  courses={teachersCourses.length?teachersCourses:studentCourses} />
          </div>
        </article>
      ) : (
        <h1 className="my-16 text-2xl font-bold text-slate-500 dark:text-slate-400">
          you have no courses
        </h1>
      )}
    </section>
  );
};

export default User;
