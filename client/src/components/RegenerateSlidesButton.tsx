import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RegenerateSlidesButtonProps {
  consultationId: number;
}

export function RegenerateSlidesButton({ consultationId }: RegenerateSlidesButtonProps) {
  const utils = trpc.useUtils();

  const regenerate = trpc.admin.regenerateSlides.useMutation({
    onSuccess: () => {
      toast.success("Slide deck regenerated successfully!");
      utils.admin.consultations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to regenerate slide deck: ${error.message}`);
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Generate Now
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Slide Deck?</AlertDialogTitle>
          <AlertDialogDescription>
            This will generate a professional slide deck using AI directly — no manual agent step required.
            The current slide content will be replaced. This process may take up to 60 seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => regenerate.mutate({ consultationId })}
          >
            Generate Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
