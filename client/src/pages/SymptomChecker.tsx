import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mic, Square, Send, Loader2, CheckCircle2,
  Globe, Stethoscope, ArrowRight, RotateCcw, Heart,
  Brain, Eye, Bone, Baby, Pill, Activity, Zap
} from "lucide-react";
import { Header } from "@/components/Header";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

interface SpecialtyResult {
  specialty: string;
  specialtyAr: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  icon: string;
}

// ─── Specialty icon map ───────────────────────────────────────────────────────
const SPECIALTY_ICONS: Record<string, React.ReactNode> = {
  cardiology: <Heart className="h-5 w-5" />,
  neurology: <Brain className="h-5 w-5" />,
  ophthalmology: <Eye className="h-5 w-5" />,
  orthopedics: <Bone className="h-5 w-5" />,
  pediatrics: <Baby className="h-5 w-5" />,
  general: <Stethoscope className="h-5 w-5" />,
  pharmacy: <Pill className="h-5 w-5" />,
  internal: <Activity className="h-5 w-5" />,
  emergency: <Zap className="h-5 w-5" />,
};

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ message, isRtl }: { message: ChatMessage; isRtl: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
          <Stethoscope className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
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
export default function SymptomChecker() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const [chatLanguage, setChatLanguage] = useState<"en" | "ar">(language as "en" | "ar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [result, setResult] = useState<SpecialtyResult | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isRtl = chatLanguage === "ar";

  const transcribeMutation = trpc.voiceTranscription.transcribe.useMutation();
  const uploadMutation = trpc.upload.file.useMutation();
  const sendMessageMutation = trpc.symptomChecker.chat.useMutation();

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start with greeting on mount
  useEffect(() => {
    if (!loading) startGreeting();
  }, [loading, chatLanguage]);

  const startGreeting = () => {
    const greeting: ChatMessage = {
      role: "assistant",
      content: chatLanguage === "ar"
        ? "مرحباً! أنا مساعدك الطبي الذكي. أخبرني عن الأعراض التي تشعر بها، وسأساعدك في تحديد التخصص الطبي المناسب لحالتك.\n\nما هي الأعراض الرئيسية التي تعاني منها؟"
        : "Hello! I'm your AI symptom checker. Tell me about your symptoms and I'll help identify the most appropriate medical specialty for your condition.\n\nWhat are your main symptoms?",
      timestamp: Date.now(),
    };
    setMessages([greeting]);
    setSessionId(`symptom-${Date.now()}`);
    setTurnCount(0);
    setResult(null);
  };



  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    setInputText("");
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setTurnCount(t => t + 1);
    setIsThinking(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        message: text,
        history: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        language: chatLanguage,
        turnCount: turnCount + 1,
      });

      // Parse specialty result if present
      let displayContent = result.reply;
      const specialtyMatch = result.reply.match(/\[SPECIALTY_RESULT\]([\s\S]*?)\[\/SPECIALTY_RESULT\]/);
      if (specialtyMatch) {
        displayContent = result.reply.replace(/\[SPECIALTY_RESULT\][\s\S]*?\[\/SPECIALTY_RESULT\]/, "").trim();
        try {
          const parsed = JSON.parse(specialtyMatch[1].trim()) as SpecialtyResult;
          setResult(parsed);
        } catch { /* ignore parse errors */ }
      }

      const aiMsg: ChatMessage = { role: "assistant", content: displayContent, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to get response");
    } finally {
      setIsThinking(false);
    }
  };

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
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 16 * 1024 * 1024) { toast.error("Recording too large"); return; }
        setIsTranscribing(true);
        try {
          const file = new File([blob], "recording.webm", { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", file);
              const reader = new FileReader();
          reader.readAsDataURL(blob);
          await new Promise<void>((resolve) => { reader.onloadend = () => resolve(); });
          const base64Data = (reader.result as string).split(',')[1];
          const uploadResult = await uploadMutation.mutateAsync({
            fileName: `symptom-voice-${Date.now()}.webm`,
            fileData: base64Data,
            fileType: 'audio/webm',
            category: 'audio',
          });
          const transcribeResult = await transcribeMutation.mutateAsync({ audioUrl: uploadResult.url, language: chatLanguage });
          if (transcribeResult.text) {
            setInputText(prev => prev ? `${prev} ${transcribeResult.text}` : transcribeResult.text);
          }
        } catch (err: any) {
          toast.error("Transcription failed");
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const toggleLanguage = () => {
    const newLang = chatLanguage === "en" ? "ar" : "en";
    setChatLanguage(newLang);
  };

  const handleProceedToConsultation = () => {
    setLocation("/consultations");
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 container py-6 max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {isRtl ? "فاحص الأعراض الذكي" : "AI Symptom Checker"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isRtl ? "اكتشف التخصص الطبي المناسب لأعراضك" : "Find the right medical specialty for your symptoms"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" />
              {chatLanguage === "en" ? "العربية" : "English"}
            </Button>
            <Button variant="ghost" size="sm" onClick={startGreeting} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              {isRtl ? "إعادة" : "Restart"}
            </Button>
          </div>
        </div>

        {/* Not logged in notice */}
        {!isAuthenticated && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <span>{isRtl ? "سجّل دخولك لحفظ نتائجك وتقديم استشارة" : "Sign in to save results and submit a consultation"}</span>
            <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => window.location.href = getLoginUrl()}>
              {isRtl ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </div>
        )}

        {/* Specialty result card */}
        {result && (
          <div className="mb-4 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                {SPECIALTY_ICONS[result.specialty] ?? <Stethoscope className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-blue-800 dark:text-blue-300">
                    {isRtl ? result.specialtyAr : result.specialty.charAt(0).toUpperCase() + result.specialty.slice(1)}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-xs ${result.confidence === "high" ? "border-green-400 text-green-700" : result.confidence === "medium" ? "border-amber-400 text-amber-700" : "border-slate-400 text-slate-600"}`}
                  >
                    {result.confidence === "high" ? (isRtl ? "ثقة عالية" : "High Confidence") : result.confidence === "medium" ? (isRtl ? "ثقة متوسطة" : "Medium Confidence") : (isRtl ? "ثقة منخفضة" : "Low Confidence")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{result.reason}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={handleProceedToConsultation}
              >
                <ArrowRight className="h-4 w-4" />
                {isRtl ? "تقديم استشارة" : "Submit Consultation"}
              </Button>
              <Button variant="outline" size="sm" onClick={startGreeting}>
                {isRtl ? "إعادة الفحص" : "Check Again"}
              </Button>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ minHeight: "420px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ maxHeight: "380px" }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} isRtl={isRtl} />
            ))}
            {isThinking && (
              <div className="flex justify-start mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-card border border-border flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-muted-foreground">{isRtl ? "جاري التحليل..." : "Analyzing..."}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border p-3 bg-background">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRtl ? "اكتب أعراضك هنا..." : "Describe your symptoms here..."}
                className="resize-none text-sm min-h-[44px] max-h-[120px]"
                rows={1}
                dir={isRtl ? "rtl" : "ltr"}
                disabled={isThinking || !!result}
              />
              <div className="flex gap-1.5 shrink-0">
                {isTranscribing ? (
                  <Button size="icon" variant="outline" disabled className="h-10 w-10">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                ) : isRecording ? (
                  <Button size="icon" variant="destructive" onClick={stopRecording} className="h-10 w-10 animate-pulse">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="icon" variant="outline" onClick={startRecording} disabled={isThinking || !!result} className="h-10 w-10">
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isThinking || !!result}
                  className="h-10 w-10 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              {isRtl
                ? "⚠️ هذا ليس تشخيصاً طبياً — استشر طبيباً مختصاً دائماً"
                : "⚠️ This is not a medical diagnosis — always consult a qualified doctor"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
