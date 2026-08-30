"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, MicOff, Loader2, X, Languages, Square } from "lucide-react";

type VoiceLanguage = "auto" | "en-US" | "hi-IN" | "ur-PK";

interface ChatComposerProps {
  onSend: (text: string, file?: File) => void;
  loading?: boolean;
  uploadingDoc?: boolean;
  disabled?: boolean;
  placeholder?: string;
  isDemo?: boolean;
  onCancel?: () => void;
}

export default function ChatComposer({
  onSend,
  loading,
  uploadingDoc,
  disabled,
  placeholder = "Ask anything about your documents...",
  isDemo,
  onCancel,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>("auto");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputValueRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const composerStateRef = useRef({ loading, disabled, attachedFile, onSend });

  useEffect(() => {
    composerStateRef.current = { loading, disabled, attachedFile, onSend };
  }, [loading, disabled, attachedFile, onSend]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Voice recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (e: any) => {
          const transcript = Array.from(e.results)
            .map((res: any) => res[0].transcript)
            .join("");
          const spokenCommand = transcript.trim().toLocaleLowerCase();
          const sendCommands = [
            "send", "send message", "submit", "bhejo", "bhej do", "भेजो", "भेज दो", "بھیجیں", "بھیج دو", "ارسال کریں",
          ];
          const clearCommands = [
            "clear", "clear input", "cancel", "saaf karo", "مٹا دو", "صاف کرو", "हटा दो", "साफ करो",
          ];

          if (sendCommands.includes(spokenCommand)) {
            const currentInput = inputValueRef.current.trim();
            const currentState = composerStateRef.current;
            if (currentInput && !currentState.loading && !currentState.disabled) {
              currentState.onSend(currentInput, currentState.attachedFile || undefined);
              inputValueRef.current = "";
              setInput("");
              setAttachedFile(null);
            }
            return;
          }

          if (clearCommands.includes(spokenCommand)) {
            inputValueRef.current = "";
            setInput("");
            return;
          }

          inputValueRef.current = transcript;
          setInput(transcript);
        };
        rec.onend = () => setIsListening(false);
        rec.onerror = () => setIsListening(false);

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // The browser Speech API needs an explicit locale for reliable Hindi and Urdu recognition.
      recognitionRef.current.lang = voiceLanguage === "auto" ? "en-US" : voiceLanguage;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const voiceLabel = voiceLanguage === "auto" ? "Auto / English" : voiceLanguage === "hi-IN" ? "Hindi" : voiceLanguage === "ur-PK" ? "Urdu" : "English";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim(), attachedFile || undefined);
    inputValueRef.current = "";
    setInput("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (isDemo) {
        alert("File uploads are disabled in Public Demo mode. Sign up to upload custom documents!");
        return;
      }
      setAttachedFile(e.target.files[0]);
    }
  };

  const acceptFile = (file: File) => {
    if (isDemo) {
      alert("File uploads are disabled in Public Demo mode. Sign up to upload custom documents!");
      return;
    }
    setAttachedFile(file);
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none">
      {/* Aligned with 768px Conversation Container */}
      <div className="max-w-[768px] mx-auto pointer-events-auto">
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) acceptFile(file); }}
          className={`bg-[#111827]/95 border rounded-[18px] p-2.5 shadow-2xl backdrop-blur-xl transition-all focus-within:border-indigo-500/50 focus-within:shadow-[0_0_32px_rgba(99,102,241,.14)] ${isDragging ? "border-indigo-400 bg-indigo-950/60" : "border-white/10"}`}
        >
          {/* File Attachment Tag */}
          {attachedFile && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs text-indigo-300">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="truncate">{attachedFile.name}</span>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Composer Input Row */}
          <div className="flex items-end gap-2">
            {/* Attach Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc || disabled}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0 mb-0.5"
              title="Attach document"
            >
              {uploadingDoc ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.csv,.md"
              className="hidden"
            />

            {/* Auto Growing Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-0 text-white placeholder-slate-500 text-xs sm:text-sm resize-none focus:outline-none focus:ring-0 max-h-[180px] py-1.5"
            />

            {/* Voice Mic Button */}
            <div className="relative shrink-0 mb-0.5">
              <Languages className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <select
                aria-label="Voice language"
                value={voiceLanguage}
                onChange={(event) => setVoiceLanguage(event.target.value as VoiceLanguage)}
                disabled={isListening}
                className="h-8 w-8 cursor-pointer appearance-none rounded-xl bg-transparent pl-2 text-[0px] text-slate-400 outline-none hover:bg-white/5 disabled:cursor-not-allowed sm:w-[7.2rem] sm:pl-7 sm:text-[11px]"
                title={`Voice language: ${voiceLabel}`}
              >
                <option value="auto">Auto / English</option>
                <option value="en-US">English</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="ur-PK">Urdu (اردو)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={toggleMic}
              className={`p-2 rounded-xl transition-colors shrink-0 mb-0.5 ${
                isListening
                  ? "bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              title={`Voice input: ${voiceLabel}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={loading ? onCancel : handleSubmit}
              disabled={loading ? false : !input.trim() || disabled}
              className="p-2 rounded-xl bg-[#6366F1] hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-30 shrink-0 mb-0.5"
              title={loading ? "Stop generation" : "Send message"}
            >
              {loading ? <Square className="w-3.5 h-3.5" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcut Hint */}
          <div className="text-center text-[10px] text-slate-600 px-2 mt-1.5">DeepRAG can make mistakes. Check important information.</div>
      </div>
    </div>
  );
}
