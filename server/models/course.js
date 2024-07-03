const executeQuery = require('../config/db');
class course {
    static validatedates(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const currentDate = new Date();
        if (d2 <= d1)
            throw new Error('dates are not valid')
        if (d1 < currentDate || d2 <= currentDate)
            throw new Error('dates are not valid')
    }
    static async get_courses_id(id_teacher) {
        const res = await executeQuery('select id_cours from relater where id_teacher=?', [id_teacher]);
        let ids = []

        for (let i = 0; i < res.length; i++) {
            ids.push(res[i].id_cours)
        }
        console.log(ids)
        return ids
    }
    static async get_courses(ids) {
        let courses = []
        for (let i = 0; i < ids.length; i++) {
            let result = await executeQuery('select * from cours where id_cours=?', [ids[i]])
            courses.push({... result[0]})
        }

        return courses
    }
    static async checkTeacherGivesCourse(courseId,teacherId) {
            
        let result = await executeQuery('select * from relater where id_cours=? and id_teacher=?', [courseId,teacherId])
        if(!result.length)
            throw new Error('you are not the teacher of this course')
            
    }


    static async update(cours_name,cours_discription,first_course, end_course, date1, date2, id_course) {
        const res = await executeQuery('update cours set cours_name=?,cours_discription=?, first_cours=? ,end_cours=?,date1=?,date2=? where id_cours=?', [cours_name,cours_discription,first_course, end_course, date1, date2, id_course]);
        return res[0];
    }

    static async delete_course(id_course) {
        const d_fromrelater = await executeQuery('delete from relater where id_cours=?', [id_course]);

        const d_fromcourse = await executeQuery('delete from cours where id_cours=?', [id_course]);
    }






    static async searchcourse_bycoursename(course_name) {
        var courses = await executeQuery('select * from cours;')
        console.log(course_name.length)
        courses=courses.filter(course=>course['cours_name'].substring(0,course_name.length).toLowerCase()==course_name.toLowerCase())
        return courses;
    }




    static async get_courses_mystudent_id(id_stu, id_teacher) {
        const res = await executeQuery('select id_cours from relater where id_stu=? and id_teacher=?', [id_stu, id_teacher]);
        console.log(res)
        let ids = []

        for (let i = 0; i < res.length; i++) {
            ids.push(res[i].id_cours)
        }
        console.log(ids)
        return ids
    }



    static async get_idcourse_forstudent(id_student) {
        const res = await executeQuery('select id_cours from relater where id_stu=? ', [id_student]);
        let ids = []

        for (let i = 0; i < res.length; i++) {
            ids.push(res[i].id_cours)
        }
        return ids
    }


}
module.exports = course