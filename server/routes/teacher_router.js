const express=require('express')
const teacher_controller=require('../controllers/teacher_controller')
const router=express.Router()
router.get('/get-course-info',teacher_controller.get_course_info)
router.get('/insert_teacher',teacher_controller.insert_teacher)
router.post('/add_course',teacher_controller.add_course)
router.get('/get_courses',teacher_controller.get_courses)
router.patch('/update_date',teacher_controller.update_date)

//******************************************************* */
router.delete('/delete_course',teacher_controller.delete_course)
router.get('/get_courses_where_mystudent_insert_it',teacher_controller.get_courses_mystudent)
router.post('/create_lesson',teacher_controller.createLesson)
router.get('/get_courses_students',teacher_controller.getCoursesStudents)
router.get('/get_report',teacher_controller.get_report)
router.get('/get_days_report',teacher_controller.get_days_report)
router.post('/test/create_call',teacher_controller.create_test_call)





module.exports=router