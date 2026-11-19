import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { Video, VideoOff, Mic, MicOff, Send, Cookie } from "lucide-react";
import Messages from "../Components/Messages/Messages";
import Cookies from "js-cookies";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

let studentStream;
let teacherStream;
let pc;
const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 1,
};

const Room = () => {
  // ============================================================
  // Route params & query — MUST be declared BEFORE any usage
  // ============================================================
  const { courseId } = useParams();
  const query = useQuery();
  const [callId, setCallId] = useState(null);

  // 🆕 Demo mode flag (uses query → must come after query)
  const isDemo = query.get("demo") === "true";

  // ============================================================
  // User & context
  // ============================================================
  const user = JSON.parse(localStorage.getItem("user"));
  let { socket, setModalState, modalState } = useOutletContext();

  // ============================================================
  // Component state
  // ============================================================
  const [flag, setFlag] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [requestCallFlag, setRequestCallFlag] = useState(false);
  const [callStartedFlag, setCallStartedFlag] = useState(false);
  const [isMutedFlag, setIsMutedFlag] = useState(false);
  const [teacherState, setTeacherState] = useState("offline");
  const [students, setStudents] = useState([]);
  const [fps, setFps] = useState(2);
  const [gotStudentsFlag, setGotStudentsFlag] = useState(false);
  const [studentAttendenceObservation, setStudentAttendenceObservation] =
    useState(null);
  const [teacherConnection, setTeacherConnection] = useState({
    connected: false,
    streamStopped: false,
  });
  const [message, setMessage] = useState({
    studentId: String(user?.id),
    studentName: `${user?.firstname} ${user?.lastname}`,
    studentImage: user?.imageUrl,
    content: "",
  });
  const [remove, setRemove] = useState(false);
  const [messages, setMessages] = useState([]);

  // ============================================================
  // Refs
  // ============================================================
  let teacherTimeOut = useRef();
  let timeOutes = useRef({});
  let peersConnections = useRef({});
  let teacherVideoRef = useRef();
  let studentVideoRef = useRef();

  // ============================================================
  // Camera helpers
  // ============================================================
  const getAvailableCameras = async () => {
    try {
      // temporary stream, only to get permission (device names stay hidden without it)
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      tempStream.getTracks().forEach((t) => t.stop()); // do not leave a second camera open
      let cameras = devices.filter((device) => device.kind === "videoinput");
      setCameras(cameras);
      setSelectedCamera(cameras[0].deviceId);
      return cameras;
    } catch (err) {
      console.log(err);
    }
  };

  const updateTeacherStream = async (deviceId) => {
    try {
      const constraints = {
        video: { deviceId: { exact: deviceId } },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      teacherVideoRef.current.srcObject = stream;

      for (const key in peersConnections.current) {
        const peerConnection = peersConnections.current[key];
        peerConnection.getSenders().forEach((sender) => {
          if (sender.track.kind === "video") {
            sender.replaceTrack(stream.getVideoTracks()[0]);
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // Students list
  // ============================================================
  function updateStudents(updatedStudent) {
    const updatedStudents = students.map((student) =>
      student.id_stu === updatedStudent.id_stu ? updatedStudent : student
    );
    const onlineStudents = updatedStudents.filter(
      (student) => student.state !== "offline"
    );
    const offlineStudents = updatedStudents.filter(
      (student) => student.state === "offline"
    );
    setStudents([...onlineStudents, ...offlineStudents]);
  }

  async function getStudents(flag) {
    try {
      const { data } = await axios.get(
        `/api/student/get_students_by_course?courseId=${courseId}`
      );
      if (!data.length) throw new Error("no students were found");

      const studentsWithRefs = data.map((student) => ({
        ...student,
        studentRef: React.createRef(),
        state: "offline",
        warning: "",
      }));
      if (flag) setGotStudentsFlag((pre) => !pre);
      console.log("got students", data.length);
      setStudents(studentsWithRefs);
    } catch (error) {
      console.log(error);
    }
  }

  // ============================================================
  // Media stream helpers
  // ============================================================
  const initializeStudentStream = async () => {
    try {
      studentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (studentVideoRef.current) {
        studentVideoRef.current.srcObject = studentStream;
      }
      return studentStream;
    } catch (err) {
      console.error("Error accessing student media devices:", err);
      return null; // ✅ explicit null
    }
  };

  const initializeTeacherStream = async (deviceId) => {
    try {
      const constraints = {
        video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      teacherVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Error accessing teacher media devices:", err);
      return null;
    }
  };

  // ============================================================
  // Call creation & WebRTC signaling (teacher)
  // ============================================================
  async function createCall() {
    if (user.role !== "teacher") return null;
    const { data } = await axios.post(
      `/api/teacher/create_lesson`,
      { courseId }
    );
    return data;
  }

  const teacherMakeCall = async () => {
    try {
      if (user.role != "teacher") return;

      const call = await createCall();
      if (!call) return;
      setCallId(call._id);
      if (!students.length) await getStudents(true);
      const teacherStream = await initializeTeacherStream(selectedCamera);

      if (!teacherStream) return;
      setCallStartedFlag(true);
      socket.emit("ask-me-for-offer", { callId: call._id });

      socket.on("request-offer", async ({ studentId }) => {
        console.log("teacher was asked for offer", studentId);

        peersConnections[String(studentId)] =
          new RTCPeerConnection(configuration);

        peersConnections[String(studentId)]?.addEventListener(
          "connectionstatechange",
          (event) => {
            switch (peersConnections[String(studentId)]?.connectionState) {
              case "new":
              case "connecting":
                console.log("Connecting…");
                break;
              case "connected":
                let stu = students.find((st) => st.id_stu == studentId);
                if (stu) {
                  stu = {
                    ...stu,
                    state: peersConnections[String(studentId)].connectionState,
                  };
                  updateStudents(stu);
                  socket.emit("student-joined-call", {
                    studentId,
                    callId: call._id,
                  });
                }
                setFlag((pre) => !pre);
                console.log("Online");
                break;
              case "disconnected": {
                console.log("Disconnecting…");
                let stu = students.find((st) => st.id_stu == studentId);
                if (stu) {
                  stu = {
                    ...stu,
                    state: peersConnections[String(studentId)].connectionState,
                  };
                  updateStudents(stu);
                }
                setFlag((pre) => !pre);
                peersConnections[String(studentId)].close();
                peersConnections[String(studentId)] = null;
                socket.emit("student-out", { studentId, callId: call._id });
                break;
              }
              case "closed": {
                console.log("Offline");
                let stu = students.find((st) => st.id_stu == studentId);
                if (stu) {
                  stu = {
                    ...stu,
                    state:
                      peersConnections[String(studentId)]?.connectionState,
                  };
                  updateStudents(stu);
                }
                setFlag((pre) => !pre);
                peersConnections[String(studentId)].close();
                break;
              }
              case "failed": {
                console.log("Error");
                let stu = students.find((st) => st.id_stu == studentId);
                if (stu) {
                  stu = {
                    ...stu,
                    state: peersConnections[String(studentId)].connectionState,
                  };
                  updateStudents(stu);
                }
                setFlag((pre) => !pre);
                peersConnections[String(studentId)].close();
                break;
              }
              default:
                console.log("Unknown");
                break;
            }
          },
          false
        );

        teacherStream.getTracks().forEach((track) => {
          peersConnections[String(studentId)].addTrack(track, teacherStream);
        });

        peersConnections[String(studentId)].onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("teacher-candidate", {
              teacherId: user.id,
              callId: call._id,
              candidate: e.candidate,
            });
            console.log("candidate was sent");
          }
        };

        const offer = await peersConnections[String(studentId)].createOffer();
        await peersConnections[String(studentId)]
          .setLocalDescription(offer)
          .catch((err) => console.log(err));

        socket.emit("teacher-offer", { callId: call._id, offer });

        socket.on("student-answer", async ({ answer, studentId }) => {
          console.log("got student answer");
          let student = students.find((student) => student.id_stu == studentId);
          if (!student) return;
          peersConnections[String(student.id_stu)].ontrack = (e) => {
            if (student.studentRef.current) {
              student.studentRef.current.srcObject = e.streams[0];
            }
            console.log("got student track");
            student.connected = true;
            student.streamStopped = false;
            updateStudents(student);
            setStudents(students);
          };
          await peersConnections[String(student.id_stu)]
            .setRemoteDescription(answer)
            .catch((err) => console.log(err));
          console.log("student answer was set");
        });

        socket.on("student-candidate", async ({ candidate, studentId }) => {
          console.log("got student candidate");
          if (!peersConnections[String(studentId)]) {
            console.log("no answers yet");
            return;
          }
          await peersConnections[String(studentId)]
            .addIceCandidate(candidate)
            .catch((err) => console.log(err));
          console.log("student candidate was set");
        });
      });
    } catch (error) {
      console.log(error);
    }
  };

  // ============================================================
  // WebRTC signaling (student)
  // ============================================================
  const handleTeacherOffer = async (data) => {
    try {
      setCallId(data._id);
      pc = new RTCPeerConnection(configuration);

      pc.addEventListener(
        "connectionstatechange",
        async (event) => {
          switch (pc.connectionState) {
            case "new":
            case "connecting":
              console.log("Connecting…");
              break;
            case "connected": {
              setRequestCallFlag(false);
              console.log("Online");
              break;
            }
            case "disconnected":
              setTeacherState("disconnected");
              console.log("Disconnecting…");
              if (teacherVideoRef.current?.srcObject) {
                teacherVideoRef.current.srcObject
                  .getTracks()
                  .forEach((t) => t.stop());
              }
              setRequestCallFlag(true);
              break;

            case "closed":
              if (teacherVideoRef.current?.srcObject) {
                teacherVideoRef.current.srcObject
                  .getTracks()
                  .forEach((t) => t.stop());
              }
              pc.close();
              pc = null;
              setRequestCallFlag(true);
              console.log("Offline");
              break;

            case "failed":
              console.log("Error");
              if (teacherVideoRef.current?.srcObject) {
                teacherVideoRef.current.srcObject
                  .getTracks()
                  .forEach((t) => t.stop());
              }
              pc.close();
              pc = null;
              setRequestCallFlag(true);
              break;

            default:
              console.log("Unknown");
              break;
          }
          if (pc) {
            setTeacherState(pc.connectionState);
            if (pc.connectionState == "connecting")
              setTeacherConnection("ask for connection");
          }
        },
        false
      );

      pc.ontrack = (e) => {
        teacherVideoRef.current.srcObject = e.streams[0];
        console.log("got teacher tracks");
      };

      await pc.setRemoteDescription(data.offer);
      console.log("teacher offer was set");

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("student-candidate", {
            callId: data._id,
            candidate: e.candidate,
          });
        }
      };

      // ✅ FIX: Check the stream before using it
      const localStream = await initializeStudentStream();

      if (!localStream) {
        console.error(
          "Cannot answer the teacher's offer — no local camera stream available."
        );
        setModalState({
          message:
            "Could not access your camera. Please allow camera permissions and refresh the page.",
          status: 400,
          errorFlag: true,
          hideFlag: false,
        });
        return;
      }

      localStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStream));

      let answer;
      answer = await pc.createAnswer().catch((err) => console.log(err));
      await pc.setLocalDescription(answer);

      socket.emit("student-answer", {
        callId: data._id,
        answer,
      });

      if (data?.teacherCandidate) {
        data.candidate = data.teacherCandidate;
      }
      await pc.addIceCandidate(data.candidate);
    } catch (err) {
      console.error("Error handling teacher offer:", err);
    }
  };

  // ============================================================
  // Main effect — socket setup
  // ============================================================
  useEffect(() => {
    getStudents(false);
    if (socket) {
      if (user.role == "student") {
        let CookieFps = Cookies.getItem("fps");
        if (CookieFps) setFps(CookieFps);
        if (!CookieFps) Cookies.setItem("fps", fps);

        const requestCall = async () => {
          try {
            const { data } = await axios.get(
              `/api/student/request_call?courseId=${courseId}`
            );
            setCallId(data._id);
            socket.emit("request-offer", { callId: data._id });
          } catch (err) {
            // In demo mode, no call may be ongoing yet — don't error
            if (isDemo) {
              console.log("Demo mode: waiting for teacher to start the call");
              return;
            }
            console.error("Error requesting call:", err);
          }
        };

        requestCall();

        socket.on("teacher-end-call", ({ callId }) => {
          if (pc) {
            pc.close();
            pc = null;
            console.log("student-closed-the-pc");
            setTeacherState("offline");
          }
        });

        socket.on("ask-me-for-offer", async ({ callId }) => {
          console.log("time to ask for offer");
          setRequestCallFlag(true);
          socket.emit("request-offer", { callId });
        });

        socket.on("teacher-offer", async ({ offer, callId }) => {
          try {
            if (pc?.connectionState == "connected") return;
            if (pc) {
              pc.close();
              pc = null;
            }
            socket.emit("request-messages", { callId });
            console.log("got teacher offer");
            await handleTeacherOffer({ offer, _id: callId });
          } catch (err) {
            console.error("Error handling teacher offer:", err);
          }
        });

        socket.on("teacher-candidate", async ({ candidate }) => {
          if (pc?.connectionState == "connected") return;
          if (!pc) {
            console.log("No peer connection to handle candidate");
            return;
          }
          try {
            console.log("got teacher candidate");
            await pc
              .addIceCandidate(candidate)
              .catch((err) => console.log(err));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        socket.on("teacher-disconnected", ({ teacherId }) => {
          if (!pc) return;
          pc.close();
          pc = null;
          setTeacherConnection("offline");
        });
      }

      socket.on("warning", async ({ warning }) => {
        setModalState({
          message: warning,
          status: 200,
          errorFlag: false,
          warningFlag: true,
          hideFlag: false,
        });
      });

      socket.on("recieve-messages", ({ messages }) => {
        setMessages(messages);
      });

      socket.on("message", ({ message }) => {
        setMessages((prev) => [...prev, message]);
      });

      socket.emit("request-messages", { callId });
    }

    return () => {
      console.log("out");
      if (socket) {
        socket.off("message");
        socket.emit("student-exit-call");
        socket.off("no-call");
        socket.off("student-candidate");
        socket.off("student-answer");
        socket.off("teacher-offer");
        socket.off("teacher-candidate");
        socket.off("teacher-disconnect");
        socket.off("student-disconnect");
      }

      if (Object.keys(peersConnections).length && user.role == "teacher") {
        let keys = Object.keys(peersConnections);
        if (keys?.length)
          for (let key of keys) {
            if (peersConnections[key] && key != "current")
              peersConnections[key].close();
          }
      }

      if (pc) {
        pc.close();
        if (user.role == "teacher") socket.emit("teacher-end-call", { callId });
      }
    };
  }, [socket]);

  // ============================================================
  // Call controls
  // ============================================================
  async function endCall() {
    for (let key in peersConnections) {
      if (peersConnections[key]?.connectionState) {
        peersConnections[key].close();
        peersConnections[key] = null;
      }
      socket.emit("teacher-end-call", { callId });
    }
    if (teacherVideoRef.current?.srcObject) {
      teacherVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    setCallStartedFlag(false);
  }

  const toggleSound = () => {
    if (!teacherVideoRef.current.srcObject) return;
    teacherVideoRef.current.srcObject.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMutedFlag((prev) => !prev);
  };

  // ============================================================
  // Effects
  // ============================================================
  useEffect(() => {
    if (user?.role != "teacher") return;
    getAvailableCameras();
  }, []);

  // The teacher's camera (and the call) start by themselves when the room opens.
  // (the room only shows the video when the course has students, so check that first)
  useEffect(() => {
    if (user?.role != "teacher" || !socket) return;
    axios
      .get(`/api/student/get_students_by_course?courseId=${courseId}`)
      .then(({ data }) => {
        if (data.length) teacherMakeCall();
      })
      .catch((err) => console.log(err));
  }, []);

  // ============================================================
  // Draggable student video
  // ============================================================
  const [isDragging, setIsDragging] = useState(false);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [yOff, setYOff] = useState(0);
  const [xOff, setXOff] = useState(0);
  const [savedY, setsavedY] = useState(0);
  const [savedX, setSavedX] = useState(0);

  const handleMouseDown = (event) => {
    setIsDragging(true);
    setX(event.clientX);
    setY(event.clientY);
  };

  const handleMouseMove = (event) => {
    if (isDragging) {
      setXOff(savedX + (event.clientX - x));
      setYOff(savedY + (event.clientY - y));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (!studentVideoRef.current) return;
    const rect = studentVideoRef.current.getBoundingClientRect();
    setSavedX(rect.left);
    setsavedY(rect.top);
  };

  useEffect(() => {
    if (user.role == "teacher") return;
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // ============================================================
  // Render
  // ============================================================
  if (socket && user?.id)
    return (
      <div>
        {user.role === "teacher" ? (
          <div className="absolute left-4 top-24 z-30">
            <button
              className="btn-secondary shadow-soft"
              onClick={() => setShowCameraMenu((prev) => !prev)}
            >
              Switch Camera
            </button>
            {showCameraMenu && (
              <div className="absolute left-0 top-12 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-ink-800">
                <ul>
                  {cameras.map((camera) => (
                    <li
                      key={camera.deviceId}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 ${
                        camera.deviceId === selectedCamera
                          ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/[0.15] dark:text-brand-300"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedCamera(camera.deviceId);
                        updateTeacherStream(camera.deviceId);
                        setShowCameraMenu(false);
                      }}
                    >
                      {camera.label || `Camera ${camera.deviceId}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {user.role == "student" || students.length ? (
          <section
            id="room"
            className="relative flex w-full flex-col items-center justify-center px-4 pb-28 pt-36"
          >
            {user.role == "student" ? (
              <div className="fixed bottom-4 left-4 z-30 flex flex-col items-start justify-center gap-2">
                <div className="rounded-full bg-slate-900/[0.85] px-3 py-1 text-center text-xs font-semibold capitalize text-white empty:hidden">
                  {teacherState == "offline" ? null : teacherState}
                </div>
                {pc &&
                teacherState != "connected" &&
                teacherState != "disconnected" ? (
                  <button
                    className="btn bg-emerald-500 text-white shadow-lg hover:bg-emerald-600"
                    onClick={() => {
                      if (pc) pc.close();
                      pc = null;
                      socket.emit("request-offer", { callId });
                    }}
                  >
                    connect
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="relative flex w-full max-w-3xl flex-col">
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-black/10 dark:ring-white/10">
                <video
                  ref={teacherVideoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  playsInline
                ></video>
              </div>
              {user.role == "teacher" ? (
                <div className="mt-4 flex flex-row items-center justify-center gap-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      !callStartedFlag ? teacherMakeCall() : endCall();
                    }}
                    className={`grid h-12 w-12 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 ${
                      !callStartedFlag ? "bg-brand-600" : "bg-red-500"
                    }`}
                  >
                    {!callStartedFlag ? (
                      <Video size={22} />
                    ) : (
                      <VideoOff size={22} />
                    )}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSound();
                    }}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:scale-105 dark:bg-ink-700 dark:text-white dark:ring-white/10"
                  >
                    {isMutedFlag ? <Mic size={22} /> : <MicOff size={22} />}
                  </button>
                </div>
              ) : null}

              {students.length && user.role == "teacher" ? (
                <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                  {students.map((student) => (
                    <div
                      key={student.id_stu}
                      className="surface flex w-full flex-row items-center gap-4 p-3"
                    >
                      <img
                        className="aspect-square w-14 shrink-0 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-500/30"
                        src={student.image_url}
                        alt={`${student.first_name_stu} ${student.last_name_stu}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {student.first_name_stu} {student.last_name_stu}
                        </h1>
                        <h1 className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {peersConnections[String(student.id_stu)]
                            ?.connectionState || "offline"}
                        </h1>
                      </div>
                      <video
                        playsInline
                        autoPlay
                        ref={student.studentRef}
                        className="aspect-video w-28 shrink-0 rounded-lg bg-black"
                      ></video>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {user.role == "student" ? (
              <div
                onPointerDown={handleMouseDown}
                onPointerMove={handleMouseMove}
                onPointerUp={handleMouseUp}
                style={{
                  touchAction: "none",
                  background:
                    studentAttendenceObservation != "ready"
                      ? "#4f46e5"
                      : studentAttendenceObservation == "attentive"
                      ? "#059669"
                      : "#dc2626",
                  top: yOff,
                  left: xOff,
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
                className="fixed z-30 flex aspect-[4/5] max-w-[180px] cursor-grab flex-col items-center justify-between p-3 text-white opacity-95 shadow-2xl ring-1 ring-white/20 active:cursor-grabbing"
              >
                <video
                  playsInline
                  autoPlay
                  ref={studentVideoRef}
                  className="aspect-square w-[150px] rounded-xl bg-black object-cover"
                ></video>
                <h1 className="flex flex-row flex-wrap items-end justify-center text-center text-sm font-semibold text-white">
                  {!studentAttendenceObservation
                    ? "ready"
                    : studentAttendenceObservation}
                </h1>
              </div>
            ) : null}

            <Messages
              pc={pc}
              callId={callId}
              setMessage={setMessage}
              message={message}
              messages={messages}
              socket={socket}
            />
          </section>
        ) : null}
      </div>
    );
};

export default Room;
