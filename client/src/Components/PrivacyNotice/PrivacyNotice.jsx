import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";

// Small data-privacy notice. Shown until the visitor clicks "Got it".
const KEY = "privacyOk";

const PrivacyNotice = () => {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "yes";
    } catch (_) {
      return false;
    }
  });
  if (hidden) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, "yes");
    } catch (_) {}
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:right-auto sm:max-w-sm">
      <div className="surface flex gap-3 p-4 shadow-soft">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" />
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">Your data</p>
          <p className="mt-1">
            This is a portfolio project. I only store what you type when you
            sign up (name, e-mail, a hashed password and a profile picture) —
            feel free to use made-up data. I also store the date this page was
            first opened in your browser (just the date, nothing else), using a
            small cookie so it is counted once.
          </p>
          <button className="btn-primary btn-sm mt-3" onClick={accept}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNotice;
