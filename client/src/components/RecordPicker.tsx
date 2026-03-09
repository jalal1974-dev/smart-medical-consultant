import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FolderOpen, X, Paperclip, FileText, Image, FlaskConical, Pill, File } from "lucide-react";
import { format } from "date-fns";

type Lang = "en" | "ar";

interface RecordPickerProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  language?: Lang;
}

const CATEGORY_LABELS: Record<string, Record<Lang, string>> = {
  medical_report: { en: "Medical Report", ar: "تقرير طبي" },
  lab_result: { en: "Lab Result", ar: "نتيجة تحليل" },
  xray: { en: "X-Ray / Scan", ar: "أشعة / مسح" },
  prescription: { en: "Prescription", ar: "وصفة طبية" },
  other: { en: "Other", ar: "أخرى" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  medical_report: <FileText className="w-4 h-4 text-blue-500" />,
  lab_result: <FlaskConical className="w-4 h-4 text-purple-500" />,
  xray: <Image className="w-4 h-4 text-teal-500" />,
  prescription: <Pill className="w-4 h-4 text-green-500" />,
  other: <File className="w-4 h-4 text-gray-500" />,
};

export function RecordPicker({ selectedIds, onChange, language = "en" }: RecordPickerProps) {
  const [open, setOpen] = useState(false);
  const isAr = language === "ar";

  const { data: records, isLoading } = trpc.profile.getRecords.useQuery(undefined, {
    enabled: open,
  });

  const toggleRecord = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeRecord = (id: number) => {
    onChange(selectedIds.filter(sid => sid !== id));
  };

  // Find selected record details for chip display
  const selectedRecords = (records ?? []).filter((r: any) => selectedIds.includes(r.id));

  return (
    <div className="space-y-2">
      {/* Attach button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-sm border-dashed"
      >
        <Paperclip className="w-4 h-4" />
        {isAr ? "إرفاق من سجلاتي الطبية" : "Attach from My Medical Records"}
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-xs ml-1">{selectedIds.length}</Badge>
        )}
      </Button>

      {/* Selected record chips */}
      {selectedRecords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRecords.map((record: any) => (
            <div
              key={record.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-full text-xs text-blue-700 dark:text-blue-300 max-w-[200px]"
            >
              {CATEGORY_ICONS[record.category] ?? <File className="w-3 h-3" />}
              <span className="truncate">{record.fileName}</span>
              <button
                type="button"
                onClick={() => removeRecord(record.id)}
                className="shrink-0 hover:text-red-500 transition-colors"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              {isAr ? "اختر من سجلاتك الطبية" : "Select from Your Medical Records"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? "اختر الملفات التي تريد إرفاقها بهذه الاستشارة"
                : "Choose files to attach to this consultation"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : !records || records.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? "لا توجد سجلات طبية مرفوعة بعد. يمكنك رفعها من صفحة ملفك الطبي."
                    : "No medical records uploaded yet. Upload them from your Medical Profile page."}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/my-profile" target="_blank" rel="noopener noreferrer">
                    {isAr ? "اذهب إلى ملفي الطبي" : "Go to My Profile"}
                  </a>
                </Button>
              </div>
            ) : (
              records.map((record: any) => {
                const isSelected = selectedIds.includes(record.id);
                return (
                  <div
                    key={record.id}
                    onClick={() => toggleRecord(record.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                        : "border-border hover:border-blue-300 hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRecord(record.id)}
                      className="shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="shrink-0">
                      {CATEGORY_ICONS[record.category] ?? <File className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{record.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs py-0">
                          {CATEGORY_LABELS[record.category]?.[language] ?? record.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(record.createdAt), "dd MMM yyyy")}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length > 0
                ? isAr
                  ? `تم اختيار ${selectedIds.length} ملف`
                  : `${selectedIds.length} file${selectedIds.length !== 1 ? "s" : ""} selected`
                : isAr ? "لم يتم اختيار أي ملف" : "No files selected"}
            </span>
            <Button onClick={() => setOpen(false)} className="bg-blue-600 hover:bg-blue-700">
              {isAr ? "تأكيد" : "Done"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
