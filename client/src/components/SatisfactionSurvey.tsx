import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface SatisfactionSurveyProps {
  consultationId: number;
  onComplete?: () => void;
}

export function SatisfactionSurvey({ consultationId, onComplete }: SatisfactionSurveyProps) {
  const { language } = useLanguage();

  const [overallRating, setOverallRating] = useState(0);
  const [aiQualityRating, setAiQualityRating] = useState(0);
  const [specialistRating, setSpecialistRating] = useState(0);
  const [responseTimeRating, setResponseTimeRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | undefined>();

  const submitSurvey = trpc.survey.submit.useMutation({
    onSuccess: () => {
      toast.success(
        language === "ar" ? "شكراً لك!" : "Thank you!",
        {
          description: language === "ar" 
            ? "تم إرسال تقييمك بنجاح" 
            : "Your feedback has been submitted successfully",
        }
      );
      onComplete?.();
    },
    onError: (error) => {
      toast.error(
        language === "ar" ? "خطأ" : "Error",
        { description: error.message }
      );
    },
  });

  const handleSubmit = () => {
    if (overallRating === 0) {
      toast.error(
        language === "ar" ? "خطأ" : "Error",
        {
          description: language === "ar" 
            ? "يرجى تقييم الخدمة بشكل عام" 
            : "Please provide an overall rating",
        }
      );
      return;
    }

    submitSurvey.mutate({
      consultationId,
      overallRating,
      aiQualityRating: aiQualityRating || undefined,
      specialistRating: specialistRating || undefined,
      responseTimeRating: responseTimeRating || undefined,
      feedback: feedback || undefined,
      wouldRecommend,
    });
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-colors"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const t = (key: string) => {
    const translations: Record<string, { en: string; ar: string }> = {
      title: { en: "How was your experience?", ar: "كيف كانت تجربتك؟" },
      description: { en: "Your feedback helps us improve our service", ar: "ملاحظاتك تساعدنا على تحسين خدمتنا" },
      overallRating: { en: "Overall Satisfaction *", ar: "الرضا العام *" },
      aiQuality: { en: "AI Analysis Quality", ar: "جودة التحليل بالذكاء الاصطناعي" },
      specialistReview: { en: "Specialist Review Quality", ar: "جودة مراجعة الأخصائي" },
      responseTime: { en: "Response Time", ar: "سرعة الاستجابة" },
      feedback: { en: "Additional Feedback (Optional)", ar: "ملاحظات إضافية (اختياري)" },
      feedbackPlaceholder: { en: "Tell us more about your experience...", ar: "أخبرنا المزيد عن تجربتك..." },
      recommend: { en: "Would you recommend our service?", ar: "هل توصي بخدمتنا؟" },
      yes: { en: "Yes", ar: "نعم" },
      no: { en: "No", ar: "لا" },
      submit: { en: "Submit Feedback", ar: "إرسال التقييم" },
    };
    return translations[key]?.[language] || key;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StarRating
          value={overallRating}
          onChange={setOverallRating}
          label={t("overallRating")}
        />

        <StarRating
          value={aiQualityRating}
          onChange={setAiQualityRating}
          label={t("aiQuality")}
        />

        <StarRating
          value={specialistRating}
          onChange={setSpecialistRating}
          label={t("specialistReview")}
        />

        <StarRating
          value={responseTimeRating}
          onChange={setResponseTimeRating}
          label={t("responseTime")}
        />

        <div className="space-y-2">
          <Label htmlFor="feedback">{t("feedback")}</Label>
          <Textarea
            id="feedback"
            placeholder={t("feedbackPlaceholder")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("recommend")}</Label>
          <RadioGroup
            value={wouldRecommend === undefined ? "" : wouldRecommend ? "yes" : "no"}
            onValueChange={(v) => setWouldRecommend(v === "yes")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes" className="font-normal cursor-pointer">
                {t("yes")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no" className="font-normal cursor-pointer">
                {t("no")}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitSurvey.isPending || overallRating === 0}
          className="w-full"
        >
          {submitSurvey.isPending ? (language === "ar" ? "جاري الإرسال..." : "Submitting...") : t("submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
