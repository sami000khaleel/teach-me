import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { userDataChange, handleLoginStudent, handleLoginTeacher } from "./utilities";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { modalState, setModalState, user, setUser } = useOutletContext();
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [teacherFlag,setTeacherFlag]=useState(false)
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <form
        className="surface animate-fade-up flex w-full max-w-md flex-col gap-5 p-8"

      >
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Log in</h2>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
          <input
            type="checkbox"
            id="role"
            checked={teacherFlag}
            name="role"
            value="teacher"
            onChange={(e) => {
              setTeacherFlag(pre=>!pre)
            }}
            className="h-4 w-4 cursor-pointer accent-brand-600"
          />
          <label htmlFor="role" className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
            I am a teacher
          </label>
        </div>

        <div>
          <label htmlFor="email" className="field-label">
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

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            type="password"
            value={user.password}
            onChange={userDataChange(setUser)}
            placeholder="Type in your password"
            name="password"
            id="password"
            className="field"
          />
        </div>

        <button
          onClick={ !teacherFlag
          ? handleLoginStudent(user, setModalState, setLoadingFlag, setUser, navigate)
          : handleLoginTeacher(user, setModalState, setLoadingFlag, setUser, navigate)}
          disabled={loadingFlag}
          className="btn-primary w-full py-3"
        >
          {loadingFlag ? <LoadingSpinner /> : 'Log in'}
        </button>

        <h1 className="text-sm text-slate-600 dark:text-slate-400">
          Forgot your password?
          <Link to="/recover-account">
            <span className="ml-2 inline-block rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20">
              Recover account
            </span>
          </Link>
        </h1>

        <h1 className="text-sm text-slate-600 dark:text-slate-400">
          Do not have an account?
          <Link to="/signup">
            <span className="ml-2 inline-block rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20">
              Sign up
            </span>
          </Link>
        </h1>
      </form>
    </div>
  );
};

export default Login;
