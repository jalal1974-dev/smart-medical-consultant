import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  language: "en" | "ar";
}

export function VoiceRecorder({ onTranscriptionComplete, language }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.voiceTranscription.transcribe.useMutation();
  const uploadMutation = trpc.upload.file.useMutation();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        // Check file size (16MB limit)
        const fileSizeMB = audioBlob.size / (1024 * 1024);
        if (fileSizeMB > 16) {
          toast.error(language === "ar" 
            ? "حجم التسجيل كبير جداً. الحد الأقصى 16 ميجابايت"
            : "Recording is too large. Maximum 16MB");
          return;
        }

        setIsProcessing(true);

        try {
          // Upload audio to S3 first
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string;
              const base64Data = base64Audio.split(',')[1];

              // Upload to S3 using tRPC
              const uploadResult = await uploadMutation.mutateAsync({
                fileName: `voice-${Date.now()}.webm`,
                fileData: base64Data,
                fileType: 'audio/webm',
                category: 'other',
              });

              // Transcribe the audio
              const result = await transcribeMutation.mutateAsync({
                audioUrl: uploadResult.url,
                language,
              });

              onTranscriptionComplete(result.text);
              toast.success(language === "ar" 
                ? "تم تحويل الصوت إلى نص بنجاح"
                : "Voice transcribed successfully");
            } catch (error: any) {
              console.error("Upload or transcription error:", error);
              toast.error(error.message || (language === "ar" 
                ? "فشل تحويل الصوت إلى نص"
                : "Failed to transcribe voice"));
            } finally {
              setIsProcessing(false);
            }
          };

          reader.readAsDataURL(audioBlob);
        } catch (error: any) {
          console.error("Transcription error:", error);
          toast.error(error.message || (language === "ar" 
            ? "فشل تحويل الصوت إلى نص"
            : "Failed to transcribe voice"));
        } finally {
          setIsProcessing(false);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success(language === "ar" 
        ? "بدأ التسجيل..."
        : "Recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error(language === "ar" 
        ? "فشل الوصول إلى الميكروفون"
        : "Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording && !isProcessing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          className="gap-2"
        >
          <Mic className="h-4 w-4" />
          {language === "ar" ? "تسجيل صوتي" : "Voice Recording"}
        </Button>
      )}

      {isRecording && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="gap-2 animate-pulse"
        >
          <Square className="h-4 w-4" />
          {language === "ar" ? "إيقاف التسجيل" : "Stop Recording"}
        </Button>
      )}

      {isProcessing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {language === "ar" ? "جاري التحويل..." : "Transcribing..."}
        </Button>
      )}
    </div>
  );
}
