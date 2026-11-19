import React, { useState, useEffect } from "react";
import Success from "../../assets/svgs/Success";
import Error from "../../assets/svgs/Error";
import "./loaderAnimation.css";
import { LucideMessageSquareWarning } from "lucide-react";

const ModalPopup = ({ modalState, setModalState }) => {
  const [timeOutId, setTimeOutId] = useState(null);

  // Auto-dismiss only if it's NOT a confirm modal
  useEffect(() => {
    if (modalState?.onConfirm) return; // skip auto-dismiss for confirm

    const id = setTimeout(() => {
      setModalState((prevState) => ({
        ...prevState,
        hideFlag: true,
        onConfirm: null,
      }));
    }, 2000);
    setTimeOutId(id);

    return () => clearTimeout(id);
  }, []);

  function handleClose(e) {
    e.preventDefault();
    setModalState((prevState) => ({
      ...prevState,
      hideFlag: true,
      onConfirm: null,
    }));
    if (timeOutId) clearTimeout(timeOutId);
  }

  function handleConfirm(e) {
    e.preventDefault();
    if (typeof modalState.onConfirm === "function") {
      modalState.onConfirm();
    }
    setModalState((prevState) => ({
      ...prevState,
      hideFlag: true,
      onConfirm: null,
    }));
  }

  const isConfirm = typeof modalState?.onConfirm === "function";

  return (
    <article
      className={`fade-out fixed inset-x-4 top-20 z-[100] mx-auto max-w-xl overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-ink-800 ${
        modalState?.errorFlag
          ? "border-red-200 dark:border-red-500/30"
          : modalState?.warningFlag
          ? "border-amber-200 dark:border-amber-500/30"
          : "border-emerald-200 dark:border-emerald-500/30"
      }`}
    >
      <div className="flex flex-row items-center gap-4 p-4 pb-5">
        <div className="shrink-0">
          {modalState?.errorFlag ? (
            <Error />
          ) : modalState?.warningFlag ? (
            <LucideMessageSquareWarning stroke="#f59e0b" size={40} />
          ) : (
            <Success />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1
            className={`${
              modalState?.errorFlag
                ? "text-red-600 dark:text-red-400"
                : modalState?.warningFlag
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            } text-base font-bold`}
          >
            {modalState?.errorFlag ? "Error" : isConfirm ? "Confirm" : "Success"}
          </h1>

          <h3 className="mt-0.5 break-words text-sm text-slate-600 dark:text-slate-300">
            {modalState?.message}
          </h3>
        </div>

        {isConfirm ? (
          <div className="flex shrink-0 gap-2">
            <button
              className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600"
              onClick={handleConfirm}
            >
              Yes, continue
            </button>
            <button className="btn-secondary btn-sm" onClick={handleClose}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            className={`${
              modalState?.errorFlag
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            } btn btn-sm shrink-0 text-white`}
            onClick={handleClose}
          >
            {!modalState?.errorFlag ? <p>OK</p> : <p>Cancel</p>}
          </button>
        )}
      </div>

      <span
        id="loader"
        className={`${
          !modalState.hideFlag && !isConfirm ? "animate-loader" : ""
        } absolute bottom-0 left-0 h-1 ${
          modalState?.errorFlag
            ? "bg-red-500"
            : modalState?.warningFlag
            ? "bg-amber-500"
            : "bg-emerald-500"
        }`}
      ></span>
    </article>
  );
};

export default ModalPopup;
