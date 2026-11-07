const express=require('express')
const teacher_controller=require('../controllers/teacher_controller')
const { requireAuth } = require('../middleware/auth')
const rateLimit = require('../middleware/rateLimit')
const router=express.Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'too many login attempts, try again in a few minutes' })
const teacherOnly = requireAuth('teacher')

// ---- public ----
router.post('/login',loginLimiter,teacher_controller.login)
router.get('/get_lectures',teacher_controller.get_lectures)
// ---- logged-in users ----
router.get('/download_lecture',requireAuth(),teacher_controller.get_lectures_by_course)
// ---- teachers only ----
router.get('/get-course-info',teacherOnly,teacher_controller.get_course_info)
router.post('/add_course',teacherOnly,teacher_controller.add_course)
router.get('/get_courses',teacherOnly,teacher_controller.get_courses)
router.patch('/update_date',teacherOnly,teacher_controller.update_date)
router.delete('/delete_course',teacherOnly,teacher_controller.delete_course)
router.get('/get_courses_where_mystudent_insert_it',teacherOnly,teacher_controller.get_courses_mystudent)
router.post('/create_lesson',teacherOnly,teacher_controller.createLesson)
router.get('/get_courses_students',teacherOnly,teacher_controller.getCoursesStudents)
router.get('/get_report',teacherOnly,teacher_controller.get_report)
router.get('/get_days_report',teacherOnly,teacher_controller.get_days_report)
router.post('/add_lecture',teacherOnly,teacher_controller.add_lecture)
router.delete('/delete_lecture',teacherOnly,teacher_controller.delete_lecture)
module.exports=router
