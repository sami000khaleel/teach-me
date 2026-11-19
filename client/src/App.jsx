import React, { useRef, useEffect, useState } from "react";
import Cookies from "js-cookies";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./index.css";
import { EMPTY_USER } from "./auth";
import ModalPopup from "./Components/ModalPopup/ModalPopup";
import { handleThemeInit } from "./App";
import Navbar from "./Components/Navbar/Navbar";
import PrivacyNotice from "./Components/PrivacyNotice/PrivacyNotice";
import DemoGuide from "./Components/DemoGuide/DemoGuide";
import { io } from "socket.io-client";

import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon } from "lucide-react";
let user = JSON.parse(localStorage.getItem("user"));
let socket;

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState({});

  const [modalState, setModalState] = useState({
    message: "",
    status: "",
    warningFlag: false,
    errorFlag: false,
    hideFlag: true,
  });
  const [theme, setTheme] = useState("");

  const [fetchTrigger,setFetchTrigger]=useState(false)
  const [user, setUser] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (stored?.id && stored?.token) return stored;
    // an old session from before token login (it held the password): drop it
    if (stored?.id) localStorage.removeItem("user");
    return { ...EMPTY_USER };
  });
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    handleThemeInit(setTheme);
    if (location.pathname == "/") navigate("/home");
  },[]);
  useEffect(() => {
    if (user?.role && user?.token) {
      socket = io.connect(`/`, {
        auth: { token: user.token },
      });

      // if (user.role == "student") {
      //   socket.on("teacher-candidate", async ({ offer, callId, courseId }) => {
      //     if (window.location.pathname.includes("room")) return;
      //     const res = window.confirm(
      //       "a lesson is being conducted would you like to join ? "
      //     );
      //     if (res) navigate(`/room/${courseId}?callOnGoing=yes`);
      //     else {
      //       console.log("a");
      //     }
      //   });
      // }
    }
    return () => {
      socket?.disconnect();
    };
  }, [user.id]);

  return (
    <main className="app-bg relative min-h-screen w-full text-slate-800 dark:text-slate-200">
      {!modalState.hideFlag ? (
        <ModalPopup setModalState={setModalState} modalState={modalState} />
      ) : null}

      <Navbar
        setFetchTrigger={setFetchTrigger}
        theme={theme}
        setTheme={setTheme}
        user={user}
        setCourses={setCourses}
        modalState={modalState}
        setModalState={setModalState}
        setUser={setUser}
      />
      <Outlet
        context={{
          fetchTrigger,
          socket,
          modalState,
          setModalState,
          setTheme,
          user,
          setUser,
          courses,
          setCourses,
          course,
          setCourse,
          students,
          setStudents,
        }}
      />
      <PrivacyNotice />
      <DemoGuide user={user} setUser={setUser} />
    </main>
  );
};

export default App;
