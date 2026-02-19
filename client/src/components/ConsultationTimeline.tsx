import { CheckCircle2, Clock, AlertCircle, FileText, Brain, UserCheck } from "lucide-react";

interface TimelineStep {
  status: "completed" | "current" | "pending";
  label: string;
  icon: React.ReactNode;
  date?: Date;
}

interface ConsultationTimelineProps {
  consultationStatus: string;
  createdAt: Date;
  language: "en" | "ar";
}

export function ConsultationTimeline({ consultationStatus, createdAt, language }: ConsultationTimelineProps) {
  const statusMap: Record<string, number> = {
    submitted: 1,
    ai_processing: 2,
    specialist_review: 3,
    completed: 4,
    cancelled: 0,
  };

  const currentStep = statusMap[consultationStatus] || 0;

  const steps: TimelineStep[] = [
    {
      status: currentStep >= 1 ? "completed" : "pending",
      label: language === "ar" ? "تم الإرسال" : "Submitted",
      icon: <FileText className="w-5 h-5" />,
      date: currentStep >= 1 ? createdAt : undefined,
    },
    {
      status: currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "pending",
      label: language === "ar" ? "التحليل بالذكاء الاصطناعي" : "AI Analysis",
      icon: <Brain className="w-5 h-5" />,
    },
    {
      status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "pending",
      label: language === "ar" ? "مراجعة الأخصائي" : "Specialist Review",
      icon: <UserCheck className="w-5 h-5" />,
    },
    {
      status: currentStep >= 4 ? "completed" : currentStep === 3 ? "current" : "pending",
      label: language === "ar" ? "مكتمل" : "Completed",
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
  ];

  if (consultationStatus === "cancelled") {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <span className="text-sm font-medium text-red-700 dark:text-red-300">
          {language === "ar" ? "تم الإلغاء" : "Cancelled"}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center flex-1 relative">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute top-6 ${language === "ar" ? "right-1/2" : "left-1/2"} w-full h-0.5 ${
                  step.status === "completed" ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                }`}
                style={{ transform: language === "ar" ? "translateX(50%)" : "translateX(50%)" }}
              />
            )}

            {/* Icon Circle */}
            <div
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                step.status === "completed"
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : step.status === "current"
                  ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400"
              }`}
            >
              {step.status === "current" ? <Clock className="w-5 h-5" /> : step.icon}
            </div>

            {/* Label */}
            <div className="mt-2 text-center">
              <p
                className={`text-xs font-medium ${
                  step.status === "completed" || step.status === "current"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {step.date.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
