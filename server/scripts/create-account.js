// Creates (or resets the password of) a TEACHER or STUDENT account with a bcrypt-hashed password.
// Teachers have no signup page, so this is how you create them.
//
//   node scripts/create-account.js teacher "Demo" "Teacher" demo.teacher@teachme.app "YourPassword1"
//   node scripts/create-account.js student "Demo" "Student" demo.student@teachme.app "YourPassword1"
//
// Needs the same .env as the server (DB settings). Run db/09_auth_migration.sql first.
require("dotenv").config();
const executeQuery = require("../config/db");
const { hashPassword } = require("../models/credentials");

const TABLES = {
  teacher: { table: "teacher", idCol: "id_teacher", cols: ["first_name", "last_name", "email"], emailCol: "email" },
  student: { table: "student", idCol: "id_stu", cols: ["first_name_stu", "last_name_stu", "email_stu"], emailCol: "email_stu" },
};

(async () => {
  try {
    const [role, first, last, email, password] = process.argv.slice(2);
    const t = TABLES[role];
    if (!t || !first || !last || !email || !password) {
      console.log('usage: node scripts/create-account.js <teacher|student> "First" "Last" email "Password"');
      process.exit(1);
    }
    // (no length check here on purpose: this is an admin script, e.g. for demo accounts)

    const hash = await hashPassword(password);
    const existing = await executeQuery(`select ${t.idCol} as id from ${t.table} where ${t.emailCol}=?`, [email]);
    if (existing.length) {
      await executeQuery(`update ${t.table} set password=? where ${t.idCol}=?`, [hash, existing[0].id]);
      console.log(`✅ ${role} ${email} already existed — password reset (id ${existing[0].id})`);
    } else {
      const r = await executeQuery(
        `insert into ${t.table} (${t.cols.join(",")},password) values (?,?,?,?)`,
        [first, last, email, hash]
      );
      console.log(`✅ ${role} ${email} created (id ${r.insertId})`);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ failed:", err.message);
    process.exit(1);
  }
})();
