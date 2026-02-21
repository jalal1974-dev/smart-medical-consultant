import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface RequestSlideGenerationButtonProps {
  consultationId: number;
  type: "infographic" | "slideDeck";
}

export function RequestSlideGenerationButton({ consultationId, type }: RequestSlideGenerationButtonProps) {
  const utils = trpc.useUtils();
  const { data: requestStatus } = trpc.slideGeneration.getRequestStatus.useQuery({ consultationId });
  
  const requestGeneration = trpc.slideGeneration.requestGeneration.useMutation({
    onSuccess: () => {
      toast.success("Slide generation requested! The agent will generate professional slides shortly.");
      utils.slideGeneration.getRequestStatus.invalidate({ consultationId });
      utils.admin.consultations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to request slide generation");
    },
  });

  const isRequested = requestStatus?.status === "pending" || requestStatus?.status === "processing";
  const isCompleted = requestStatus?.status === "completed";

  if (isCompleted) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        ✓ Generated
      </span>
    );
  }

  if (isRequested) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Pending Agent Generation...</span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      onClick={() => requestGeneration.mutate({ consultationId })}
      disabled={requestGeneration.isPending}
    >
      {requestGeneration.isPending ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Requesting...
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3 mr-1" />
          Request Generation
        </>
      )}
    </Button>
  );
}
