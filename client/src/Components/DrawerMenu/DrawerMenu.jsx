import React from "react";
import SearchForm from "../Navbar/SearchForm/SearchForm.jsx";
import {useNavigate} from 'react-router-dom'
import Cookies from 'js-cookies'
import { LogIn,LogOut,User, X } from "lucide-react";
import { clearSession, EMPTY_USER } from "../../auth";
import { Link } from "react-router-dom";
const DrawerMenu = ({user,modalState,setModalState,setCourses,theme,setDrawerMenuFlag,setUser}) => {
  const navigate=useNavigate()
  return (
    <span className="fixed inset-0 z-50 block h-screen w-screen overflow-y-auto bg-white/95 backdrop-blur-xl sm:hidden dark:bg-ink-900/95">
     <button onClick={()=>setDrawerMenuFlag(false)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200" ><X size={22}  /></button>
      <ul className="mx-auto flex w-full max-w-md flex-col items-stretch gap-3 px-6 pt-20">
        <li  className="flex w-full items-center">
       <div className="w-full">
       <SearchForm
            modalState={modalState}
            setModalState={setModalState}
            setCourses={setCourses}
            />    </div>    </li>
        <li  className="mt-2 flex w-full items-center justify-start border-t border-slate-200 pt-5 dark:border-white/10">
        {!JSON.parse(localStorage.getItem('user'))?.id ? (
            <Link to="/signup" className="btn-secondary gap-3">
              <LogIn size={18} color={`${theme==='dark'?"white":'black'}`} cursor={"pointer"} />
            </Link>
          ) : (
            <Link to={`/user/${user.id}`} className="btn-secondary gap-3">
            <User size={18} color={`${theme==='dark'?"white":'black'}`} cursor={"pointer"} />
            </Link>
          )}
          {JSON.parse(localStorage.getItem('user'))?.id ? (
            <button className="btn-secondary ml-3 gap-3" onClick={()=>{clearSession();setUser?.({ ...EMPTY_USER });navigate("/login");window.location.reload()}}>
              <LogOut size={18} />
            </button>
          ) : null}
        </li>

      </ul>
    </span>
  );
};

export default DrawerMenu;
