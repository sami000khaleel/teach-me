import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dateTrimmer } from "../../../App";
import { Settings, Trash } from "lucide-react";
import { handleDeleteCourse } from "../../../App";
import { useOutletContext, useLocation } from "react-router-dom";
import axios from "axios";

const Course = ({ course, setUpdateMode, setSelectedCourse }) => {
  const location = useLocation();
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [deletedFlag, setDeletedFlag] = useState(false);
  const [teacherGivesCourseFlag, setTeacherGivesCourseFlag] = useState(false);
  const { setModalState, user } = useOutletContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== "teacher") return;
    axios
      .get(`/api/teacher/get-course-info?course_id=${course.id_cours}`)
      .then(({ data }) => setTeacherGivesCourseFlag(true))
      .catch((err) => console.log(err));
  }, [course.id_cours, user]);

  if (!course?.id_cours || deletedFlag) return null;

  return (
    <div
      className={`group relative flex flex-col items-start justify-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 pt-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-ink-800/80 dark:hover:border-brand-400/30 ${
        deletedFlag ? "hidden" : ""
      }`}
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-500" />
      {new Date(course.first_cours) > new Date() &&
      teacherGivesCourseFlag &&
      location.pathname.includes("user") ? (
        <div className="absolute right-4 top-5 flex gap-1">
          <Settings
            className="h-9 w-9 cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setSelectedCourse(course);
              setUpdateMode(true);
            }}
          />
          <Trash
            className="h-9 w-9 cursor-pointer rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteCourse(
                course,
                setLoadingFlag,
                setDeletedFlag,
                setModalState,
                setUpdateMode,
                setSelectedCourse
              )(e);
            }}
          />
        </div>
      ) : null}

      <p className="mb-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20">
        {new Date(course.first_cours) > new Date()
          ? `Starts at: ${dateTrimmer(course.first_cours)}`
          : "Ongoing"}
      </p>

      <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {course.cours_name}
      </h2>

      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        Instructor:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {course?.teacher?.first_name} {course?.teacher?.last_name}
        </span>
        <br />
        <span className="text-xs text-slate-500 dark:text-slate-500">
          {course?.teacher?.email}
        </span>
      </p>

      <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {course.cours_discription}
      </p>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/course/${course.id_cours}`);
        }}
        className="btn-primary mt-auto w-full"
      >
        Learn More
      </button>
    </div>
  );
};

export default Course;
