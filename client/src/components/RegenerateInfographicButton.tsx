import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
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

interface RegenerateInfographicButtonProps {
  consultationId: number;
}

export function RegenerateInfographicButton({ consultationId }: RegenerateInfographicButtonProps) {
  const utils = trpc.useUtils();
  const [customPrompt, setCustomPrompt] = useState("");
  
  const regenerate = trpc.admin.regenerateInfographic.useMutation({
    onSuccess: () => {
      toast.success("Infographic regenerated successfully!");
      utils.admin.consultations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to regenerate infographic: ${error.message}`);
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
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate Infographic?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new infographic image using AI. The current infographic will be replaced. 
            This process may take 10-30 seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
          <Textarea
            id="customPrompt"
            placeholder="e.g., 'Emphasize cardiac findings', 'Use larger fonts', 'Add more visual icons', 'Focus on key recommendations'"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Provide specific instructions to guide the AI in generating the infographic.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => regenerate.mutate({ 
              consultationId, 
              customPrompt: customPrompt.trim() || undefined 
            })}
          >
            Regenerate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
