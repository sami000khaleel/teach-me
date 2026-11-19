import React, { useEffect, useState } from "react";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";
import { userDataChange, sendCode, verifyEmail } from "./utilities";

const RecoverAccount = () => {
  const navigate = useNavigate();
  const [emailVerifiedFlag, setEmailVerifiedFlag] = useState(false);
  const [step, setStep] = useState(0);
  const [loadingFlag, setLoadingFlag] = useState(false);
  const { user, setUser, modalState, setModalState } = useOutletContext();

  useEffect(() => {
    setUser((prev) => ({ ...prev, role: "student" }));
  }, []);

  return (
    <article className="flex min-h-[calc(100vh-72px)] w-full items-center justify-center px-4 py-10">
      {!step ? (
        <form className="surface animate-fade-up flex w-full max-w-md flex-col gap-5 p-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Verify your email
          </h2>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
            <input
              type="checkbox"
              id="role"
              checked={user?.role === "teacher"}
              name="role"
              value="teacher"
              onChange={(e) => {
                setUser((prevUser) => ({
                  ...prevUser,
                  role: e.target.checked ? "teacher" : "student",
                }));
              }}
              className="h-4 w-4 cursor-pointer accent-brand-600"
            />
            <label
              htmlFor="role"
              className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              I am a teacher
            </label>
          </div>

          <div>
            <label
              htmlFor="email"
              className="field-label"
            >
              Email
            </label>
            <input
              type="email"
              value={user.email}
              onChange={userDataChange(setUser)}
              placeholder="Type in your email"
              name="email"
              id="email"
              className="field"
            />
          </div>

          <button
            onClick={verifyEmail(
              setEmailVerifiedFlag,
              user.email,
              user.role,
              setModalState,
              setLoadingFlag,
              setStep
            )}
            disabled={loadingFlag}
            className="btn-primary w-full py-3"
          >
            {loadingFlag ? <LoadingSpinner /> : "Verify email"}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link to="/signup">
                <span className="ml-1 inline-block rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20">
                  Sign up
                </span>
              </Link>
            </h1>
            {emailVerifiedFlag && (
              <button
                onClick={() => setStep(1)}
                className="btn-secondary btn-sm"
              >
                Next Step
              </button>
            )}
          </div>
        </form>
      ) : (
        <form className="surface animate-fade-up flex w-full max-w-md flex-col gap-5 p-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Insert your code
          </h2>

          <div>
            <label
              htmlFor="code"
              className="field-label"
            >
              Code
            </label>
            <input
              type="password"
              value={user.codetext}
              onChange={userDataChange(setUser)}
              placeholder="Type in the code you received"
              name="code"
              id="code"
              className="field"
            />
          </div>

          <button
            onClick={sendCode(
              user.code,
              navigate,
              setUser,
              setModalState,
              setLoadingFlag,
              setStep
            )}
            disabled={loadingFlag}
            className="btn-primary w-full py-3"
          >
            {loadingFlag ? <LoadingSpinner /> : "Send code"}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link to="/signup">
                <span className="ml-1 inline-block rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20">
                  Sign up
                </span>
              </Link>
            </h1>
            <button
              onClick={() => setStep(0)}
              className="btn-secondary btn-sm"
            >
              Go back
            </button>
          </div>
        </form>
      )}
    </article>
  );
};

export default RecoverAccount;
