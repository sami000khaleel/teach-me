import React from 'react';
import { useNavigate } from 'react-router-dom';
const PageNotFound = () => {
  const navigate=useNavigate()
    return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      <span aria-hidden="true" className="gradient-text pointer-events-none absolute select-none text-[12rem] font-extrabold leading-none opacity-10 sm:text-[18rem]">404</span>
      <h1 className="relative mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">Page Not Found</h1>
      <p className="relative mb-8 text-lg text-slate-600 dark:text-slate-400">The page you are looking for does not exist.</p>
      <button onClick={e=>{
        e.preventDefault()
        navigate('/home')
      }} className="btn-primary relative px-6 py-3">
        Go back
      </button>
    </div>
  );
};

export default PageNotFound;
