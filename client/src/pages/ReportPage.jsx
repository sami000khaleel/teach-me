import React, { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import axios from "axios";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";

const ReportPage = () => {
  const { setModalState } = useOutletContext();
  const { callId } = useParams();
  const [report, setReport] = useState({});
  const [loadingFlag, setLoadingFlag] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [expandedObservations, setExpandedObservations] = useState({});

  useEffect(() => {
    setLoadingFlag(true);
    axios
      .get(`/api/teacher/get_report?callId=${callId}`)
      .then(({ data }) => {
        setLoadingFlag(false);
        setReport(data);
      })
      .catch((err) => {
        setLoadingFlag(false);
        setModalState({
          message: err?.response?.data?.message,
          status: err?.response?.status,
          errorFlag: true,
          hideFlag: false,
        });
      });
  }, [callId]);

  const toggleStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const toggleLogs = (studentId) => {
    setExpandedLogs((prevState) => ({
      ...prevState,
      [studentId]: !prevState[studentId],
    }));
  };

  const toggleObservations = (studentId) => {
    setExpandedObservations((prevState) => ({
      ...prevState,
      [studentId]: !prevState[studentId],
    }));
  };

  const formatLectureTime = (lectureTime) => {
    return lectureTime.split(",")[0][0] === "0"
      ? lectureTime.split(",")[1]
      : lectureTime;
  };

  function convertToMinutes(duration) {
    let totalMinutes = 0;
    const parts = duration.split(",");
    parts.forEach((part) => {
      part = part.trim();
      if (part.includes("hour")) {
        const hours = parseInt(part);
        totalMinutes += hours * 60;
      } else if (part.includes("minute")) {
        const minutes = parseInt(part);
        totalMinutes += minutes;
      }
    });
    return totalMinutes;
  }

  function formatObservation(observation, times) {
    const formattedTimes = times.map((time) => {
      const from = new Date(time.from);
      const to = new Date(time.to);
      const durationSeconds = Math.round((to - from) / 1000);
      const durationMinutes = Math.floor(durationSeconds / 60);
      const remainingSeconds = durationSeconds % 60;
      return {
        from: from.toLocaleTimeString(),
        to: to.toLocaleTimeString(),
        duration:
          durationMinutes > 0
            ? `${durationMinutes} minutes, ${remainingSeconds} seconds`
            : `${remainingSeconds} seconds`,
      };
    });
    const totalDurationSeconds = times.reduce((total, time) => {
      const from = new Date(time.from);
      const to = new Date(time.to);
      return total + Math.round((to - from) / 1000);
    }, 0);
    const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);
    const totalRemainingSeconds = totalDurationSeconds % 60;

    return {
      formattedTimes,
      totalDuration:
        totalDurationMinutes > 0
          ? `${totalDurationMinutes} minutes, ${totalRemainingSeconds} seconds`
          : `${totalRemainingSeconds} seconds`,
    };
  }

  function getObservationCount(times) {
    if (times.length === 1) {
      return "once";
    } else {
      return `${times.length} times`;
    }
  }

  return (
    <div className="page-wrap min-h-screen max-w-4xl py-10">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Report
      </h1>
      {loadingFlag ? (
        <>
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        </>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="chip px-4 py-2 text-sm">
              Total Lecture Time: {formatLectureTime(report.totalLectureTime)}
            </h2>
          </div>
          {report.students?.map((student) => (
            <div
              key={student.studentId}
              className="surface mb-4 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <img
                    src={student.image_url}
                    alt={student.name}
                    className="mr-4 h-16 w-16 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-500/30"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {student.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {student.email}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Total Time Attending:{" "}
                      {`${formatLectureTime(student.totalTimeAttending)} (${
                        Math.round((convertToMinutes(student.totalTimeAttending) /
                          convertToMinutes(report.totalLectureTime)) *
                        100)
                      }%)`}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Login Count: {student.loginCount}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStudent(student.studentId)}
                  className="btn-secondary btn-sm"
                >
                  {expandedStudent === student.studentId ? "Hide" : "Show"}{" "}
                  Details
                </button>
              </div>
              {expandedStudent === student.studentId && (
                <div className="mt-5 border-t border-slate-200/80 pt-4 dark:border-white/10">
                  <div className="mb-3">
                    <div
                      className="flex cursor-pointer items-center"
                      onClick={() => toggleLogs(student.studentId)}
                    >
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Logs
                      </h4>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">
                        {expandedLogs[student.studentId] ? "▲" : "▼"}
                      </span>
                    </div>
                    {expandedLogs[student.studentId] && (
                      <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {student.logs.map((log) => (
                          <li key={log._id}>
                            Connected At:{" "}
                            {new Date(log.connectedAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                            <br />
                            Disconnected At:{" "}
                            {new Date(log.disconnectedAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div
                      className="flex cursor-pointer items-center"
                      onClick={() => toggleObservations(student.studentId)}
                    >
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Observations
                      </h4>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">
                        {expandedObservations[student.studentId] ? "▲" : "▼"}
                      </span>
                    </div>
                    {expandedObservations[student.studentId] && (
                      <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {Object.entries(student.observations).map(
                          ([observation, times], index) => {
                            const { formattedTimes, totalDuration } =
                              formatObservation(observation, times);
                            return (
                              <li key={index}>
                                {observation} {getObservationCount(times)}:
                                <ul className="list-inside list-disc pl-5">
                                  {formattedTimes.map((time, idx) => (
                                    <li key={idx}>
                                      From: {time.from}, To: {time.to},{" "}
                                      Duration: {time.duration}
                                    </li>
                                  ))}
                                </ul>
                                Total Duration: {totalDuration}
                              </li>
                            );
                          }
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportPage;
