import React from "react";
import { useNavigate } from "react-router-dom";

const Report = ({ report }) => {
  const navigate = useNavigate();

  const handleReportClick = () => {
    navigate(`/report/${report.callId}`);
  };

  const formatLectureTime = (lectureTime) =>
    lectureTime.split(",")[0][0] === "0"
      ? lectureTime.split(",")[1]
      : lectureTime;

  return (
    <div
      onClick={handleReportClick}
      className="group flex w-full cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-xl dark:border-white/10 dark:bg-ink-800/80 dark:hover:border-brand-400/40"
    >
      <p className="flex items-baseline justify-between gap-3 text-sm">
       <span className="font-semibold text-brand-600 dark:text-brand-300">
        Total Lecture Time:{" "}
         </span>
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {formatLectureTime(report.totalLectureTime)}
        </span>
      </p>
      <p className="flex items-baseline justify-between gap-3 text-sm">
       <span className="font-semibold text-brand-600 dark:text-brand-300">
        Number of Attendances:{" "}
         </span>
        <span className="font-medium text-slate-800 dark:text-slate-100">{report.numberOfAttendences}</span>
      </p>
      <p className="flex items-baseline justify-between gap-3 text-sm">
       <span className="font-semibold text-brand-600 dark:text-brand-300">
        Was Given At:{" "}
         </span>
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {new Date(report.startedAt).toLocaleDateString("en-US", {
            weekday: "long",
          })}
        </span>
      </p>
      <p className="flex items-baseline justify-between gap-3 text-sm">
       <span className="font-semibold text-brand-600 dark:text-brand-300">
        Started At:{" "}
         </span>
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {new Date(report.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </p>
      <p className="flex items-baseline justify-between gap-3 text-sm">
       <span className="font-semibold text-brand-600 dark:text-brand-300">
        Ended At:{" "}
        </span>
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {new Date(report.endedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </p>
    </div>
  );
};

export default Report;
