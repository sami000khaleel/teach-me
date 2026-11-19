import React, { useState,useEffect } from "react";
import Logo from "./Logo/Logo";
import SearchForm from "./SearchForm/SearchForm.jsx";
import DrawerMenu from "../DrawerMenu/DrawerMenu.jsx";
import { handleThemeChange } from "../../App.js";
import { Link,useLocation,useNavigate } from "react-router-dom";
import { clearSession, EMPTY_USER } from "../../auth";
import { LogIn, LogOut, Menu, User, Moon, Sun } from "lucide-react";

const iconBtn =
  "grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10";

const Navbar = ({ setFetchTrigger,theme,setTheme,user, modalState, setModalState, setCourses, setUser }) => {
  const navigate=useNavigate()
  const handleLogout=()=>{
    clearSession()
    setUser?.({ ...EMPTY_USER })
    navigate("/login")
    window.location.reload()
  }
  const [drawerMenuFlag,setDrawerMenuFlag]=useState(false)
  const location=useLocation()
  useEffect(()=>setDrawerMenuFlag(false),[location.pathname])
  return (
    <header
      aria-label="header"
      className="nav-glass sticky left-0 top-0 z-40 w-full border-b border-slate-200/70 dark:border-white/10"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
       <span className="flex items-center gap-3" >
        <Logo setFetchTrigger={setFetchTrigger} />
        <button aria-label="toggle theme" onClickCapture={handleThemeChange(setTheme)} className={iconBtn} >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
       </span>
        <article className="relative flex flex-row items-center gap-3">

         <button onClick={(e)=>setDrawerMenuFlag(pre=>!pre)} className={`${iconBtn} sm:hidden`} >
         <Menu size={20} />
         </button>
         {drawerMenuFlag?<DrawerMenu  setUser={setUser} setDrawerMenuFlag={setDrawerMenuFlag} theme={theme} user={user} modalState={modalState} setModalState={setModalState}  setCourses={setCourses} />:null}
         <div className="hidden flex-row items-center gap-3 sm:flex sm:flex-row-reverse">
          {!JSON.parse(localStorage.getItem('user'))?.id? (
            <Link to="/signup" className={iconBtn}>
              <LogIn size={18} color={`${theme==='dark'?"white":'black'}`} cursor={"pointer"} />
            </Link>
          ) : (
            <>
            <Link to={`/user/${user.id}`} className={iconBtn}>
            <User size={18} color={`${theme==='dark'?"white":'black'}`} cursor={"pointer"} />
            </Link>
            <button aria-label="log out" title="Log out" onClick={handleLogout} className={iconBtn}>
              <LogOut size={18} />
            </button>
            </>
          )}
          <SearchForm
            modalState={modalState}
            setModalState={setModalState}
            setCourses={setCourses}
            />
            </div>
        </article>
      </nav>

    </header>
  );
};

export default Navbar;
