import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/api";

// ---- fixed demo values (kept simple on purpose) ----
const COURSE_ID = 108;
const TEACHER = { email: "samihellstrong@gmail.com", password: "242" };
const STUDENT = { email: "sami000khaleel@gmail.com", password: "242" };
const ROOM = `/room/${COURSE_ID}?demo=true`;
const THREE_HOURS = 3 * 60 * 60 * 1000;

const DemoGuide = ({ user, setUser }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [teacherIsLive, setTeacherIsLive] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hintClosed, setHintClosed] = useState(false);
  const [copied, setCopied] = useState(false);

  const loggedIn = Boolean(user?.id);
  const inRoom = pathname.startsWith("/room/");

  // Is a teacher currently in a call of the demo course? (asked to the server every 8 s)
  useEffect(() => {
    if (loggedIn) return;
    let stop = false;
    const check = async () => {
      try {
        const { data } = await axios.get(
          `/api/student/request_call?courseId=${COURSE_ID}`
        );
        // ignore calls that were left "ongoing" long ago (teacher closed the tab)
        const fresh = Date.now() - new Date(data.createdAt).getTime() < THREE_HOURS;
        if (!stop) setTeacherIsLive(fresh);
      } catch (_) {
        if (!stop) setTeacherIsLive(false); // 404 = no call right now
      }
    };
    check();
    const timer = setInterval(check, 8000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [loggedIn]);

  // sign in exactly like the normal login form does: save to localStorage + state
  const signIn = async (role) => {
    setBusy(true);
    setError("");
    try {
      const login = role === "teacher" ? api.loginTeacher : api.loginStudent;
      const { data } = await login(role === "teacher" ? TEACHER : STUDENT);
      const newUser = { ...data, role };
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser({ ...newUser, code: "" });
      // App opens the socket right after the user is set; the room needs it when it mounts
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate(ROOM);
    } catch (err) {
      setError(err?.response?.data?.message || "demo login failed");
    }
    setBusy(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch (_) {}
  };

  // 1) visitor not signed in → floating button
  if (!loggedIn && !inRoom)
    return (
      <div className="fixed right-4 top-20 z-40 max-w-[16rem] text-right">
        <button
          className="btn-primary shadow-glow"
          disabled={busy}
          onClick={() => signIn(teacherIsLive ? "student" : "teacher")}
        >
          {teacherIsLive
            ? "Join the demo call as a student"
            : "Try a demo video call"}
        </button>
        {error ? (
          <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
        ) : null}
      </div>
    );

  // 2) demo teacher inside the room → tell him what to do next
  if (user?.email === TEACHER.email && user?.role === "teacher" && inRoom && !hintClosed)
    return (
      <div className="fixed left-1/2 top-20 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        <div className="surface p-4 text-sm shadow-soft">
          <p className="font-semibold text-slate-900 dark:text-white">
            You are the teacher 👩‍🏫
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>Start the lesson in this window.</li>
            <li>
              Open an <b>incognito window</b> (Ctrl+Shift+N, or Cmd+Shift+N on
              Mac) and go to this site.
            </li>
            <li>
              There, click <b>“Join the demo call as a student”</b>.
            </li>
          </ol>
          <div className="mt-3 flex gap-2">
            <button className="btn-secondary btn-sm" onClick={copyLink}>
              {copied ? "Link copied ✓" : "Copy site link"}
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setHintClosed(true)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );

  return null;
};

export default DemoGuide;
