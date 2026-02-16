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
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Users, FileText, Video, BarChart3, Plus, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminPanel() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: consultations } = trpc.admin.consultations.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: users } = trpc.admin.users.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: videos } = trpc.admin.videos.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: podcasts } = trpc.admin.podcasts.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<{id: number, type: "video" | "podcast"} | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    type: "video" as "video" | "podcast",
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    mediaUrl: "",
    thumbnailUrl: "",
    duration: "",
  });

  const mediaFileRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  const uploadFile = trpc.upload.file.useMutation();

  const updateConsultationStatus = trpc.admin.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Consultation updated");
      utils.admin.consultations.invalidate();
    },
    onError: () => toast.error("Failed to update consultation"),
  });

  const createVideo = trpc.admin.videos.create.useMutation({
    onSuccess: () => {
      toast.success("Video created successfully");
      utils.admin.videos.list.invalidate();
      utils.media.videos.invalidate();
      setMediaDialogOpen(false);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to create video"),
  });

  const createPodcast = trpc.admin.podcasts.create.useMutation({
    onSuccess: () => {
      toast.success("Podcast created successfully");
      utils.admin.podcasts.list.invalidate();
      utils.media.podcasts.invalidate();
      setMediaDialogOpen(false);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to create podcast"),
  });

  const deleteVideo = trpc.admin.videos.delete.useMutation({
    onSuccess: () => {
      toast.success("Video deleted");
      utils.admin.videos.list.invalidate();
      utils.media.videos.invalidate();
    },
    onError: () => toast.error("Failed to delete video"),
  });

  const deletePodcast = trpc.admin.podcasts.delete.useMutation({
    onSuccess: () => {
      toast.success("Podcast deleted");
      utils.admin.podcasts.list.invalidate();
      utils.media.podcasts.invalidate();
    },
    onError: () => toast.error("Failed to delete podcast"),
  });

  const updateVideo = trpc.admin.videos.update.useMutation({
    onSuccess: () => {
      toast.success("Video updated successfully");
      utils.admin.videos.list.invalidate();
      utils.media.videos.invalidate();
      setMediaDialogOpen(false);
      setEditingMedia(null);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to update video"),
  });

  const updatePodcast = trpc.admin.podcasts.update.useMutation({
    onSuccess: () => {
      toast.success("Podcast updated successfully");
      utils.admin.podcasts.list.invalidate();
      utils.media.podcasts.invalidate();
      setMediaDialogOpen(false);
      setEditingMedia(null);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to update podcast"),
  });

  const resetMediaForm = () => {
    setEditingMedia(null);
    setMediaForm({
      type: "video",
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      mediaUrl: "",
      thumbnailUrl: "",
      duration: "",
    });
  };

  const handleMediaFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isVideo = mediaForm.type === "video";
    const validTypes = isVideo
      ? ["video/mp4", "video/webm", "video/ogg"]
      : ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];

    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid file type. Please upload a ${isVideo ? "video" : "audio"} file.`);
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 100MB limit.");
      return;
    }

    setUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1];

        const result = await uploadFile.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64Content,
          category: "other",
        });

        setMediaForm({ ...mediaForm, mediaUrl: result.url });
        toast.success(`${isVideo ? "Video" : "Audio"} uploaded successfully`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload an image (JPEG, PNG, or WebP).");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size exceeds 5MB limit.");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1];

        const result = await uploadFile.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64Content,
          category: "other",
        });

        setMediaForm({ ...mediaForm, thumbnailUrl: result.url });
        toast.success("Thumbnail uploaded successfully");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleOpenEditDialog = (media: any, type: "video" | "podcast") => {
    setEditingMedia({ id: media.id, type });
    setMediaForm({
      type,
      titleEn: media.titleEn,
      titleAr: media.titleAr,
      descriptionEn: media.descriptionEn || "",
      descriptionAr: media.descriptionAr || "",
      mediaUrl: type === "video" ? media.videoUrl : media.audioUrl,
      thumbnailUrl: media.thumbnailUrl || "",
      duration: media.duration?.toString() || "",
    });
    setMediaDialogOpen(true);
  };

  const handleCreateMedia = () => {
    if (!mediaForm.titleEn || !mediaForm.titleAr || !mediaForm.mediaUrl) {
      toast.error("Please fill in required fields (titles and media file)");
      return;
    }

    const commonData = {
      titleEn: mediaForm.titleEn,
      titleAr: mediaForm.titleAr,
      descriptionEn: mediaForm.descriptionEn || undefined,
      descriptionAr: mediaForm.descriptionAr || undefined,
      thumbnailUrl: mediaForm.thumbnailUrl || undefined,
      duration: mediaForm.duration ? parseInt(mediaForm.duration) : undefined,
    };

    if (editingMedia) {
      // Update existing media
      if (mediaForm.type === "video") {
        updateVideo.mutate({
          id: editingMedia.id,
          ...commonData,
          videoUrl: mediaForm.mediaUrl,
        });
      } else {
        updatePodcast.mutate({
          id: editingMedia.id,
          ...commonData,
          audioUrl: mediaForm.mediaUrl,
        });
      }
    } else {
      // Create new media
      if (mediaForm.type === "video") {
        createVideo.mutate({
          ...commonData,
          videoUrl: mediaForm.mediaUrl,
        });
      } else {
        createPodcast.mutate({
          ...commonData,
          audioUrl: mediaForm.mediaUrl,
        });
      }
    }
  };

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
                <div className="text-2xl font-bold">{stats.submittedConsultations}</div>
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

        {/* Tabs */}
        <Tabs defaultValue="consultations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="consultations">{t("consultations")}</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
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
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm">
                      <strong>Symptoms:</strong> {consultation.symptoms}
                    </p>
                    {consultation.medicalHistory && (
                      <p className="text-sm">
                        <strong>Medical History:</strong> {consultation.medicalHistory}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Created: {format(new Date(consultation.createdAt), "PPP")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      defaultValue={consultation.status}
                      onValueChange={(value) =>
                        updateConsultationStatus.mutate({
                          id: consultation.id,
                          status: value as any,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="ai_processing">AI Processing</SelectItem>
                        <SelectItem value="specialist_review">Specialist Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
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
                      <CardTitle>{user.name || "Unnamed User"}</CardTitle>
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
                  <DialogTitle>{editingMedia ? "Edit Media" : "Add New Media"}</DialogTitle>
                  <DialogDescription>{editingMedia ? "Update media details and thumbnail" : "Upload a video or podcast with bilingual content"}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
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
                      placeholder="Enter English title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Title (Arabic) *</Label>
                    <Input
                      value={mediaForm.titleAr}
                      onChange={(e) => setMediaForm({ ...mediaForm, titleAr: e.target.value })}
                      placeholder="أدخل العنوان بالعربية"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (English)</Label>
                    <Textarea
                      value={mediaForm.descriptionEn}
                      onChange={(e) => setMediaForm({ ...mediaForm, descriptionEn: e.target.value })}
                      placeholder="Enter English description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Arabic)</Label>
                    <Textarea
                      value={mediaForm.descriptionAr}
                      onChange={(e) => setMediaForm({ ...mediaForm, descriptionAr: e.target.value })}
                      placeholder="أدخل الوصف بالعربية"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{mediaForm.type === "video" ? "Video" : "Audio"} File *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={mediaForm.mediaUrl}
                        onChange={(e) => setMediaForm({ ...mediaForm, mediaUrl: e.target.value })}
                        placeholder="Or paste URL directly"
                      />
                      <input
                        ref={mediaFileRef}
                        type="file"
                        accept={mediaForm.type === "video" ? "video/*" : "audio/*"}
                        onChange={handleMediaFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => mediaFileRef.current?.click()}
                        disabled={uploadingMedia}
                      >
                        {uploadingMedia ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a file (max 100MB) or paste a URL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Thumbnail Image</Label>
                    <div className="flex gap-2">
                      <Input
                        value={mediaForm.thumbnailUrl}
                        onChange={(e) => setMediaForm({ ...mediaForm, thumbnailUrl: e.target.value })}
                        placeholder="Or paste image URL"
                      />
                      <input
                        ref={thumbnailFileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => thumbnailFileRef.current?.click()}
                        disabled={uploadingThumbnail}
                      >
                        {uploadingThumbnail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {mediaForm.thumbnailUrl && (
                      <img
                        src={mediaForm.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={mediaForm.duration}
                      onChange={(e) => setMediaForm({ ...mediaForm, duration: e.target.value })}
                      placeholder="e.g., 180 for 3 minutes"
                    />
                  </div>

                  <Button
                    onClick={handleCreateMedia}
                    disabled={createVideo.isPending || createPodcast.isPending || updateVideo.isPending || updatePodcast.isPending || uploadingMedia || uploadingThumbnail}
                    className="w-full"
                  >
                    {createVideo.isPending || createPodcast.isPending || updateVideo.isPending || updatePodcast.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingMedia ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingMedia ? `Update ${mediaForm.type === "video" ? "Video" : "Podcast"}` : `Create ${mediaForm.type === "video" ? "Video" : "Podcast"}`
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Videos Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Videos ({videos?.length || 0})</h3>
              {videos?.map((video) => (
                <Card key={video.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">
                          {language === "en" ? video.titleEn : video.titleAr}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {language === "en" ? video.descriptionEn : video.descriptionAr}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Video</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.titleEn}
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}
                      <div className="text-sm text-muted-foreground">
                        <p>Views: {video.views}</p>
                        {video.duration && <p>Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(video.videoUrl, "_blank")}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditDialog(video, "video")}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this video?")) {
                            deleteVideo.mutate({ id: video.id });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Podcasts Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Podcasts ({podcasts?.length || 0})</h3>
              {podcasts?.map((podcast) => (
                <Card key={podcast.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">
                          {language === "en" ? podcast.titleEn : podcast.titleAr}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {language === "en" ? podcast.descriptionEn : podcast.descriptionAr}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Podcast</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {podcast.thumbnailUrl && (
                        <img
                          src={podcast.thumbnailUrl}
                          alt={podcast.titleEn}
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}
                      <div className="text-sm text-muted-foreground">
                        <p>Views: {podcast.views}</p>
                        {podcast.duration && <p>Duration: {Math.floor(podcast.duration / 60)}:{(podcast.duration % 60).toString().padStart(2, '0')}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(podcast.audioUrl, "_blank")}
                      >
                        Listen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditDialog(podcast, "podcast")}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this podcast?")) {
                            deletePodcast.mutate({ id: podcast.id });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
