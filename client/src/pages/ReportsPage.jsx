import React, { useState, useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import axios from "axios";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";
import Reports from "../Components/Reports/Reports";

const ReportsPage = () => {
  const { courseId } = useParams();
  const [hasRequestedReports, setHasRequestedReports] = useState(false);
  const { setModalState, modalState, user } = useOutletContext();
  const [todaysReports, setTodaysReports] = useState([]);
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [inputDate, setInputDate] = useState("");
  const [dateReports, setDateReports] = useState([]);
  useEffect(() => {
    setLoadingFlag(true);
    axios
      .get(`/api/teacher/get_days_report?date=${new Date()}&courseId=${courseId}`)
      .then(({ data }) => {
        console.log("todays requests were fetched");
        setTodaysReports(data);
        setLoadingFlag(false);
      })
      .catch((err) => {
        setLoadingFlag(false);
        if (err?.response?.data?.message)
          setModalState({
            message: err?.response?.data?.message,
            status: err?.response?.status,
            hideFlag: false,
            errorFlag: true,
          });
      });
  }, []);

  const handleDateSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation()
    setHasRequestedReports(true);
    setLoadingFlag(true);
    axios
      .get(`/api/teacher/get_days_report?date=${inputDate}&courseId=${courseId}`)
      .then(({ data }) => {
        console.log(data,'dasds')
        setDateReports(data);
        setLoadingFlag(false);
        if (!data.length)
          setModalState({
            message: "no corses were found at the specified date",
            status: 404,
            errorFlag: true,
            hideFlag: false,
          });
      })
      .catch((err) => {
        setLoadingFlag(false);
        if (err?.response?.data?.message)
          setModalState({
            message: err?.response?.data?.message,
            status: err?.response?.status,
            hideFlag: false,
            errorFlag: true,
          });
      });
  };

  return (
    <section className="page-wrap flex min-h-full w-full flex-col items-center justify-start py-10">
        <article className="mb-12 flex w-full max-w-4xl flex-col items-stretch">
            <h2 className="mb-5 text-start text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Today`s Reports</h2>
            {loadingFlag ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
            ) : todaysReports.length ? (
                <div className="grid w-full gap-4 sm:grid-cols-2" id="todays-articles">
                    <Reports reports={todaysReports} />
                </div>
            ) : (
                <h2 className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">There were no calls made today</h2>
            )}
        </article>
        <article className="w-full max-w-4xl">
            <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Get Reports by Date</h2>
            <form className="surface flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
                <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="field"
                    required
                />
                <button
                    onClick={(e) => handleDateSubmit(e)}
                    className="btn-primary w-full sm:w-auto"
                >
                    Submit
                </button>
            </form>
            {loadingFlag ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
            ) : dateReports.length ? (
                <div id="date-articles" className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Reports reports={dateReports} />
                </div>
            ) : hasRequestedReports ? (
                <h2 className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">No reports found for this date</h2>
            ) : null}
        </article>
    </section>
  );
};

export default ReportsPage;
