import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DisclaimerGateProps {
  onAcknowledged: () => void;
}

/**
 * DisclaimerGate — shown once per user before AI-generated medical reports
 * are revealed on the patient Dashboard.  After the user checks the box and
 * clicks "Confirm", the acknowledgment is persisted in the DB so this gate
 * never appears again for that account.
 */
export function DisclaimerGate({ onAcknowledged }: DisclaimerGateProps) {
  const [checked, setChecked] = useState(false);
  const utils = trpc.useUtils();

  const acknowledge = trpc.auth.acknowledgeDisclaimer.useMutation({
    onSuccess: () => {
      // Invalidate the me query so ctx.user.disclaimerAcknowledgedAt is refreshed
      utils.auth.me.invalidate();
      onAcknowledged();
    },
    onError: () => {
      toast.error("Could not save your acknowledgment. Please try again.");
    },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Medical Disclaimer / إخلاء المسؤولية الطبية
            </h2>
          </div>
        </div>

        {/* English disclaimer */}
        <div className="mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            The AI-generated reports and analyses provided on this platform are intended
            for <strong className="text-foreground">informational and educational purposes only</strong>.
            They do <strong className="text-foreground">not</strong> constitute a medical diagnosis,
            professional medical advice, or a substitute for consultation with a qualified
            healthcare provider.
          </p>
          <p>
            Always seek the advice of your physician or other qualified health professional
            regarding any medical condition or treatment. Never disregard professional medical
            advice or delay seeking it because of information provided by this platform.
          </p>
          <p>
            By proceeding, you acknowledge that the AI outputs may contain errors and that
            the platform and its operators assume <strong className="text-foreground">no liability</strong> for
            decisions made based on these reports.
          </p>
        </div>

        {/* Arabic disclaimer */}
        <div className="mb-6 text-sm text-muted-foreground leading-relaxed space-y-2 text-right" dir="rtl">
          <p>
            التقارير والتحليلات التي يولّدها الذكاء الاصطناعي على هذه المنصة مخصصة
            <strong className="text-foreground"> للأغراض المعلوماتية والتعليمية فحسب</strong>.
            وهي <strong className="text-foreground">لا</strong> تُشكّل تشخيصاً طبياً أو نصيحة طبية
            متخصصة، ولا تُغني عن استشارة مقدّم رعاية صحية مؤهَّل.
          </p>
          <p>
            استشر دائماً طبيبك أو أي متخصص صحي مؤهَّل آخر بشأن أي حالة طبية أو علاج.
            لا تتجاهل النصيحة الطبية المتخصصة أو تتأخر في طلبها بسبب المعلومات الواردة
            في هذه المنصة.
          </p>
          <p>
            بالمتابعة، تُقرّ بأن مخرجات الذكاء الاصطناعي قد تحتوي على أخطاء، وأن المنصة
            ومشغّليها <strong className="text-foreground">لا يتحملون أي مسؤولية</strong> عن القرارات
            المتخذة بناءً على هذه التقارير.
          </p>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-lg border border-border">
          <Checkbox
            id="disclaimer-check"
            checked={checked}
            onCheckedChange={(v) => setChecked(Boolean(v))}
            className="mt-0.5"
          />
          <label
            htmlFor="disclaimer-check"
            className="text-sm text-foreground cursor-pointer leading-relaxed"
          >
            I have read and understood the disclaimer above. I acknowledge that the AI-generated
            reports are not a substitute for professional medical advice.
            <br />
            <span dir="rtl" className="block text-right mt-1 text-muted-foreground">
              لقد قرأت إخلاء المسؤولية أعلاه وفهمته، وأُقرّ بأن تقارير الذكاء الاصطناعي
              لا تُغني عن الاستشارة الطبية المتخصصة.
            </span>
          </label>
        </div>

        {/* Confirm button */}
        <Button
          className="w-full"
          disabled={!checked || acknowledge.isPending}
          onClick={() => acknowledge.mutate()}
        >
          {acknowledge.isPending ? "Saving…" : "Confirm & View My Reports / تأكيد وعرض تقاريري"}
        </Button>
      </div>
    </div>
  );
}
