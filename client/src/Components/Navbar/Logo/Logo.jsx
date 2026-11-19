import React from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookies";
const Logo = ({ setFetchTrigger }) => {
  const navigate=useNavigate()
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation()
        setFetchTrigger(pre=>!pre)
        navigate('/home')
      }}
      className="group flex items-center"
    >
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        <span className="mr-0.5 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 px-2 py-0.5 text-white shadow-glow transition group-hover:brightness-110">
          Teach
        </span>
        Me
      </h1>
    </button>
  );
};

export default Logo;
