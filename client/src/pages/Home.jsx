import React, { useState, useEffect } from "react";
import LectureForm from '../Components/LectureForm/LectureForm'
import { Trash } from "lucide-react";
import { getRandomCourses } from "./utilities";
import Cookies from 'js-cookies';
import Courses from "../Components/Courses/Courses";
import { useOutletContext } from "react-router-dom";
import ModalPopup from "../Components/ModalPopup/ModalPopup";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../Components/LoadingSpinner/LoadingSpinner";
import PdfImg from '../assets/svgs/pdfjpg.jpg';

const Home = () => {
  const navigate = useNavigate();
  const { fetchTrigger, setModalState, modalState, courses, setCourses } = useOutletContext();
  const [loadingFlag, setLoadingFlag] = useState(false);

  useEffect(() => {
    getRandomCourses(setCourses, setModalState, setLoadingFlag);
  }, [fetchTrigger]);

  const lectures = [
  ];
  let coursesArray = [

  ];


  return (
    <>

      {/* <h1 className="text-4xl font-bold mb-8">Courses Lectures</h1> */}


    {/* <LectureForm/>
        <h1 className="text-4xl font-bold  mb-8">Courses Lectures</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full  max-w-6xl">
          {lectures?.length ? lectures.map(lecture => (
            <div key={lecture.id} className="dark:hover:bg-slate-800 hover:bg-slate-300 cursor-pointer transition-transform transform hover:scale-105 dark:bg-black bg-gray-100 rounded-lg p-5 flex flex-col items-center justify-center shadow-md">
            <Trash
            className="absolute top-3 right-3"
            cursor={"pointer"}
          />
              <img width={50} className="aspect-[3/4] mb-3" src={PdfImg} alt="pdf image" />
              <h2 className="text-lg font-semibold ">{lecture.name}</h2>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400">
                Download
              </button>
            </div>
          )) : null}
        </div> */}

        <section className="page-wrap animate-fade-up pb-2 pt-12 text-center sm:pt-16">
          <span className="chip">Live classes</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Learn from great teachers, <span className="gradient-text">live.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 dark:text-slate-400">
            Browse courses, join the lecture room and keep track of every session.
          </p>
        </section>

        {/* Uncomment if you want to show courses or loading spinner */}
         <section className="page-wrap flex justify-center py-10">
          {courses.length || !loadingFlag ? (
            <Courses courses={courses} />
          ) : (
            <div className="flex justify-center py-20">
              <LoadingSpinner />
            </div>
          )}
        </section>
    </>
  );
};

export default Home;
