import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { userDataChange, handleSignup } from "./utilities";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const { modalState, setModalState, user, setUser } = useOutletContext();
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [image, setImage] = useState(null);
  const navigate = useNavigate();
  return (
    // <div className="w-full h-full mx-auto">

    <div className="mx-auto flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <form
        className="surface animate-fade-up flex w-full min-w-[300px] max-w-[640px] flex-col items-stretch justify-between gap-4 p-6 sm:p-8"

      >
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sign up</h2>
        <div className="flex flex-col items-stretch justify-between gap-5 sm:flex-row">
        <div className="flex flex-1 flex-col items-stretch justify-center gap-5">
        <div className="">
          <label htmlFor="firstname" className="field-label">
            First Name
          </label>
          <input
            type="text"
            value={user.firstname}
            onChange={userDataChange(setUser)}
            placeholder="Type in your firstname"
            name="firstname"
            id="firstname"
            className="field"
          />
        </div>

        <div className="">
          <label htmlFor="lastname" className="field-label">
            Last Name
          </label>
          <input
            type="text"
            value={user.lastname}
            onChange={userDataChange(setUser)}
            placeholder="Type in your lastname"
            name="lastname"
            id="lastname"
            className="field"
            />
        </div>

        <div className="">
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
            </div>
            <div className="flex flex-1 flex-col items-stretch justify-start gap-5">

        <div className="w-full">
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

        <div className="w-full">
          <label htmlFor="image" className="field-label">
            Personal Image
          </label>
          <label
            htmlFor="image"
            className="field block cursor-pointer truncate border-dashed text-slate-500 hover:border-brand-400 hover:bg-brand-50/50 dark:text-slate-400 dark:hover:bg-white/5"
          >
            {image?.name ? image.name : 'Upload personal image'}
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="hidden w-full cursor-pointer"
            />
          </label>
        </div>

        <button
  onClick={handleSignup(user, image, setModalState, setLoadingFlag, setUser, navigate)}
disabled={loadingFlag}
          className="btn-primary w-full py-3"
        >
          {loadingFlag ? <LoadingSpinner /> : 'Submit'}
        </button>

        <h1 className="text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login">
            <span className="ml-1 inline-block rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20">
              Login
            </span>
          </Link>
        </h1>
              </div>
</div>
      </form>
    </div>
              // </div>
  );
};

export default Signup;
