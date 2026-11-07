const router=require('express').Router();
const student_controller =require('../controllers/stu_controller')
const { requireAuth } = require('../middleware/auth')
const rateLimit = require('../middleware/rateLimit')

// brute-force protection for everything that checks a secret
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'too many login attempts, try again in a few minutes' })
const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'too many attempts, try again in a few minutes' })
const emailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'too many emails requested, try again later' })

// ---- public ----
router.post('/addstudent',student_controller.addnewstudent)
router.post('/login',loginLimiter,student_controller.login)
router.get('/get_courses',student_controller.get_courses)
router.get('/course_info',student_controller.course_info)
router.get('/searchcourse_bycoursename',student_controller.searchcourse_bycoursename)
router.get('/get_student_image',student_controller.getStudentImage)
router.get('/request_call',student_controller.findCall)
// ---- account recovery (e-mailed code) ----
router.get('/send_code',emailLimiter,student_controller.sendCode)
router.get('/verify_code',codeLimiter,student_controller.verifyCode)
// ---- logged-in users ----
router.get('/get_students_by_course',requireAuth(),student_controller.getStudentsByCourse)
router.patch('/reset_password',requireAuth(),student_controller.reset_password)
// ---- students only ----
router.post('/login_course',requireAuth('student'),student_controller.login_course)
router.get('/get_my_courses',requireAuth('student'),student_controller.get_my_courses)
module.exports = router ;
