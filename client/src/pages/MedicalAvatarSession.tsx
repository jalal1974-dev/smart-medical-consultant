import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User,
  Send,
  Download,
  FileText,
  Image,
  Presentation,
  Brain,
  Loader2,
  ArrowLeft,
  Volume2,
  VolumeX,
  AlertCircle,
  Stethoscope,
  ClipboardList,
  ChevronRight,
  X,
  PenLine,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface QuickReplyGroup {
  label: string;          // group heading shown above buttons
  labelAr: string;
  replies: { en: string; ar: string }[];
}

// ─── Quick-reply catalogue ────────────────────────────────────────────────────
// Each group is shown when the last assistant message contains any of the
// trigger keywords (case-insensitive).
const QUICK_REPLY_GROUPS: Array<{
  triggers: string[];
  triggersAr: string[];
  group: QuickReplyGroup;
}> = [
  {
    triggers: ["scale", "rate", "severity", "1 to 10", "1-10", "out of 10", "how bad", "how severe", "how much pain", "pain level"],
    triggersAr: ["مقياس", "شدة", "من 1", "من عشرة", "كم", "ألم", "درجة"],
    group: {
      label: "Pain / Severity Scale",
      labelAr: "مقياس الشدة / الألم",
      replies: [
        { en: "1 – Barely noticeable", ar: "١ – بالكاد أشعر به" },
        { en: "2 – Very mild", ar: "٢ – خفيف جداً" },
        { en: "3 – Mild", ar: "٣ – خفيف" },
        { en: "4 – Moderate", ar: "٤ – متوسط" },
        { en: "5 – Uncomfortable", ar: "٥ – مزعج" },
        { en: "6 – Distressing", ar: "٦ – مؤلم نسبياً" },
        { en: "7 – Severe", ar: "٧ – شديد" },
        { en: "8 – Very severe", ar: "٨ – شديد جداً" },
        { en: "9 – Excruciating", ar: "٩ – لا يُحتمل" },
        { en: "10 – Worst possible", ar: "١٠ – أشد ما يمكن" },
      ],
    },
  },
  {
    triggers: ["yes or no", "do you have", "have you", "are you", "did you", "does it", "is there", "any ", "ever had"],
    triggersAr: ["هل لديك", "هل تعاني", "هل سبق", "هل يوجد", "هل"],
    group: {
      label: "Yes / No",
      labelAr: "نعم / لا",
      replies: [
        { en: "Yes", ar: "نعم" },
        { en: "No", ar: "لا" },
        { en: "Sometimes", ar: "أحياناً" },
        { en: "Not sure", ar: "غير متأكد" },
      ],
    },
  },
  {
    triggers: ["when did", "how long", "started", "duration", "begin", "onset", "since when", "how many days", "how many weeks"],
    triggersAr: ["متى بدأ", "منذ متى", "كم يوم", "كم أسبوع", "منذ"],
    group: {
      label: "Duration",
      labelAr: "المدة الزمنية",
      replies: [
        { en: "Today (less than 24 h)", ar: "اليوم (أقل من ٢٤ ساعة)" },
        { en: "2–3 days", ar: "٢–٣ أيام" },
        { en: "About a week", ar: "حوالي أسبوع" },
        { en: "2–4 weeks", ar: "٢–٤ أسابيع" },
        { en: "1–3 months", ar: "١–٣ أشهر" },
        { en: "More than 3 months", ar: "أكثر من ٣ أشهر" },
      ],
    },
  },
  {
    triggers: ["describe", "character", "nature", "type of pain", "what does it feel", "what kind", "how would you describe"],
    triggersAr: ["صف", "طبيعة", "نوع", "كيف تصف"],
    group: {
      label: "Pain Character",
      labelAr: "طبيعة الألم",
      replies: [
        { en: "Sharp / stabbing", ar: "حاد / طعن" },
        { en: "Dull / aching", ar: "خفيف / وجع" },
        { en: "Burning", ar: "حرقة" },
        { en: "Throbbing / pulsating", ar: "نابض" },
        { en: "Cramping / squeezing", ar: "تقلص / ضغط" },
        { en: "Pressure / tightness", ar: "ضغط / شد" },
        { en: "Tingling / numbness", ar: "وخز / تنميل" },
      ],
    },
  },
  {
    triggers: ["spread", "radiate", "radiation", "move", "travel", "go to", "extend", "does it go"],
    triggersAr: ["ينتشر", "يمتد", "ينتقل", "يصل إلى"],
    group: {
      label: "Radiation",
      labelAr: "انتشار الألم",
      replies: [
        { en: "Stays in one place", ar: "يبقى في مكانه" },
        { en: "Spreads to the shoulder", ar: "يمتد للكتف" },
        { en: "Spreads to the arm / jaw", ar: "يمتد للذراع / الفك" },
        { en: "Spreads to the back", ar: "يمتد للظهر" },
        { en: "Spreads down the leg", ar: "يمتد للساق" },
        { en: "Spreads to the neck", ar: "يمتد للرقبة" },
      ],
    },
  },
  {
    triggers: ["make it better", "relieve", "alleviating", "improve", "helps", "what helps", "reduce"],
    triggersAr: ["يخفف", "يحسن", "يساعد", "يريح"],
    group: {
      label: "Relieving Factors",
      labelAr: "العوامل المخففة",
      replies: [
        { en: "Rest", ar: "الراحة" },
        { en: "Pain medication", ar: "مسكنات الألم" },
        { en: "Heat / warm compress", ar: "الحرارة / كمادات دافئة" },
        { en: "Cold / ice pack", ar: "البرودة / كمادات باردة" },
        { en: "Eating / drinking", ar: "الأكل / الشرب" },
        { en: "Lying down", ar: "الاستلقاء" },
        { en: "Nothing helps", ar: "لا شيء يساعد" },
      ],
    },
  },
  {
    triggers: ["make it worse", "aggravat", "trigger", "worsen", "increase", "exacerbat", "what causes"],
    triggersAr: ["يزيد", "يسوء", "يؤدي إلى", "يسبب"],
    group: {
      label: "Aggravating Factors",
      labelAr: "العوامل المفاقمة",
      replies: [
        { en: "Movement / exercise", ar: "الحركة / الرياضة" },
        { en: "Deep breathing", ar: "التنفس العميق" },
        { en: "Eating", ar: "الأكل" },
        { en: "Stress / anxiety", ar: "التوتر / القلق" },
        { en: "Cold weather", ar: "الطقس البارد" },
        { en: "Lying flat", ar: "الاستلقاء" },
        { en: "Nothing specific", ar: "لا شيء محدد" },
      ],
    },
  },
  {
    triggers: ["associated", "other symptoms", "anything else", "accompanying", "along with", "besides"],
    triggersAr: ["أعراض أخرى", "مصاحب", "بالإضافة", "غير ذلك"],
    group: {
      label: "Associated Symptoms",
      labelAr: "الأعراض المصاحبة",
      replies: [
        { en: "Nausea / vomiting", ar: "غثيان / قيء" },
        { en: "Fever / chills", ar: "حمى / قشعريرة" },
        { en: "Shortness of breath", ar: "ضيق تنفس" },
        { en: "Dizziness / fainting", ar: "دوخة / إغماء" },
        { en: "Fatigue / weakness", ar: "إرهاق / ضعف" },
        { en: "Sweating", ar: "تعرق" },
        { en: "No other symptoms", ar: "لا أعراض أخرى" },
      ],
    },
  },
  {
    triggers: ["constant", "intermittent", "come and go", "continuous", "pattern", "frequency", "how often"],
    triggersAr: ["مستمر", "متقطع", "يأتي ويذهب", "كم مرة", "كيف"],
    group: {
      label: "Pattern / Frequency",
      labelAr: "النمط / التكرار",
      replies: [
        { en: "Constant (never stops)", ar: "مستمر (لا يتوقف)" },
        { en: "Comes and goes", ar: "يأتي ويذهب" },
        { en: "Several times a day", ar: "عدة مرات يومياً" },
        { en: "Once a day", ar: "مرة في اليوم" },
        { en: "A few times a week", ar: "بضع مرات أسبوعياً" },
        { en: "Occasional / random", ar: "عرضي / غير منتظم" },
      ],
    },
  },
  {
    triggers: ["medical history", "past medical", "previous", "chronic", "conditions", "diagnosed", "suffer from"],
    triggersAr: ["تاريخ طبي", "أمراض سابقة", "مزمن", "تشخيص", "تعاني من"],
    group: {
      label: "Medical History",
      labelAr: "التاريخ الطبي",
      replies: [
        { en: "Diabetes", ar: "السكري" },
        { en: "Hypertension", ar: "ضغط الدم" },
        { en: "Heart disease", ar: "أمراض القلب" },
        { en: "Asthma / COPD", ar: "الربو / أمراض الرئة" },
        { en: "Thyroid disorder", ar: "اضطراب الغدة الدرقية" },
        { en: "No chronic conditions", ar: "لا أمراض مزمنة" },
      ],
    },
  },
  {
    triggers: ["medication", "medicine", "drug", "taking any", "current medication", "treatment"],
    triggersAr: ["دواء", "أدوية", "علاج", "تتناول"],
    group: {
      label: "Medications",
      labelAr: "الأدوية",
      replies: [
        { en: "No medications", ar: "لا أتناول أدوية" },
        { en: "Pain relievers (e.g. ibuprofen)", ar: "مسكنات (مثل إيبوبروفين)" },
        { en: "Blood pressure medication", ar: "أدوية ضغط الدم" },
        { en: "Diabetes medication / insulin", ar: "أدوية السكري / إنسولين" },
        { en: "Antibiotics", ar: "مضادات حيوية" },
        { en: "I'll list them in writing", ar: "سأذكرها كتابةً" },
      ],
    },
  },
  {
    triggers: ["allerg", "reaction", "sensitive to", "intolerant"],
    triggersAr: ["حساسية", "تفاعل", "حساس"],
    group: {
      label: "Allergies",
      labelAr: "الحساسية",
      replies: [
        { en: "No known allergies", ar: "لا توجد حساسية معروفة" },
        { en: "Penicillin / antibiotics", ar: "البنسلين / مضادات حيوية" },
        { en: "NSAIDs (aspirin / ibuprofen)", ar: "مضادات الالتهاب (أسبرين / إيبوبروفين)" },
        { en: "Latex", ar: "اللاتكس" },
        { en: "Food allergy", ar: "حساسية غذائية" },
      ],
    },
  },
  {
    triggers: ["smoke", "smoking", "alcohol", "drink", "lifestyle", "exercise", "diet"],
    triggersAr: ["تدخين", "كحول", "نمط حياة", "رياضة", "غذاء"],
    group: {
      label: "Lifestyle",
      labelAr: "نمط الحياة",
      replies: [
        { en: "Non-smoker", ar: "لا أدخن" },
        { en: "Current smoker", ar: "أدخن حالياً" },
        { en: "Ex-smoker", ar: "أدخنت سابقاً" },
        { en: "No alcohol", ar: "لا أشرب الكحول" },
        { en: "Sedentary lifestyle", ar: "نمط حياة خامل" },
        { en: "Physically active", ar: "نشيط بدنياً" },
      ],
    },
  },
];

