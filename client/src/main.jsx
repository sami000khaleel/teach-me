import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import { installAuthInterceptor } from "./auth.js";
import './polyfills.js'
import User from "./pages/User.jsx";
import Home from "./pages/Home.jsx";
import Lectures from './pages/Lectures.jsx'
import Signup from './pages/Signup.jsx'
import Room from "./pages/Room.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import Login from './pages/Login.jsx'
import PageNotFound from './pages/PageNotFound'
import RecoverAccount from './pages/RecoverAccount.jsx'
import ResetPassword from "./pages/ResetPassword.jsx";
import Course from "./pages/Course.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
installAuthInterceptor();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      
      {
        path: "/home",
        element: <Home />,
      },
      {
        path: "/reset-password",
        element: <ResetPassword />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/recover-account",
        element: <RecoverAccount/>,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/user/:userId",
        element: <User />,
      },
      {
        path: "/course/:courseId",
        element: <Course />,
      },
      {
        path: "/room/:courseId",
        element: <Room />,
      },
      {
        path: "/reports/:courseId",
        element: <ReportsPage />,
      },
      {
        path: "/report/:callId",
        element: <ReportPage />,
      },
      {
        path: "/course/:courseId/lecture",
        element: <Lectures />,
      },
       
    ],
  },
  {
    path:'*',
    element:<PageNotFound/>
  }
]);

createRoot(document.getElementById("root")).render(
  <RouterProvider router={router}>
    <App  />
  </RouterProvider>
);
