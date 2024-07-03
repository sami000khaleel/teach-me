const express=require('express')
const router=require('express').Router();
const student_controller =require('../controllers/stu_controller')
router.post('/addstudent',student_controller.addnewstudent)
router.get('/reinsert',student_controller.reinsert)
router.get('/get_courses',student_controller.get_courses)
router.get('/course_info',student_controller.course_info)
//****************************************************************************** */
router.post('/login_course',student_controller.login_course)
router.get('/searchcourse_bycoursename',student_controller.searchcourse_bycoursename)
router.get('/get_my_courses',student_controller.get_my_courses)
router.get('/send_code',student_controller.sendCode)
router.get('/verify_code',student_controller.verifyCode)
router.patch('/reset_password',student_controller.reset_password)
router.get('/image',student_controller.sendImage)
router.get('/request_call',student_controller.findCall)
router.get('/get_students_by_course',student_controller.getStudentsByCourse)
//********************************* */
router.post('/check_frame',student_controller.checkFrame)
module.exports = router ;