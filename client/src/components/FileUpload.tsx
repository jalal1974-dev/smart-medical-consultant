import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FileUploadProps {
  category: "medical_report" | "lab_result" | "xray" | "other";
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  accept?: string;
  label: string;
  description?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

export function FileUpload({
  category,
  onUploadComplete,
  onRemove,
  maxSizeMB = 10,
  accept = ".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx",
  label,
  description,
}: FileUploadProps) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.upload.file.useMutation();

  const validateFile = (selectedFile: File): string | null => {
    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      return "Invalid file type. Only PDF, images, and Word documents are allowed.";
    }

    return null;
  };

  const uploadFile = async (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      toast.error(error);
      return;
    }

    // Set uploading state
    setFile({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      uploading: true,
      progress: 0,
    });

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1]; // Remove data:image/png;base64, prefix

        // Simulate progress
        const progressInterval = setInterval(() => {
          setFile((prev) =>
            prev ? { ...prev, progress: Math.min(prev.progress + 10, 90) } : null
          );
        }, 200);

        try {
          const result = await uploadMutation.mutateAsync({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileData: base64Content,
            category,
          });

          clearInterval(progressInterval);

          setFile({
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            url: result.url,
            uploading: false,
            progress: 100,
          });

          onUploadComplete(result.url);
          toast.success("File uploaded successfully");
        } catch (error: any) {
          clearInterval(progressInterval);
          setFile((prev) =>
            prev
              ? {
                  ...prev,
                  uploading: false,
                  error: error.message || "Upload failed",
                }
              : null
          );
          toast.error(error.message || "Failed to upload file");
        }
      };

      reader.onerror = () => {
        setFile((prev) =>
          prev
            ? { ...prev, uploading: false, error: "Failed to read file" }
            : null
        );
        toast.error("Failed to read file");
      };

      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      setFile((prev) =>
        prev
          ? { ...prev, uploading: false, error: error.message || "Upload failed" }
          : null
      );
      toast.error(error.message || "Failed to upload file");
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      uploadFile(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      uploadFile(droppedFile);
    }
  };

  const handleRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onRemove) {
      onRemove();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {!file && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your file here, or
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Max size: {maxSizeMB}MB • Supported: PDF, Images, Word
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </Card>
      )}

      {file && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            {getFileIcon(file.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={file.uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {file.uploading && (
                <div className="mt-2 space-y-1">
                  <Progress value={file.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Uploading... {file.progress}%
                  </p>
                </div>
              )}

              {file.error && (
                <p className="text-xs text-destructive mt-2">{file.error}</p>
              )}

              {file.url && !file.uploading && (
                <p className="text-xs text-green-600 mt-2">✓ Uploaded successfully</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
