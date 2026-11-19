import Cookies from "js-cookies";
import api from "../../../api/api";
export const handleSearch =
  (query, setCourses, setModalState, setLoadingFlag,navigate) => async (e) => {
    e.preventDefault();
    try {
      if (!query)
        return setModalState({
          message: "please specify what you are looking for",
          status: 400,
          errorFlag: true,
          hideFlag: false,
        });
      setLoadingFlag(true);
      const { data } = await api.searchCourses(query);
      setLoadingFlag(false)
      if (!data?.length)
        return setModalState({
          message: "no courses were found",
          status: 404,
          errorFlag: true,
          hideFlag: false,
        });
        console.log(data)
      setCourses(data);
      setModalState({
        message: "courses were fetched successfull",
        status: 200,
        errorFlag: false,
        hideFlag: false,
      });
      setLoadingFlag(false);
      navigate('/home')
    } catch ({ response }) {
      console.error(response);
      setLoadingFlag(false);
      setModalState({
        message: "no courses matched what you are looking for.",
        status: 404,
        errorFlag: true,
        hideFlag: false,
      });
    }
  };
