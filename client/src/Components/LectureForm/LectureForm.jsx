import React, { useState } from 'react';
import api from '../../api/api'
import { useParams } from 'react-router-dom';
const UploadPDFForm = () => {
    const {courseId}=useParams()
      const [pdfFile, setPdfFile] = useState(null);
  const [fileName, setFileName] = useState('');
    const user=JSON.parse(localStorage.getItem('user'))
  const onFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const onFileNameChange = (e) => {
    setFileName(e.target.value);
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    if (pdfFile && fileName) {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('fileName', fileName);
      await api.addLecture(formData.get('file'),courseId,user.id,formData.get('fileName'))
      window
} else {
      alert('Please provide both a file and a name.');
    }
  };

  return (
    <div className="flex w-full items-center justify-center">
      <form
        className="surface mt-8 w-full max-w-lg p-6 sm:p-8"
        onSubmit={onFormSubmit}
      >
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Upload PDF Document
        </h1>

        <div className="mb-4">
          <label
            className="field-label"
            htmlFor="pdf_name"
          >
            PDF Name
          </label>
          <input
            type="text"
            id="pdf_name"
            value={fileName}
            onChange={onFileNameChange}
            className="field"
            placeholder="Enter PDF name"
            required
          />
        </div>

        <div className="mb-4">
          <label
            className="field-label"
            htmlFor="pdf_file"
          >
            Upload PDF File
          </label>
          <input
            type="file"
            id="pdf_file"
            accept=".pdf"
            onChange={onFileChange}
            className="field cursor-pointer file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-500/[0.15] dark:file:text-brand-300"
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary mt-4 w-full"
        >
          Submit PDF
        </button>
      </form>
    </div>
  );
};

export default UploadPDFForm;
