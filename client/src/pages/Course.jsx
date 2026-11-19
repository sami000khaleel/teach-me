import React, { useEffect, useState } from "react";
import ModalPopup from "../Components/ModalPopup/ModalPopup";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import {
  checkStudentIsEnrolled,
  getCourseInfo,
  enrollStudent,
  fetchTeachersCourseDetails,
  giveCourseAction,
  checkTime,
} from "./utilities.jsx";
import { dateTrimmer } from "../App";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";

const Course = () => {
  const { courseId } = useParams();
  const [teacherGivesCourseFlag, setTeacherGivesCourseFlag] = useState(false);
  const navigate = useNavigate();
  const [studentIsEnrolledFlag, setStudentIsEnrolledFlag] = useState(false);
  const [loadingFlag, setLoadingFlag] = useState(false);
  const {
    modalState,
    setModalState,
    setTheme,
    user,
    setUser,
    students,
    course,
    setCourse,
    setStudents,
  } = useOutletContext();

  useEffect(() => {
    getCourseInfo(courseId, setLoadingFlag, setCourse, setModalState);
    if (user.role === "student") {
      checkStudentIsEnrolled(
        user.id,
        setModalState,
        setLoadingFlag,
        setStudentIsEnrolledFlag,
        courseId
      );
    } if(user.role === 'teacher') {
      setStudentIsEnrolledFlag(false);
      fetchTeachersCourseDetails(
        courseId,
        setLoadingFlag,
        setModalState,
        setStudents,
        setCourse,
        setTeacherGivesCourseFlag
      );
    }
  }, [courseId]);

  return (
    <div className="page-wrap flex min-h-[calc(100vh-72px)] flex-col items-center py-10">
      {Object.keys(course)?.length ? (
        <section className="flex w-full flex-col items-center gap-6">
          {course?.id_cours ? (
            <div
              className="surface w-full max-w-2xl overflow-hidden"
              key={course.id_cours}
            >
              <div className="h-28 bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-500" />
              <div className="flex flex-col p-6 sm:p-8">
              <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{course.cours_name}</h1>
              <h1 className="text-slate-600 dark:text-slate-400">{course.cours_discription}</h1>
              <article className="my-5 flex flex-wrap gap-2" id="deadlines">
                {new Date(course.first_cours) > new Date() ? (
                  <h2 className="chip">
                    starts at: {dateTrimmer(course.first_cours)}
                  </h2>
                ) : (
                  <span className="chip">on going</span>
                )}
                <h2 className="chip">
                  end at: {dateTrimmer(course.end_cours)}
                </h2>
              </article>
              <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-300">every week at :</h1>
              <article
                className="my-3 flex flex-col items-start justify-center gap-2"
                id="dates"
              >
                <h1 className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-white/5 dark:text-slate-200">{course.date1}</h1>
                <h1 className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-white/5 dark:text-slate-200">{course.date2}</h1>
              </article>

              {!user?.role ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/signup');
                  }}
                  className="btn-primary mt-3 w-full py-3"
                >
                  Signup to join
                </button>
              ) : !(new Date(course.first_cours) > new Date()) ? (
                giveCourseAction(
                  teacherGivesCourseFlag,
                  setStudentIsEnrolledFlag,
                  user,
                  checkTime(course.date1, course.date2), // bool tells whether it is time for the lecture or not
                  navigate,
                  courseId
                )
              ) : user.role === "teacher" || studentIsEnrolledFlag ? (
                <h2 className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-center font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  The course has not begun yet
                </h2>
              ) : (
                <button
                  onClick={enrollStudent(
                    courseId,
                    setModalState,
                    setLoadingFlag,
                    navigate,
                    setStudentIsEnrolledFlag
                  )}
                  className="btn-primary mt-3 w-full py-3 text-base"
                >
                  Enroll
                </button>
              )}
             {user.role=='teacher'&&teacherGivesCourseFlag&&(new Date(course.first_cours) < new Date())? <button
                onClick={() => navigate(`/reports/${courseId}`)}
                className="btn-secondary mt-3 w-full py-3"
              >
                View Reports
              </button>:null}
          <button
                onClick={() => navigate(`/course/${courseId}/lecture`)}
                className="btn mt-3 w-full bg-slate-900 py-3 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Lectures
              </button>
              </div>
            </div>
          ) : (
            <div className="surface flex w-full max-w-2xl flex-col justify-between p-4"></div>
          )}
          {user.role === 'teacher' && teacherGivesCourseFlag && (
            <article
              id='students-in-the-course'
              className="surface w-full max-w-2xl p-6"
            >
              <h1 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {loadingFlag ? null : !students?.length ? 'No students are registered yet' : 'Students in this course:'}
              </h1>
              {students.map((student) => (
                <div
                  key={student.id_stu}
                  className="my-2 flex w-full items-center rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <img
                    src={student.image_url}
                    alt={`${student.first_name_stu} ${student.last_name_stu}`}
                    className="mr-4 h-12 w-12 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-500/30"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                      {student.first_name_stu} {student.last_name_stu}
                    </h2>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {student.email_stu}
                    </p>
                  </div>
                </div>
              ))}
            </article>
          )}
        </section>
      ) : (
        <div className="absolute right-1/2 top-1/2 translate-x-1/2 translate-y-1/2 transform">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};

export default Course;
