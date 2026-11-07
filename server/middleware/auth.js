// ===================================================================
// JWT authentication
//   • signToken(role, id)      → signed token (7 days)
//   • requireAuth([role])      → Express middleware, sets req.user = { id, role }
//   • verifyToken(token)       → used by Socket.IO
//   • publicUser(role, row)    → the ONLY shape of a user that leaves the server
//                                (never contains the password / hash)
//
// Required env var:  JWT_SECRET  (long random string, e.g. 48+ chars)
//   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
// ===================================================================
require("dotenv").config();
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error("❌ JWT_SECRET is missing or too short (use at least 32 characters)");
  process.exit(1);
}

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(role, id) {
  return jwt.sign({ role }, SECRET, {
    subject: String(id),
    expiresIn: EXPIRES_IN,
    algorithm: "HS256",
  });
}

// Returns { id, role } or throws
function verifyToken(token) {
  const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || !["student", "teacher"].includes(payload.role)) {
    throw new Error("malformed token");
  }
  return { id, role: payload.role };
}

function requireAuth(role) {
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "authentication required" });
    }
    let user;
    try {
      user = verifyToken(token);
    } catch (_) {
      return res.status(401).json({ message: "invalid or expired token" });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ message: "you are not allowed to do this" });
    }
    req.user = user;
    next();
  };
}

// Normalised user object sent to the client (both roles share one shape)
function publicUser(role, row) {
  if (role === "teacher") {
    return {
      id: row.id_teacher,
      firstname: row.first_name,
      lastname: row.last_name,
      email: row.email,
      imageUrl: "",
      role: "teacher",
    };
  }
  return {
    id: row.id_stu,
    firstname: row.first_name_stu,
    lastname: row.last_name_stu,
    email: row.email_stu,
    imageUrl: row.image_url ? `/api/student/get_student_image?id_student=${row.id_stu}` : "",
    role: "student",
  };
}

// { ...publicUser, token } — what login / signup / recovery respond with
function authResponse(role, row) {
  const user = publicUser(role, row);
  return { ...user, token: signToken(role, user.id) };
}

module.exports = { signToken, verifyToken, requireAuth, publicUser, authResponse };
