import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { Radio, Video } from "lucide-react";
import api from "../../api/api";

// ---- fixed demo values (kept simple on purpose) ----
const COURSE_ID = 108;
const TEACHER = { email: "samihellstrong@gmail.com", password: "242" };
const STUDENT = { email: "sami000khaleel@gmail.com", password: "242" };
const ROOM = `/room/${COURSE_ID}?demo=true`;
const THREE_HOURS = 3 * 60 * 60 * 1000;

export const DEMO_ROOM_PATH = `/room/${COURSE_ID}`;

// Signs in as the demo teacher / student exactly like the login form:
// asks the server, saves the session in localStorage, returns it.
async function demoLogin(role) {
  const login = role === "teacher" ? api.loginTeacher : api.loginStudent;
  const { data } = await login(role === "teacher" ? TEACHER : STUDENT);
  const newUser = { ...data, role };
  localStorage.setItem("user", JSON.stringify(newUser));
  return newUser;
}

// Is the user already signed in with one of the two demo accounts?
const isDemoUser = (u) =>
  (u?.role === "teacher" && u?.email === TEACHER.email) ||
  (u?.role === "student" && u?.email === STUDENT.email);

// ---- "is a teacher live in the demo course right now?" ----
// One shared check every 8 s, however many demo buttons are on the page.
const live = { value: false, subs: new Set(), timer: null };

async function checkLive() {
  let value = false;
  try {
    const { data } = await axios.get(`/api/student/request_call?courseId=${COURSE_ID}`);
    // ignore calls that were left "ongoing" long ago (teacher closed the tab)
    value = Date.now() - new Date(data.createdAt).getTime() < THREE_HOURS;
  } catch (_) {
    value = false; // 404 = no call right now
  }
  live.value = value;
  live.subs.forEach((notify) => notify(value));
}

function useTeacherIsLive() {
  const [value, setValue] = useState(live.value);
  useEffect(() => {
    live.subs.add(setValue);
    if (!live.timer) {
      checkLive();
      live.timer = setInterval(checkLive, 8000);
    }
    return () => {
      live.subs.delete(setValue);
      if (!live.subs.size) {
        clearInterval(live.timer);
        live.timer = null;
      }
    };
  }, []);
  return value;
}

// Everything a demo button needs: what it says, and what happens on click.
// - signed in with a demo account  → straight into the room
// - anybody else                    → signed in as the demo teacher (or as the demo
//                                      student when a teacher is already live), then the room
export function useDemoCall(user, setUser) {
  const navigate = useNavigate();
  const teacherIsLive = useTeacherIsLive();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setError("");
    if (isDemoUser(user)) return navigate(ROOM);
    setBusy(true);
    try {
      const newUser = await demoLogin(teacherIsLive ? "student" : "teacher");
      setUser({ ...newUser, code: "" });
      navigate(ROOM);
    } catch (err) {
      setError(err?.response?.data?.message || "demo login failed");
    }
    setBusy(false);
  };

  let label = teacherIsLive ? "Join the demo call as a student" : "Try a demo video call";
  if (isDemoUser(user))
    label = user.role === "teacher" ? "Open your demo class" : "Join the demo class";
  let hint = teacherIsLive ? "A lesson is live right now" : "1 click · no sign-up";
  if (isDemoUser(user)) hint = "Straight into the video call";

  return { start, busy, error, label, hint, teacherIsLive };
}

// The glowing demo button (used floating in the corner and in the home page hero).
export const DemoCallButton = ({ user, setUser, large = false }) => {
  const { start, busy, error, label, hint, teacherIsLive } = useDemoCall(user, setUser);
  return (
    <div className="flex flex-col items-end">
      <button
        className={`btn-demo gap-3 text-left ${large ? "px-6 py-4 text-base" : "px-3 py-2.5 sm:px-4 sm:py-3"}`}
        disabled={busy}
        onClick={start}
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-inset ring-white/30">
          {teacherIsLive ? <Radio size={20} /> : <Video size={20} />}
          {teacherIsLive ? (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
          ) : null}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-bold">{busy ? "Opening the call…" : label}</span>
          <span className={`mt-0.5 text-xs font-medium text-white/80 ${large ? "" : "hidden sm:block"}`}>{hint}</span>
        </span>
      </button>
      {error ? (
        <p className="mt-2 max-w-[16rem] rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
};

// Shown instead of the room when someone who is NOT signed in opens the room link
// (for example a reviewer pasting the link in an incognito window).
export const RoomJoinCard = ({ setUser }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      const newUser = await demoLogin("student");
      navigate(ROOM, { replace: true }); // makes sure the link has ?demo=true
      setUser({ ...newUser, code: "" }); // the room opens as soon as the user is set
    } catch (err) {
      setError(err?.response?.data?.message || "could not join the demo call");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 pt-24">
      <div className="surface w-full max-w-md p-8 text-center shadow-soft">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Live demo class
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          You opened the link of a live video call. Join as a demo student to
          watch the lesson. If the teacher has not started yet, you will wait in
          the room and the video appears when they do.
        </p>
        <button className="btn-primary mt-6" disabled={busy} onClick={join}>
          {busy ? "Joining…" : "Join the call as a student"}
        </button>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
        ) : null}
      </div>
    </div>
  );
};

const DemoGuide = ({ user, setUser }) => {
  const { pathname } = useLocation();
  const [hintClosed, setHintClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const inRoom = pathname.startsWith("/room/");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch (_) {}
  };

  // 1) everywhere except inside the call → the floating, glowing demo button
  if (!inRoom)
    return (
      <div className="demo-float fixed bottom-5 right-5 z-40 sm:bottom-8 sm:right-8">
        <DemoCallButton user={user} setUser={setUser} />
      </div>
    );

  // 2) demo teacher inside the room → tell him what to do next
  if (user?.email === TEACHER.email && user?.role === "teacher" && !hintClosed)
    return (
      <div className="fixed left-1/2 top-20 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        <div className="surface p-4 text-sm shadow-soft">
          <p className="font-semibold text-slate-900 dark:text-white">
            You are the teacher 👩‍🏫
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>Your camera and the lesson start by themselves.</li>
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
