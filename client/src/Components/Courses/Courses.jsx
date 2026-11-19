import React from 'react'
import Course from './Course/Course'
const Courses = ({courses,teachersCourseFlag,setSelectedCourse,setUpdateMode}) => {
  return (
    <article className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {courses.map((course) => (
      <Course setUpdateMode={setUpdateMode}  setSelectedCourse={setSelectedCourse} key={course.id_cours} course={course} />
    ))}
  </article>  )
}

export default Courses
