import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mic, Square, Send, Loader2, CheckCircle2, ChevronRight,
  Globe, RotateCcw, ClipboardList, MessageSquare, Edit3, ArrowRight
} from "lucide-react";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

type PageState = "chat" | "review" | "done";

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ turnCount, maxTurns = 8 }: { turnCount: number; maxTurns?: number }) {
  const pct = Math.min(100, Math.round((turnCount / maxTurns) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ message, isRtl }: { message: ChatMessage; isRtl: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-emerald-600 text-white rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        }`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold ml-2 mt-1 shrink-0">
          You
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MedicalHistoryCollection() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  // Parse query params
  const searchParams = new URLSearchParams(searchString);
  const returnTo = searchParams.get("returnTo") || "/consultations";

  // State
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [pageState, setPageState] = useState<PageState>("chat");
  const [collectedHistory, setCollectedHistory] = useState("");
  const [editedHistory, setEditedHistory] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [chatLanguage, setChatLanguage] = useState<"en" | "ar">(language as "en" | "ar");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isRtl = chatLanguage === "ar";

  // tRPC mutations
  const startSessionMutation = trpc.medicalHistory.startSession.useMutation();
  const sendMessageMutation = trpc.medicalHistory.sendMessage.useMutation();
  const confirmCompleteMutation = trpc.medicalHistory.confirmComplete.useMutation();
  const transcribeMutation = trpc.voiceTranscription.transcribe.useMutation();
  const uploadMutation = trpc.upload.file.useMutation();

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Start session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    handleStartSession();
  }, [isAuthenticated, loading]);

  const handleStartSession = async () => {
    try {
      const result = await startSessionMutation.mutateAsync({ language: chatLanguage });
      setSessionId(result.sessionId);
      setMessages(result.messages as ChatMessage[]);
      setTurnCount(result.turnCount);
      setIsComplete(result.isComplete);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start session");
    }
  };

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !sessionId || sendMessageMutation.isPending) return;

    setInputText("");

    // Optimistically add user message
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await sendMessageMutation.mutateAsync({
        sessionId,
        message: text,
        language: chatLanguage,
      });

      setMessages(result.messages as ChatMessage[]);
      setTurnCount(result.turnCount);

      if (result.isComplete) {
        setIsComplete(true);
        setCollectedHistory(result.collectedHistory ?? "");
        setEditedHistory(result.collectedHistory ?? "");
        // Small delay then show review
        setTimeout(() => setPageState("review"), 800);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m !== userMsg));
      setInputText(text);
    }
  };

  // ── Handle Enter key ───────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4",
      ].find(t => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || "audio/webm";
        const cleanMime = actualMime.split(";")[0] || "audio/webm";
        const ext = cleanMime.includes("ogg") ? "ogg" : cleanMime.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type: cleanMime });

        if (blob.size / 1024 / 1024 > 16) {
          toast.error(isRtl ? "حجم التسجيل كبير جداً" : "Recording too large (max 16MB)");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64 = (reader.result as string).split(",")[1];
              const uploaded = await uploadMutation.mutateAsync({
                fileName: `voice-history-${Date.now()}.${ext}`,
                fileData: base64,
                fileType: cleanMime,
                category: "audio",
              });
              const result = await transcribeMutation.mutateAsync({
                audioUrl: uploaded.url,
                language: chatLanguage,
              });
              setInputText(prev => prev ? `${prev} ${result.text}` : result.text);
              toast.success(isRtl ? "تم تحويل الصوت إلى نص" : "Voice transcribed");
            } catch (e: any) {
              toast.error(e?.message || (isRtl ? "فشل التحويل" : "Transcription failed"));
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          setIsTranscribing(false);
        }
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      toast.success(isRtl ? "بدأ التسجيل..." : "Recording started...");
    } catch {
      toast.error(isRtl ? "فشل الوصول إلى الميكروفون" : "Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Switch language ────────────────────────────────────────────────────────
  const toggleLanguage = () => {
    const newLang = chatLanguage === "en" ? "ar" : "en";
    setChatLanguage(newLang);
  };

  // ── Confirm and proceed ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!sessionId) return;
    try {
      await confirmCompleteMutation.mutateAsync({
        sessionId,
        editedHistory: editedHistory.trim() || collectedHistory,
      });
      setPageState("done");
      // Redirect to consultation form with history pre-filled
      const encoded = encodeURIComponent(editedHistory.trim() || collectedHistory);
      setTimeout(() => {
        setLocation(`${returnTo}?medicalHistory=${encoded}`);
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm");
    }
  };

  // ── Restart ────────────────────────────────────────────────────────────────
  const handleRestart = async () => {
    setMessages([]);
    setSessionId(null);
    setTurnCount(0);
    setIsComplete(false);
    setCollectedHistory("");
    setEditedHistory("");
    setPageState("chat");
    await handleStartSession();
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MessageSquare className="h-12 w-12 text-emerald-600" />
        <h2 className="text-xl font-semibold text-center">
          {isRtl ? "يرجى تسجيل الدخول للمتابعة" : "Please sign in to continue"}
        </h2>
        <Button onClick={() => window.location.href = getLoginUrl()} className="bg-emerald-600 hover:bg-emerald-700">
          {isRtl ? "تسجيل الدخول" : "Sign In"}
        </Button>
      </div>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (pageState === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <CheckCircle2 className="h-16 w-16 text-emerald-600" />
        <h2 className="text-2xl font-bold text-center text-emerald-700">
          {isRtl ? "تم! جاري التوجيه..." : "Done! Redirecting..."}
        </h2>
        <p className="text-muted-foreground text-center">
          {isRtl
            ? "سيتم نقل تاريخك الطبي إلى نموذج الاستشارة"
            : "Your medical history will be transferred to the consultation form"}
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  // ── Review state ───────────────────────────────────────────────────────────
  if (pageState === "review") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {isRtl ? "مراجعة التاريخ الطبي المجمع" : "Review Your Collected Medical History"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRtl
                ? "يمكنك تعديل المعلومات قبل المتابعة"
                : "You can edit the information before proceeding"}
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              {isRtl ? "التاريخ الطبي" : "Medical History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedHistory}
              onChange={e => setEditedHistory(e.target.value)}
              rows={10}
              className="resize-none text-sm leading-relaxed"
              dir={isRtl ? "rtl" : "ltr"}
              placeholder={isRtl ? "التاريخ الطبي المجمع..." : "Collected medical history..."}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {isRtl
                ? "يمكنك تعديل أو إضافة أي معلومات إضافية"
                : "You can edit or add any additional information"}
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRestart}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {isRtl ? "إعادة البدء" : "Start Over"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmCompleteMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {confirmCompleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isRtl ? "تأكيد والمتابعة للاستشارة" : "Confirm & Continue to Consultation"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Chat state ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col" style={{ minHeight: "calc(100vh - 140px)" }} dir={isRtl ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              {isRtl ? "جمع التاريخ الطبي" : "Medical History Collection"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isRtl ? "مساعد طبي ذكي" : "AI Medical Assistant"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-1.5 text-xs h-8"
          >
            <Globe className="h-3.5 w-3.5" />
            {chatLanguage === "en" ? "العربية" : "English"}
          </Button>

          {/* Status badge */}
          {isComplete ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {isRtl ? "مكتمل" : "Complete"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {isRtl ? `السؤال ${turnCount + 1}` : `Q${turnCount + 1}`}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <ProgressBar turnCount={turnCount} maxTurns={8} />
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-1 pr-1" style={{ minHeight: 0, maxHeight: "calc(100vh - 380px)" }}>
        {startSessionMutation.isPending && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRtl ? "جاري تحضير المساعد الطبي..." : "Preparing medical assistant..."}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} isRtl={isRtl} />
        ))}

        {sendMessageMutation.isPending && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
              AI
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Complete CTA */}
      {isComplete && pageState === "chat" && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              {isRtl ? "تم جمع معلومات كافية! راجع وأكد." : "Sufficient information collected! Review and confirm."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setPageState("review")}
            className="bg-emerald-600 hover:bg-emerald-700 gap-1 shrink-0"
          >
            {isRtl ? "مراجعة" : "Review"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Input area */}
      {!isComplete && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRtl ? "اكتب ردك هنا... (Enter للإرسال)" : "Type your response here... (Enter to send)"}
              rows={2}
              className="resize-none pr-2 text-sm"
              dir={isRtl ? "rtl" : "ltr"}
              disabled={sendMessageMutation.isPending || isTranscribing}
            />
          </div>

          {/* Voice button */}
          {!isRecording && !isTranscribing && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={startRecording}
              className="h-[60px] w-10 shrink-0"
              title={isRtl ? "تسجيل صوتي" : "Voice input"}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}

          {isRecording && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={stopRecording}
              className="h-[60px] w-10 shrink-0 animate-pulse"
              title={isRtl ? "إيقاف التسجيل" : "Stop recording"}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}

          {isTranscribing && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled
              className="h-[60px] w-10 shrink-0"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          )}

          {/* Send button */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || sendMessageMutation.isPending || isTranscribing}
            className="h-[60px] w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700"
            size="icon"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Hint */}
      {!isComplete && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {isRtl
            ? "اضغط Enter للإرسال • Shift+Enter لسطر جديد • زر الميكروفون للإدخال الصوتي"
            : "Press Enter to send • Shift+Enter for new line • Mic button for voice input"}
        </p>
      )}
    </div>
  );
}
