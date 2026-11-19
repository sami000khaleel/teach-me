import React from 'react';
import { Send } from 'lucide-react';
const Messages = ({pc, messages,callId ,socket,message,setMessage}) => {
  console.log(pc?.connectionState)
    return (
    <div className="mt-10 flex min-h-[40vh] w-full flex-col items-center justify-start text-slate-800 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch justify-start gap-3 px-4 pb-28">
        {callId||pc?.connectionState=='connected'?.length ? (
          messages.map((message, index) => (
            <article
              className="flex w-full min-w-[250px] items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-colors duration-200 dark:border-white/10 dark:bg-ink-800/80"
              key={index}
            >
              <img
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-500/30"
                src={message.studentImage}
                alt={message.studentName}
              />
              <div className="flex min-w-0 flex-col items-start justify-center">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{message.studentName}</h2>
                <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{message.content}</p>
              </div>

            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/[0.15] dark:text-slate-400">No messages to display.</p>
        )}
             {JSON.parse(localStorage.getItem('user')).role=='student'? <form
                id="message form"
                className="fixed bottom-6 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-xl backdrop-blur dark:border-white/10 dark:bg-ink-800/90"
              >
                <input
                  onChange={(e) =>
                    setMessage((pre) => ({ ...pre, content: e.target.value }))
                  }
                  value={message.content}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none dark:text-white"
                  type="text"
                  name="message"
                  id="message"
                />
                <button
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    socket.emit("message", { message, callId });
                    console.log("message emmited", message, callId);
                    setMessage(pre=>({...pre,content:''}))
                  }}
                >
                  <Send size={18} />
                </button>
              </form>:null}

      </div>

    </div>
  );
};

export default Messages;