// ─── Detect which quick-reply group to show ───────────────────────────────────
function detectQuickReplyGroup(
  lastAssistantMessage: string,
  language: "en" | "ar"
): QuickReplyGroup | null {
  const lower = lastAssistantMessage.toLowerCase();
  for (const entry of QUICK_REPLY_GROUPS) {
    const triggers = language === "ar" ? entry.triggersAr : entry.triggers;
    const allTriggers = [...entry.triggers, ...entry.triggersAr]; // always check both
    if (allTriggers.some((t) => lower.includes(t.toLowerCase()))) {
      return entry.group;
    }
  }
  return null;
}

// ─── Avatar Video Panel ───────────────────────────────────────────────────────
function AvatarVideoPanel({
  isActive,
  isSpeaking,
  language,
}: {
  isActive: boolean;
  isSpeaking: boolean;
  language: "en" | "ar";
}) {
  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl overflow-hidden flex items-center justify-center border border-border">
      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-300 ${
            isSpeaking ? "ring-4 ring-primary ring-offset-2 scale-105" : ""
          }`}
        >
          <Stethoscope className="w-14 h-14 text-primary" />
          {isSpeaking && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {language === "ar" ? "الطبيب المساعد الذكي" : "AI Clinical Intake Doctor"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isActive
              ? isSpeaking
                ? language === "ar" ? "يتحدث..." : "Speaking..."
                : language === "ar" ? "جاهز للمحادثة" : "Ready to continue"
              : language === "ar"
              ? "صف أعراضك أدناه للبدء"
              : "Describe your symptoms below to begin"}
          </p>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground text-center border border-border">
          {language === "ar"
            ? "🎥 سيتم تفعيل الفيديو التفاعلي عند إضافة مفتاح HeyGen API"
            : "🎥 Interactive video activates when HeyGen API key is configured"}
        </div>
      </div>
    </div>
  );
}

// ─── Document Download Panel ──────────────────────────────────────────────────
function DocumentPanel({
  consultation,
  language,
}: {
  consultation: any;
  language: "en" | "ar";
}) {
  const docs = [
    {
      key: "aiReportUrl",
      label: language === "ar" ? "التقرير الطبي (PDF)" : "Medical Report (PDF)",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      sent: consultation.sentPdfToPatient,
    },
    {
      key: "aiInfographicUrl",
      label: language === "ar" ? "الإنفوغرافيك" : "Infographic",
      icon: Image,
      color: "text-purple-600",
      bg: "bg-purple-50",
      sent: consultation.sentInfographicToPatient,
    },
    {
      key: "aiSlideDeckUrl",
      label: language === "ar" ? "عرض الشرائح" : "Slide Deck",
      icon: Presentation,
      color: "text-green-600",
      bg: "bg-green-50",
      sent: consultation.sentSlidesToPatient,
    },
    {
      key: "aiMindMapUrl",
      label: language === "ar" ? "خريطة ذهنية" : "Mind Map",
      icon: Brain,
      color: "text-orange-600",
      bg: "bg-orange-50",
      sent: consultation.sentMindMapToPatient,
    },
  ];

  const available = docs.filter((d) => consultation[d.key] && d.sent);

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <ClipboardList className="w-9 h-9 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {language === "ar"
            ? "لا توجد وثائق متاحة بعد.\nستظهر هنا بعد مراجعة الطبيب المتخصص."
            : "No documents available yet.\nThey will appear here after the specialist doctor reviews your case."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {available.map((doc) => {
        const Icon = doc.icon;
        return (
          <a
            key={doc.key}
            href={consultation[doc.key]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors group"
          >
            <div className={`w-9 h-9 rounded-lg ${doc.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${doc.color}`} />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{doc.label}</span>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        );
      })}
    </div>
  );
}

// ─── Quick-reply strip ────────────────────────────────────────────────────────
function QuickReplyStrip({
  group,
  language,
  onSelect,
  onOther,
  onDismiss,
  disabled,
}: {
  group: QuickReplyGroup;
  language: "en" | "ar";
  onSelect: (text: string) => void;
  onOther: () => void;
  onDismiss: () => void;
  disabled: boolean;
}) {
  const isRtl = language === "ar";
  const label = language === "ar" ? group.labelAr : group.label;

  return (
    <div
      className="border-t border-border bg-muted/30 overflow-hidden"
      style={{
        animation: "quickReplySlideUp 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <style>{`
        @keyframes quickReplySlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header row */}
      <div className="flex items-center gap-1 px-4 pt-2 pb-1">
        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <p className="text-[10px] font-medium text-muted-foreground flex-1 truncate">{label}</p>
        <button
          onClick={onDismiss}
          title={language === "ar" ? "إخفاء الاقتراحات" : "Dismiss suggestions"}
          className="ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontally scrollable button row */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {group.replies.map((r, i) => {
          const text = language === "ar" ? r.ar : r.en;
          return (
            <button
              key={i}
              onClick={() => onSelect(text)}
              disabled={disabled}
              className="inline-flex items-center whitespace-nowrap flex-shrink-0 px-3 py-1 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {text}
            </button>
          );
        })}
        {/* Other button — always last */}
        <button
          onClick={onOther}
          disabled={disabled}
          className="inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0 px-3 py-1 rounded-full border border-dashed border-border bg-background text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PenLine className="w-3 h-3" />
          {language === "ar" ? "أخرى..." : "Other..."}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MedicalAvatarSession() {
  const [, params] = useRoute("/consultation/:id/avatar");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const consultationId = params?.id ? parseInt(params.id) : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [quickRepliesDismissed, setQuickRepliesDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: consultations } = trpc.consultation.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const consultation = consultations?.find((c: any) => c.id === consultationId);

  // ── Detect quick-reply group from last assistant message ───────────────────
  // Reset dismissed state whenever a new assistant message arrives
  const lastAssistantMsgCount = useMemo(
    () => messages.filter((m) => m.role === "assistant").length,
    [messages]
  );
  useEffect(() => {
    setQuickRepliesDismissed(false);
  }, [lastAssistantMsgCount]);

  const quickReplyGroup = useMemo<QuickReplyGroup | null>(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return null;
    return detectQuickReplyGroup(lastAssistant.content, language);
  }, [messages, language]);

  const initSession = trpc.avatarSession.getOrCreate.useMutation({
    onSuccess: (session) => {
      try {
        const history: ChatMessage[] = JSON.parse(session.transcript || "[]");
        if (history.length > 0) setMessages(history);
      } catch {
        // ignore parse errors
      }
    },
  });

  const chatMutation = trpc.avatarSession.chat.useMutation({
    onSuccess: (data) => {
      const replyText = typeof data.reply === "string" ? data.reply : String(data.reply);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: replyText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (!isMuted && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(replyText);
        utterance.lang = language === "ar" ? "ar-SA" : "en-US";
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to get response");
    },
  });

  // ── Init session on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (consultationId && isAuthenticated) {
      initSession.mutate({ consultationId });
    }
  }, [consultationId, isAuthenticated]);

  useEffect(() => {
    if (consultation?.preferredLanguage) {
      setLanguage(consultation.preferredLanguage as "en" | "ar");
    }
  }, [consultation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ── Send helpers ───────────────────────────────────────────────────────────
  const handleSend = useCallback(
    (overrideText?: string) => {
      const text = overrideText ?? input.trim();
      if (!text || !consultationId || chatMutation.isPending) return;
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text, timestamp: Date.now() },
      ]);
      chatMutation.mutate({ consultationId, message: text, language });
      if (!overrideText) setInput("");
    },
    [input, consultationId, chatMutation, language]
  );

  // Quick-reply: append to textarea OR send immediately
  const handleQuickReply = useCallback(
    (text: string) => {
      if (input.trim()) {
        setInput((prev) => prev.trim() + " " + text);
        inputRef.current?.focus();
      } else {
        handleSend(text);
      }
    },
    [input, handleSend]
  );

  // "Other" button: focus the textarea so the patient can type freely
  const handleOther = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMute = () => {
    if (!isMuted) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    setIsMuted((m) => !m);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Please log in to access your clinical intake session.</p>
      </div>
    );
  }

  if (consultations && !consultation) {
    return (
      <div className="container py-20 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-muted-foreground">Consultation not found or you don't have access to it.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isRtl = language === "ar";

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── Header ── */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            {language === "ar" ? "لوحة التحكم" : "Dashboard"}
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
              {language === "ar" ? "جلسة الفحص الأولي" : "Clinical Intake Session"}
              {consultation && (
                <span className="text-muted-foreground font-normal">
                  — {consultation.patientName}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={language === "ar" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setLanguage("ar")}
            >
              AR
            </Badge>
            <Badge
              variant={language === "en" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setLanguage("en")}
            >
              EN
            </Badge>
            <Button variant="ghost" size="icon" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Avatar + Documents ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <AvatarVideoPanel isActive={messages.length > 0} isSpeaking={isSpeaking} language={language} />

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-muted-foreground" />
                {language === "ar" ? "وثائقك الطبية" : "Your Medical Documents"}
              </h3>
              {consultation ? (
                <DocumentPanel consultation={consultation} language={language} />
              ) : (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </Card>
          </div>

          {/* ── Right: Chat ── */}
          <div className="lg:col-span-2">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: "520px" }}>
              {/* Chat header */}
              <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {language === "ar" ? "الطبيب المساعد الذكي" : "AI Clinical Intake Doctor"}
                </span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {language === "ar" ? "جمع المعلومات" : "History Taking"}
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                {initSession.isPending && messages.length === 0 ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="w-8 h-8 text-primary/60" />
                    </div>
                    <div className="max-w-sm">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {language === "ar" ? "ابدأ جلسة الفحص الأولي" : "Begin Your Clinical Intake"}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {language === "ar"
                          ? "سيرحب بك الطبيب المساعد ويبدأ بأخذ تاريخك المرضي بشكل منهجي. صف أعراضك الرئيسية للبدء."
                          : "The AI doctor will greet you and begin taking your medical history. Describe your main symptoms to get started."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        handleSend(
                          language === "ar"
                            ? "مرحباً، أريد البدء في جلسة الفحص الأولي."
                            : "Hello, I'd like to begin my clinical intake session."
                        )
                      }
                      disabled={chatMutation.isPending || !consultationId}
                    >
                      <Stethoscope className="w-4 h-4" />
                      {language === "ar" ? "ابدأ الجلسة" : "Start Session"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === "assistant" ? "bg-primary/10" : "bg-secondary"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <Stethoscope className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-foreground" />
                          )}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "assistant"
                              ? "bg-card border border-border text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                          dir={isRtl ? "rtl" : "ltr"}
                        >
                          {msg.content}
                          <div
                            className={`text-[10px] mt-1 opacity-60 ${
                              msg.role === "user" ? "text-right" : "text-left"
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Stethoscope className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {language === "ar" ? "جاري التحليل..." : "Analyzing..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* ── Quick-reply strip (contextual) ── */}
              {quickReplyGroup && messages.length > 0 && !quickRepliesDismissed && (
                <QuickReplyStrip
                  group={quickReplyGroup}
                  language={language}
                  onSelect={handleQuickReply}
                  onOther={handleOther}
                  onDismiss={() => setQuickRepliesDismissed(true)}
                  disabled={chatMutation.isPending}
                />
              )}

              {/* Disclaimer */}
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {language === "ar"
                    ? "هذه الجلسة لجمع المعلومات فقط. سيراجع طبيب متخصص كل شيء."
                    : "This session is for information gathering only. A specialist doctor will review everything."}
                </p>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    language === "ar"
                      ? "اكتب ردك هنا، أو اختر من الخيارات أعلاه..."
                      : "Type your response, or tap a quick reply above..."
                  }
                  className="flex-1 resize-none min-h-[44px] max-h-[120px]"
                  rows={1}
                  dir={isRtl ? "rtl" : "ltr"}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || chatMutation.isPending}
                  size="icon"
                  className="self-end"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
