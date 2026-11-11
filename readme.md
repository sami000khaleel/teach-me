<div align="center">
🎓 TeachMe

A live-class platform in the browser: a teacher starts a video lesson, students join, and the teacher stays in control.

▶ Try the live demo  ·  Quick start  ·  How it works  ·  Run it locally

Show Image Show Image Show Image Show Image Show Image Show Image Show Image

<img src="docs/screenshots/02-teacher-room.png" alt="Teacher view of a live lesson" width="860"> </div>
What it is

TeachMe lets a teacher run a live video lesson for the students of a course. Students join from any modern browser, no install. The video goes directly between the browsers (WebRTC); the server only introduces them to each other. The teacher can hear or mute each student, stop their video, or remove them, and every lesson is logged for attendance reports.

Built end to end by me: React front end, Node.js back end, real-time signaling, authentication, and deployment.

⚡ Try it in 60 seconds

No sign-up, no passwords. The demo signs you in with one click.

Open the live demo. The free hosting sleeps when idle, so the first load can take up to a minute.
Turn your VPN off and allow the camera when asked (video calls usually don't work through a VPN).
Click "Try a demo video call" (bottom right). You are signed in as the teacher, taken to the lesson, and your camera starts. <img src="docs/screenshots/01-demo-button.png" alt="The Try a demo video call button" width="560">
Open the site again in a second window (a private/incognito window, another browser, or your phone). The button now says "Join the demo call as a student". Click it and allow the camera and microphone. <img src="docs/screenshots/03-student-view.png" alt="Student view" width="560">
Play with the controls: raise the student's hand, unmute the student from the teacher window, share the screen, stop the student's video, or remove them.

Tip: if you were given the link of a running lesson, just open it in a private window. TeachMe shows a "Join as a demo student" card.

📸 Screenshots
<table> <tr> <td><img src="docs/screenshots/02-teacher-room.png" alt="Teacher room"><br><sub><b>Teacher:</b> live lesson with every student's video</sub></td> <td><img src="docs/screenshots/04-teacher-controls.png" alt="Teacher controls"><br><sub><b>Teacher controls:</b> unmute, stop video, remove, raised hand</sub></td> </tr> <tr> <td><img src="docs/screenshots/03-student-view.png" alt="Student room"><br><sub><b>Student:</b> teacher's video, raise hand, chat</sub></td> <td><img src="docs/screenshots/05-reports.png" alt="Attendance report"><br><sub><b>Reports:</b> who attended and for how long</sub></td> </tr> </table>
✨ What you can do in the call
	Teacher	Student
Video & audio	Starts the lesson (camera starts by itself), switches camera	Sees and hears the teacher
Screen sharing	Shares a screen instead of the camera, live, for everyone	Sees the screen
Hear students	Unmute / mute any single student (students are muted by default)	Speaks only when the teacher allows it
Raise hand	Sees a badge and a banner on the student's tile	Raises or lowers the hand
Moderation	Stops one student's video, or removes a student (and can let them back in)	Is told what happened
Chat	Sees and answers messages	Writes messages
Attendance	Per-lesson reports with join and leave times	–
🧠 How it works
The big picture
Render: one free web service
Browsers
HTTPS + JWT
HTTPS + JWT
WebSocket + JWT
WebSocket + JWT
streams private images
🎥 video and audiopeer-to-peer (WebRTC)
👩‍🏫 TeacherReact app
🧑‍🎓 StudentsReact app
Express REST APIJWT + role checks
Socket.IOsignaling server
Serves the builtReact app
MySQL on Aivenusers, courses
MongoDBlessons, chat, attendance
Cloudflare R2profile pictures
STUN server(find public address)

The teacher keeps one WebRTC connection per student (a star, not a server in the middle). The server never touches the video; it only relays small signaling messages and enforces who is allowed to do what.

How a call is set up
Student's browser
MongoDB
Server (Express + Socket.IO)
Teacher's browser
Student's browser
MongoDB
Server (Express + Socket.IO)
Teacher's browser
new RTCPeerConnection for this student,
camera + microphone added
sets the offer, adds camera + muted microphone
Candidates that arrive before the answer is applied
are queued, then added (no "remote description was null" error)
🎥 Video and audio now flow directly between the two browsers
POST /create_lesson
1
save the lesson
2
ask-me-for-offer
3
ask-me-for-offer
4
request-offer
5
request-offer (which student)
6
teacher-offer (SDP)
7
teacher-offer
8
student-answer (SDP)
9
student-answer
10
ICE candidates (through the server)
11
ICE candidates (through the server)
12
What a student goes through

The teacher's choices are applied on the student's side and enforced on the teacher's side, so a tampered browser can't be heard or seen against the teacher's wishes.

opens the lesson link
teacher's offer arrives
teacher lets them back in
answer + ICE exchanged
teacher removes thestudent
teacher ends the lesson
Waiting
Connecting
Connected
teacher unmutes
teacher mutes
Muted
Speaking
teacher stops video
teacher allows video
VideoOn
VideoOff
Removed
🛠 Engineering highlights
Real-time signaling done carefully. The offer, answer, and ICE-candidate handshake runs over Socket.IO. Candidates that arrive early are queued until the remote description exists, which avoids a classic WebRTC race.
Live screen share without renegotiation. The camera track is swapped for the screen track with replaceTrack, including for students who join mid-share.
Server-enforced moderation. Mute, stop-video, and remove events are accepted only from the teacher who owns the lesson. A removed student gets no offers, answers, or candidates until let back in.
Authentication and security basics. bcrypt password hashing, signed JWTs (also checked in the Socket.IO handshake), role middleware, ownership checks on every teacher resource, per-IP rate limiting on login routes, Helmet headers, path-traversal protection on file routes.
Private image storage. Profile pictures live in a private Cloudflare R2 bucket and are streamed through the API, so no public bucket URL is needed and the free host's disk is never used.
One deployable. The Express server also serves the built React app, so the whole project runs as a single free Render service.
Privacy-minded analytics. A visit counter stores only a date in MongoDB (one per browser, bots skipped). A privacy notice explains this on first visit.

Honest limits: media is peer-to-peer from the teacher to every student, which suits classes of a handful of students (a larger class would need a media server). Only STUN is configured, no TURN relay, so some VPNs and strict corporate networks can block the call. Lecture PDF uploads are switched off in the demo because the free host's disk is temporary.

🧰 Tech stack
Area	Technology
Front end	React 18, Vite, Tailwind CSS, React Router, Axios, lucide-react
Real time	WebRTC (native RTCPeerConnection), Socket.IO
Back end	Node.js, Express, Helmet, Multer, Nodemailer
Data	MySQL (mysql2, hosted on Aiven), MongoDB (Mongoose)
Files	Cloudflare R2 (S3 API)
Auth	bcryptjs, JSON Web Tokens
Hosting	Render (free tier)
💻 Run it locally

The easiest way to evaluate TeachMe is the live demo. A local run needs your own databases, and the MySQL table definitions are not part of this repository.

You need Node.js 20+, a MySQL database with the TeachMe tables, and a MongoDB database (a free Atlas cluster works).

bash
# 1. Install and build the front end (it is copied into server/dist)
cd client
npm install
node build.js

# 2. Configure and start the server
cd ../server
npm install
cp .env.example .env        # then fill it in (see below)
npm start                   # http://localhost:3000

Environment variables (server/.env, see .env.example for comments):

Variable	Purpose
JWT_SECRET	Required. Long random string (32+ characters) used to sign tokens
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME	MySQL connection
DB_CA	MySQL CA certificate text (needed for Aiven)
MONGO_URI (or MONGO_CLUSTER, MONGO_USER, MONGO_PASSWORD, MONGO_DB)	MongoDB connection
CLIENT_ORIGIN	Your site's address, for CORS
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET	Cloudflare R2 for profile pictures
GMAIL_USER, GMAIL_APP_PASSWORD	Optional: sends account-recovery emails

Accounts: teachers have no sign-up page, so they are created with a script (students sign up in the app):

bash
cd server
node scripts/create-account.js teacher "Ada" "Lovelace" ada@example.com "a-strong-password"
node scripts/seed-demo.js   # optional: the demo teacher, demo student and demo course used by the live demo
📁 Project layout
client/                      React + Vite + Tailwind
  src/pages/Room.jsx           the live room: WebRTC, screen share, controls
  src/Components/DemoGuide/    one-click demo and "join as student" cards
server/
  index.js                     Express app, security headers, serves the client
  socketHandler.js             signaling + classroom controls (raise hand, mute, remove)
  controllers/, routes/        REST API for teachers and students
  middleware/auth.js           JWT + role checks
  config/r2.js                 private image storage on Cloudflare R2
  models/                      MySQL access and Mongoose models
  scripts/                     seed-demo.js, create-account.js
<div align="center">

Built by Sami  ·  LinkedIn  ·  Portfolio

</div>
