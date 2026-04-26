import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Mic, MicOff, Send, Loader2, CheckCircle2, ChevronRight,
  Globe, RotateCcw, ClipboardList, MessageSquare, ArrowRight,
  Volume2, VolumeX, Square, Play, StopCircle
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useVoiceChat } from "@/hooks/useVoiceChat";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

type PageState = "chat" | "review" | "done" | "resume-prompt";

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

// ─── Chat Bubble with TTS speaker button ─────────────────────────────────────
function ChatBubble({
  message,
  isRtl,
  onSpeak,
  onStopSpeak,
  isSpeaking,
  isTTSSupported,
}: {
  message: ChatMessage;
  isRtl: boolean;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  isSpeaking: boolean;
  isTTSSupported: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
          AI
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-emerald-600 text-white rounded-br-sm"
              : "bg-card border border-border text-foreground rounded-bl-sm"
          }`}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {message.content}
        </div>
        {/* TTS button for AI messages */}
        {!isUser && isTTSSupported && (
          <div className={`flex ${isRtl ? "justify-end" : "justify-start"}`}>
            <button
              type="button"
              onClick={() => isSpeaking ? onStopSpeak() : onSpeak(message.content)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 transition-colors px-1 py-0.5 rounded"
              title={isSpeaking ? (isRtl ? "إيقاف" : "Stop") : (isRtl ? "استمع" : "Listen")}
            >
              {isSpeaking ? (
                <><StopCircle className="h-3 w-3" /><span>{isRtl ? "إيقاف" : "Stop"}</span></>
              ) : (
                <><Play className="h-3 w-3" /><span>{isRtl ? "استمع" : "Listen"}</span></>
              )}
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold ml-2 mt-1 shrink-0">
          You
        </div>
      )}
    </div>
  );
}

// ─── Listening Indicator ──────────────────────────────────────────────────────
function ListeningPulse({ isRtl }: { isRtl: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
      {isRtl ? "جاري الاستماع..." : "Listening..."}
    </div>
  );
}

// ─── Volume Control ───────────────────────────────────────────────────────────
function VolumeControl({
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isRtl,
}: {
  volume: number;
  onVolumeChange: (v: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isRtl: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <button
        type="button"
        onClick={onToggleMute}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title={isMuted ? (isRtl ? "تشغيل الصوت" : "Unmute") : (isRtl ? "كتم الصوت" : "Mute")}
      >
        {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <Slider
        value={[isMuted ? 0 : volume * 100]}
        min={0}
        max={100}
        step={5}
        onValueChange={([v]) => onVolumeChange(v / 100)}
        className="w-20"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MedicalHistoryCollection() {
  const { isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
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
  const [isMuted, setIsMuted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true); // auto-read AI messages
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isRtl = chatLanguage === "ar";

  // ── Voice hook ─────────────────────────────────────────────────────────────
  const voice = useVoiceChat({
    initialLanguage: chatLanguage,
    onTranscript: (text) => {
      setInputText(prev => prev ? `${prev} ${text}` : text);
    },
    onLanguageChange: (lang) => {
      setChatLanguage(lang);
    },
  });

  // Sync mute state to volume hook
  const prevVolumeRef = useRef(voice.volume);
  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      voice.setVolume(prevVolumeRef.current || 0.8);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = voice.volume;
      voice.setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, voice]);

  // ── tRPC mutations & queries ───────────────────────────────────────────────
  const startSessionMutation = trpc.medicalHistory.startSession.useMutation();
  const sendMessageMutation = trpc.medicalHistory.sendMessage.useMutation();
  const confirmCompleteMutation = trpc.medicalHistory.confirmComplete.useMutation();
  const { data: activeSession, isLoading: checkingSession } = trpc.medicalHistory.getActiveSession.useQuery(
    undefined,
    { enabled: isAuthenticated && !loading, retry: false }
  );

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auto-speak latest AI message ───────────────────────────────────────────
  useEffect(() => {
    if (!autoSpeak || !voice.isTTSSupported || isMuted) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant") {
      const idx = messages.length - 1;
      setSpeakingMsgIndex(idx);
      voice.speak(lastMsg.content, chatLanguage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Clear speaking index when TTS ends
  useEffect(() => {
    if (!voice.isSpeaking) {
      setSpeakingMsgIndex(null);
    }
  }, [voice.isSpeaking]);

  // ── Check for active session on mount ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || loading || checkingSession) return;
    if (activeSession && activeSession.turnCount > 0) {
      setPageState("resume-prompt");
    } else {
      handleStartSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading, checkingSession, activeSession]);

  const handleStartSession = async (resumeSessionId?: number) => {
    try {
      const result = await startSessionMutation.mutateAsync({
        language: chatLanguage,
        resumeSessionId,
      });
      setSessionId(result.sessionId);
      setMessages(result.messages as ChatMessage[]);
      setTurnCount(result.turnCount);
      setIsComplete(result.isComplete);
      setPageState("chat");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start session");
    }
  };

  const handleResumeSession = () => {
    if (!activeSession) return;
    setSessionId(activeSession.sessionId);
    setMessages(activeSession.messages as ChatMessage[]);
    setTurnCount(activeSession.turnCount);
    const lang = (activeSession.detectedLanguage as "en" | "ar") || "en";
    setChatLanguage(lang);
    voice.setLanguage(lang);
    setIsComplete(false);
    setPageState("chat");
  };

  const handleStartNew = () => handleStartSession();

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !sessionId || sendMessageMutation.isPending) return;

    // Stop any ongoing speech before user sends
    voice.stopSpeaking();
    voice.detectLanguageFromText(text);

    setInputText("");
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
        setTimeout(() => setPageState("review"), 800);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message");
      setMessages(prev => prev.filter(m => m !== userMsg));
      setInputText(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Language toggle ────────────────────────────────────────────────────────
  const toggleLanguage = () => {
    const newLang = chatLanguage === "en" ? "ar" : "en";
    setChatLanguage(newLang);
    voice.setLanguage(newLang);
  };

  // ── Speak a specific message ───────────────────────────────────────────────
  const handleSpeakMessage = (text: string, idx: number) => {
    voice.stopSpeaking();
    setSpeakingMsgIndex(idx);
    voice.speak(text, chatLanguage);
  };

  // ── Confirm and proceed ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!sessionId) return;
    voice.stopSpeaking();
    try {
      await confirmCompleteMutation.mutateAsync({
        sessionId,
        editedHistory: editedHistory.trim() || collectedHistory,
      });
      setPageState("done");
      const encoded = encodeURIComponent(editedHistory.trim() || collectedHistory);
      setTimeout(() => setLocation(`${returnTo}?medicalHistory=${encoded}`), 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm");
    }
  };

  // ── Restart ────────────────────────────────────────────────────────────────
  const handleRestart = async () => {
    voice.stopSpeaking();
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

  // ── Resume prompt state ────────────────────────────────────────────────────
  if (pageState === "resume-prompt" && activeSession) {
    const sessionDate = activeSession.createdAt
      ? new Date(activeSession.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <ClipboardList className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">
            {isRtl ? "جلسة سابقة غير مكتملة" : "Unfinished Session Found"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isRtl
              ? `لديك جلسة بدأت بتاريخ ${sessionDate} وتحتوي على ${activeSession.turnCount} ردود. هل تريد الاستمرار؟`
              : `You have an unfinished session from ${sessionDate} with ${activeSession.turnCount} exchanges. Continue where you left off?`
            }
          </p>
        </div>
        <div className="w-full space-y-3">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handleResumeSession}>
            <ArrowRight className="h-4 w-4" />
            {isRtl ? "استمرار الجلسة السابقة" : "Continue Previous Session"}
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={handleStartNew} disabled={startSessionMutation.isPending}>
            {startSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {isRtl ? "بدء جلسة جديدة" : "Start a New Session"}
          </Button>
        </div>
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
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  // ── Review state ───────────────────────────────────────────────────────────
  if (pageState === "review") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
          <div>
            <h1 className="text-xl font-bold">{isRtl ? "مراجعة التاريخ الطبي" : "Review Medical History"}</h1>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "راجع وعدّل قبل الإرسال" : "Review and edit before submitting"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isRtl ? "التاريخ الطبي المجمع" : "Collected Medical History"}</CardTitle>
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
              {isRtl ? "يمكنك تعديل أو إضافة أي معلومات إضافية" : "You can edit or add any additional information"}
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRestart} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {isRtl ? "إعادة البدء" : "Start Over"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmCompleteMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {confirmCompleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
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
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isRtl ? "مساعد طبي ذكي" : "AI Medical Assistant"}
              {voice.isSTTSupported && (
                <span className="text-emerald-600">• {isRtl ? "الإدخال الصوتي متاح" : "Voice input available"}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-speak toggle */}
          {voice.isTTSSupported && (
            <button
              type="button"
              onClick={() => setAutoSpeak(v => !v)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${autoSpeak ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-muted-foreground"}`}
              title={isRtl ? "تشغيل تلقائي للأسئلة" : "Auto-play AI questions"}
            >
              {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Language toggle */}
          <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1.5 text-xs h-8">
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

      {/* Volume control bar */}
      {voice.isTTSSupported && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="text-xs text-muted-foreground shrink-0">{isRtl ? "صوت الذكاء الاصطناعي:" : "AI Voice:"}</span>
          <VolumeControl
            volume={voice.volume}
            onVolumeChange={voice.setVolume}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isRtl={isRtl}
          />
          {voice.isSpeaking && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 animate-pulse">
              <Volume2 className="h-3 w-3" />
              <span>{isRtl ? "يتحدث..." : "Speaking..."}</span>
            </div>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-1 pr-1" style={{ minHeight: 0, maxHeight: "calc(100vh - 420px)" }}>
        {startSessionMutation.isPending && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRtl ? "جاري تحضير المساعد الطبي..." : "Preparing medical assistant..."}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            message={msg}
            isRtl={isRtl}
            onSpeak={(text) => handleSpeakMessage(text, i)}
            onStopSpeak={voice.stopSpeaking}
            isSpeaking={voice.isSpeaking && speakingMsgIndex === i}
            isTTSSupported={voice.isTTSSupported}
          />
        ))}

        {sendMessageMutation.isPending && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">AI</div>
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

      {/* Listening indicator */}
      {voice.isListening && (
        <div className="mb-2">
          <ListeningPulse isRtl={isRtl} />
          {voice.interimTranscript && (
            <p className="text-xs text-muted-foreground italic mt-1 px-1">{voice.interimTranscript}</p>
          )}
        </div>
      )}

      {/* Complete CTA */}
      {isComplete && pageState === "chat" && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              {isRtl ? "تم جمع معلومات كافية! راجع وأكد." : "Sufficient information collected! Review and confirm."}
            </p>
          </div>
          <Button size="sm" onClick={() => setPageState("review")} className="bg-emerald-600 hover:bg-emerald-700 gap-1 shrink-0">
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
              placeholder={
                voice.isListening
                  ? (isRtl ? "جاري الاستماع..." : "Listening...")
                  : (isRtl ? "اكتب ردك هنا... (Enter للإرسال)" : "Type your response here... (Enter to send)")
              }
              rows={2}
              className={`resize-none pr-2 text-sm transition-all ${voice.isListening ? "border-red-400 ring-1 ring-red-300" : ""}`}
              dir={isRtl ? "rtl" : "ltr"}
              disabled={sendMessageMutation.isPending}
            />
          </div>

          {/* STT mic button */}
          {voice.isSTTSupported && (
            <>
              {!voice.isListening ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={voice.startListening}
                  className="h-[60px] w-10 shrink-0 hover:border-emerald-500 hover:text-emerald-600"
                  title={isRtl ? "تسجيل صوتي" : "Voice input"}
                  disabled={sendMessageMutation.isPending}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={voice.stopListening}
                  className="h-[60px] w-10 shrink-0 animate-pulse"
                  title={isRtl ? "إيقاف الاستماع" : "Stop listening"}
                >
                  <MicOff className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {/* Send button */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || sendMessageMutation.isPending || voice.isListening}
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

      {/* Hint bar */}
      {!isComplete && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {isRtl
              ? "Enter للإرسال • Shift+Enter لسطر جديد"
              : "Enter to send • Shift+Enter for new line"}
          </p>
          {voice.isSTTSupported && (
            <p className="text-xs text-muted-foreground">
              {isRtl ? "🎤 انقر على الميكروفون للإدخال الصوتي" : "🎤 Click mic for voice input"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
