"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Upload, Send, X, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CHARS = 60000;

export default function Home() {
  const [docContent, setDocContent] = useState(null);
  const [docFileName, setDocFileName] = useState(null);
  const [docMeta, setDocMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  async function handleFile(file) {
    setError(null);

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = /\.(txt|md|csv|json)$/i.test(file.name);

    if (!isPdf && !isText) {
      setError("Unsupported file type. Please upload PDF, TXT, MD, CSV, or JSON.");
      return;
    }

    setParsing(true);
    try {
      let text;
      if (isPdf) {
        text = await readPdf(file);
      } else {
        text = await file.text();
      }

      const truncated = text.length > MAX_CHARS;
      if (truncated) {
        text = text.slice(0, MAX_CHARS) + "\n\n[Document truncated to fit context limit]";
      }

      setDocContent(text);
      setDocFileName(file.name);
      setDocMeta({
        size: (file.size / 1024).toFixed(1) + " KB",
        words: text.split(/\s+/).filter(Boolean).length.toLocaleString(),
        truncated,
      });
      setMessages([]);
    } catch (err) {
      console.error(err);
      setError("Failed to read file: " + err.message);
    } finally {
      setParsing(false);
    }
  }

  async function readPdf(file) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(" ");
      pages.push(`--- Page ${i} ---\n${text}`);
    }
    return pages.join("\n\n");
  }

  function resetDocument() {
    setDocContent(null);
    setDocFileName(null);
    setDocMeta(null);
    setMessages([]);
    setError(null);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !docContent) return;

    setError(null);
    setInput("");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: docContent,
          fileName: docFileName,
          history: newMessages.slice(0, -1),
          message: text,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setError("API error: " + err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function useStarter(text) {
    if (!docContent) return;
    setInput(text);
    setTimeout(() => sendMessage(), 0);
  }

  const starters = [
    "Summarize this document in 3 bullet points",
    "What are the main topics covered?",
    "What are the key takeaways?",
    "List any action items or next steps mentioned",
  ];

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[300px_1fr] overflow-hidden bg-white">
      <aside className="flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-blue-200 bg-blue-200">
        <div className="border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-2.5">
           <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-900">
  <FileText className="h-4 w-4 text-white" />
</div>
           <span className="text-lg font-semibold tracking-tight text-black">DocMiracle</span>
               </div>
               <div className="mt-1 pl-[42px] font-mono text-[11px] text-black">
                v1.0 · powered by Groq
           </div>
        </div>

        <div className="p-5">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
         className={cn(
           "relative block cursor-pointer rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-7 text-center transition-all hover:bg-blue-100",
            dragOver && "border-blue-500 bg-blue-200"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="h-1 w-28 overflow-hidden rounded-full bg-[var(--border)]">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent)]" />
                </div>
                <div className="font-mono text-[11px] text-[var(--accent)]">
                  Reading document…
                </div>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-red-50">
                  <Upload className="h-5 w-5 text-[var(--accent)]" />
                </div>
               <div className="mb-1 text-[13px] font-medium text-black">Upload a document</div>
               <div className="font-mono text-[11px] text-black">
                PDF · TXT · MD · CSV · JSON
                </div>
              </>
            )}
          </label>
        </div>

       {docMeta && (
  <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-[10px] border border-purple-200 bg-purple-100 p-3.5">
   <div className="flex h-9 w-9 items-center justify-center rounded-lg !bg-purple-200">
  <FileText className="h-5 w-5 !text-black" />
</div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-[13px] font-medium text-black">{docFileName}</div>
      <div className="font-mono text-[11px] text-black">
        {docMeta.size} · {docMeta.words} words
        {docMeta.truncated ? " (truncated)" : ""}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-black">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-900" />
        ready to query
      </div>
    </div>
    <button
      onClick={resetDocument}
      title="Remove document"
      className="flex-shrink-0 text-black transition-colors hover:text-red-500"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
)}

       <div className="mt-auto hidden p-5 md:block">
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-black font-bold">
          Tips
           </div>
           {[
             "Ask for summaries, key points, or specific details",
             'Try "What is this document about?"',
             "Compare sections or find contradictions",
             "Large PDFs are truncated to fit context",
            ].map((tip) => (
             <div key={tip} className="mb-2 flex items-start gap-2 text-xs leading-relaxed text-black">
             <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-900" />
         {tip}
        </div>
       ))}
      </div>
      </aside>

      <main className="flex flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-7 py-4">
          <div>
           <div className="text-[15px] font-medium text-black">
            {docFileName || "No document loaded"}
           </div>
             <div className="font-mono text-xs text-black">
             {docContent ? "Ready — ask anything about this document" : "Upload a document to begin"}
            </div>
          </div>
          <div className="rounded-full border border-purple-300 bg-purple-200 px-3 py-1 text-[11px] font-mono text-black">
           llama3-8b-8192
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 py-6">
          {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-200 bg-purple-50">
           <Bot className="h-7 w-7 text-purple-900" />
         </div>
          <div className="text-base font-medium text-black">Ask anything about your document</div>
          <div className="max-w-xs text-[13px] leading-relaxed text-black">
            Upload a PDF or text file on the left, then ask questions in plain English.
        </div>
           <div className="mt-2 flex flex-wrap justify-center gap-2">
          {starters.map((s) => (
           <button
          key={s}
          onClick={() => useStarter(s)}
          disabled={!docContent}
          className="rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs text-black transition-colors hover:border-purple-400 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {s}
           </button>
            ))}
         </div>
       </div>
    )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex max-w-3xl gap-3",
                m.role === "user" ? "ml-auto flex-row-reverse self-end" : "self-start"
              )}
            >
            <div
              className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
               m.role === "user"
                ? "bg-blue-100 text-blue-900" // User icon style
                : "bg-purple-100 text-purple-900" // Bot icon style: Pastel Purple
               )}
             >
            {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
              <div
  className={cn(
    "rounded-[10px] border px-4 py-3 text-sm leading-relaxed",
    m.role === "user"
      ? "rounded-tr-[4px] border-blue-200 bg-blue-100 text-black"
      : "rounded-tl-[4px] border-purple-200 bg-purple-100 text-black"
  )}
>
  {m.role === "assistant" ? (
    <div className="prose prose-slate max-w-none prose-headings:text-black prose-p:text-black prose-li:text-black">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
    </div>
  ) : (
    <div className="text-black whitespace-pre-wrap">{m.content}</div>
  )}
</div>
            </div>
          ))}

          {loading && (
           <div className="flex max-w-3xl gap-3 self-start">
           <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-900">
           <Bot className="h-4 w-4" />
          </div>
         <div className="flex items-center gap-1 rounded-[10px] rounded-tl-[4px] border border-purple-200 bg-purple-50 px-4 py-3.5">
         <span className="typing-dot h-1.5 w-1.5 rounded-full bg-purple-400" />
         <span className="typing-dot h-1.5 w-1.5 rounded-full bg-purple-400" style={{ animationDelay: "0.2s" }} />
         <span className="typing-dot h-1.5 w-1.5 rounded-full bg-purple-400" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
       )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-[var(--border)] px-7 pb-6 pt-5">
          {error && (
            <div className="mb-3 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 font-mono text-xs text-red-900">
              {error}
            </div>
          )}
       <div className="flex items-end gap-2.5 rounded-2xl border border-purple-200 bg-purple-50 px-3.5 py-2.5 focus-within:border-purple-400 focus-within:bg-white transition-colors duration-200">
           <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!docContent || loading}
              placeholder="Ask something about your document…"
             className="max-h-[140px] flex-1 resize-none bg-transparent text-sm outline-none text-black placeholder:text-gray-500 disabled:cursor-not-allowed"
           />
           <button
             onClick={sendMessage}
             disabled={!docContent || loading || !input.trim()}
             className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-200 transition-colors hover:bg-purple-300 disabled:cursor-not-allowed disabled:bg-gray-200"
           >
          <Send className={cn("h-4 w-4", !docContent || loading || !input.trim() ? "text-gray-400" : "text-purple-900")} />
          </button>
        </div>
          <div className="mt-2 pl-0.5 font-mono text-[11px] text-[var(--text-dim)]">
            {docContent ? "Enter to send · Shift+Enter for new line" : "↑ upload a document first"}
          </div>
        </div>
      </main>
    </div>
  );
}