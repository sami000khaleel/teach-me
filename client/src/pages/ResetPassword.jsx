import React, { useState, useEffect } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { userDataChange, handleResetPassword } from "./utilities";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";

const ResetPassword = () => {
  const { modalState, setModalState, user, setUser } = useOutletContext();
  const [loadingFlag, setLoadingFlag] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setUser((prev) => ({ ...prev, password: "" }));
  }, []);

  return (
    <article className="flex min-h-[calc(100vh-72px)] w-full items-center justify-center px-4 py-10">
      <form className="surface animate-fade-up flex w-full max-w-md flex-col gap-5 p-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Reset your password
        </h2>

        <div>
          <label
            htmlFor="password"
            className="field-label"
          >
            New Password
          </label>
          <input
            type="password"
            value={user.password}
            onChange={userDataChange(setUser)}
            placeholder="Type in your new password"
            name="password"
            id="password"
            className="field"
          />
        </div>

        <button
          onClick={handleResetPassword(
            user.password,
            user.role,
            setUser,
            navigate,
            setLoadingFlag,
            setModalState
          )}
          disabled={loadingFlag}
          className="btn-primary w-full py-3"
        >
          {loadingFlag ? <LoadingSpinner /> : "Reset"}
        </button>
      </form>
    </article>
  );
};

export default ResetPassword;
