import React, { useState } from "react";
import { handleSearch } from "./SearchForm.js";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import LoaddinSpinner from "../../LoadingSpinner/LoadingSpinner.jsx";
const SearchForm = ({ setCourses, modalState, setModalState }) => {
  const navigate=useNavigate()
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <form className="relative flex w-full sm:w-64 lg:w-80">
      <input
        value={query}
        placeholder="search for courses"
        onChange={(e) => setQuery(e.target.value)}
        aria-label="search for course field"
        className="field rounded-full pr-11"
        type="text"
        name="course"
        id="course"
      />
      {loadingFlag ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">

        <LoaddinSpinner  />
        </span>
      ) : (
        <button
          onClick={handleSearch(
            query,
            setCourses,
            setModalState,
            setLoadingFlag,
            navigate
          )}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-white/10"
          aria-label="send your search button"
        >
          <Search size={18} cursor={"pointer"} color="currentColor" />
        </button>
      )}
    </form>
  );
};

export default SearchForm;
