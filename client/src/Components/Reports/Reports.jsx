import React from "react";
import Report from "./Report/Report";
const Reports = ({ reports }) => {
  return (
    <>
      {reports.map((report) => (
        <>
          <Report report={report} />
        </>
      ))}
    </>
  );
};

export default Reports;
