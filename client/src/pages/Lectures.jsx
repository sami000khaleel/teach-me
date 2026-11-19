import React, { useState, useEffect } from 'react';
import { Trash } from 'lucide-react';
import LectureForm from '../Components/LectureForm/LectureForm';
import { useOutletContext, useParams } from 'react-router-dom';
import api from '../api/api';
import PdfImg from '../assets/svgs/pdfjpg.jpg';
const Lectures = () => {
  const { courseId } = useParams();
  const user = JSON.parse(localStorage.getItem('user'));
  const { setModalState } = useOutletContext();
  const [lectures, setLectures] = useState([]);
  const [loadingFlag, setLoadingFlag] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  useEffect(() => {
    async function fetchLectures() {
      try {
        setLoadingFlag(true);
        const {data} = await api.getLectures(courseId);
        setLectures(data);
        setLoadingFlag(false);
      } catch (err) {
        setLoadingFlag(false);
      }
    }
// make sure the teacher
    async function checkTeacherOwnership() {
      try {
        const {data} = await api.getTeachersCourses(); // Assume this API fetches the course info
        let courses=data.courses
        for(let course of courses){
          if(course.id_cours==courseId)
            setIsTeacher(true)
        }
      }
       catch (err) {
        console.error('Error fetching course info', err);
      }
    }

    fetchLectures();
    if (user.role === 'teacher') {
      checkTeacherOwnership();
    } else {
      setIsTeacher(false);
    }
  }, [courseId, user.id, user.role]);

  return (
    <div className="page-wrap flex min-h-[calc(100vh-72px)] flex-col items-center py-10">
     {isTeacher? <LectureForm />:null}

      <h1 className="mb-8 mt-10 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Course Lectures</h1>

      {loadingFlag ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Loading...</p>
      ) : (
        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lectures.length ? (
            lectures.map(lecture => (
              <div
                key={lecture.id}
                className="surface relative flex flex-col items-center justify-center p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:border-brand-400/30"
              >
                {/* {isTeacher && (
                  <Trash
                    className="absolute top-3 right-3"
                    cursor={"pointer"}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Handle delete action here
                      await api.deleteLecture(courseId,lecture.lecture)

                      console.log(`Delete lecture with id: ${lecture.id}`);
                    }}
                  />
                )} */}
                <img width={50} className="mb-3 aspect-[3/4] rounded-md shadow-md" src={PdfImg} alt="pdf image" />
                <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white">{lecture.lecture}</h2>
                <button onClick={async()=>{
                  await  api.downloadLecture(lecture.id_course,lecture.lecture)
                }} className="btn-primary mt-4 w-full">
                  Download
                </button>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-slate-500 dark:text-slate-400">No lectures available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Lectures;
