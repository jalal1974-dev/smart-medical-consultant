import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { Users, FileText, Video, BarChart3, Plus } from "lucide-react";
import { format } from "date-fns";

export default function AdminPanel() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: consultations } = trpc.admin.consultations.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: users } = trpc.admin.users.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: media } = trpc.admin.allMedia.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    type: "video" as "video" | "podcast",
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    mediaUrl: "",
    thumbnailUrl: "",
    duration: "",
    language: "both" as "en" | "ar" | "both",
    isPublished: false,
  });

  const updateConsultationStatus = trpc.admin.updateConsultationStatus.useMutation({
    onSuccess: () => {
      toast.success("Consultation updated");
      utils.admin.consultations.invalidate();
    },
    onError: () => toast.error("Failed to update consultation"),
  });

  const createMedia = trpc.admin.createMedia.useMutation({
    onSuccess: () => {
      toast.success("Media created successfully");
      utils.admin.allMedia.invalidate();
      utils.media.videos.invalidate();
      utils.media.podcasts.invalidate();
      setMediaDialogOpen(false);
      setMediaForm({
        type: "video",
        titleEn: "",
        titleAr: "",
        descriptionEn: "",
        descriptionAr: "",
        mediaUrl: "",
        thumbnailUrl: "",
        duration: "",
        language: "both",
        isPublished: false,
      });
    },
    onError: () => toast.error("Failed to create media"),
  });

  const updateMedia = trpc.admin.updateMedia.useMutation({
    onSuccess: () => {
      toast.success("Media updated");
      utils.admin.allMedia.invalidate();
      utils.media.videos.invalidate();
      utils.media.podcasts.invalidate();
    },
    onError: () => toast.error("Failed to update media"),
  });

  const deleteMedia = trpc.admin.deleteMedia.useMutation({
    onSuccess: () => {
      toast.success("Media deleted");
      utils.admin.allMedia.invalidate();
      utils.media.videos.invalidate();
      utils.media.podcasts.invalidate();
    },
    onError: () => toast.error("Failed to delete media"),
  });

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen py-12">
        <div className="container max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin")}</CardTitle>
              <CardDescription>Admin access required</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href={getLoginUrl()}>{t("signIn")}</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleCreateMedia = () => {
    if (!mediaForm.titleEn || !mediaForm.titleAr || !mediaForm.mediaUrl) {
      toast.error("Please fill in required fields");
      return;
    }

    createMedia.mutate({
      ...mediaForm,
      duration: mediaForm.duration ? parseInt(mediaForm.duration) : undefined,
    });
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("admin")}</h1>
          <p className="text-xl text-muted-foreground">Manage consultations, users, and content</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalConsultations")}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConsultations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("pendingConsultations")}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingConsultations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedConsultations}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="consultations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="consultations">{t("manageConsultations")}</TabsTrigger>
            <TabsTrigger value="users">{t("manageUsers")}</TabsTrigger>
            <TabsTrigger value="media">{t("manageContent")}</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-4">
            {consultations?.map((consultation) => (
              <Card key={consultation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{consultation.patientName}</CardTitle>
                      <CardDescription>{consultation.patientEmail}</CardDescription>
                    </div>
                    <Badge>{consultation.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{consultation.description}</p>
                  <div className="flex gap-2">
                    <Select
                      value={consultation.status}
                      onValueChange={(value) =>
                        updateConsultationStatus.mutate({
                          id: consultation.id,
                          status: value as any,
                        })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {users?.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{user.name || "No name"}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Joined: {format(new Date(user.createdAt), "PPP")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Media
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Media</DialogTitle>
                  <DialogDescription>Create a new video or podcast entry</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={mediaForm.type}
                      onValueChange={(value) => setMediaForm({ ...mediaForm, type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="podcast">Podcast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title (English) *</Label>
                    <Input
                      value={mediaForm.titleEn}
                      onChange={(e) => setMediaForm({ ...mediaForm, titleEn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (Arabic) *</Label>
                    <Input
                      value={mediaForm.titleAr}
                      onChange={(e) => setMediaForm({ ...mediaForm, titleAr: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (English)</Label>
                    <Textarea
                      value={mediaForm.descriptionEn}
                      onChange={(e) => setMediaForm({ ...mediaForm, descriptionEn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Arabic)</Label>
                    <Textarea
                      value={mediaForm.descriptionAr}
                      onChange={(e) => setMediaForm({ ...mediaForm, descriptionAr: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Media URL *</Label>
                    <Input
                      value={mediaForm.mediaUrl}
                      onChange={(e) => setMediaForm({ ...mediaForm, mediaUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail URL</Label>
                    <Input
                      value={mediaForm.thumbnailUrl}
                      onChange={(e) => setMediaForm({ ...mediaForm, thumbnailUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={mediaForm.duration}
                      onChange={(e) => setMediaForm({ ...mediaForm, duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={mediaForm.language}
                      onValueChange={(value) => setMediaForm({ ...mediaForm, language: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={mediaForm.isPublished}
                      onChange={(e) => setMediaForm({ ...mediaForm, isPublished: e.target.checked })}
                    />
                    <Label htmlFor="isPublished">Publish immediately</Label>
                  </div>
                  <Button onClick={handleCreateMedia} disabled={createMedia.isPending}>
                    {createMedia.isPending ? "Creating..." : "Create Media"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {media?.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{language === "en" ? item.titleEn : item.titleAr}</CardTitle>
                      <CardDescription>
                        {language === "en" ? item.descriptionEn : item.descriptionAr}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{item.type}</Badge>
                      <Badge variant={item.isPublished ? "default" : "secondary"}>
                        {item.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateMedia.mutate({
                        id: item.id,
                        isPublished: !item.isPublished,
                      })
                    }
                  >
                    {item.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this media?")) {
                        deleteMedia.mutate({ id: item.id });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
