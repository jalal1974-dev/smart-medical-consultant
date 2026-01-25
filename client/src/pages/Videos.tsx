import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Play, Clock, Eye, Search, X } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Videos() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data: videos, isLoading } = trpc.media.videos.useQuery();
  const incrementViews = trpc.media.incrementVideoViews.useMutation();
  const saveProgress = trpc.media.saveWatchProgress.useMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<{
    id: number;
    url: string;
    title: string;
    description: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoClick = (id: number, url: string, titleEn: string, titleAr: string, descEn: string, descAr: string) => {
    incrementViews.mutate({ id });
    setSelectedVideo({
      id,
      url,
      title: language === "en" ? titleEn : titleAr,
      description: language === "en" ? descEn : descAr,
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter videos based on search query (searches both English and Arabic)
  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    if (!searchQuery.trim()) return videos;

    const query = searchQuery.toLowerCase().trim();
    return videos.filter((video) => {
      const titleEn = video.titleEn?.toLowerCase() || "";
      const titleAr = video.titleAr?.toLowerCase() || "";
      const descEn = video.descriptionEn?.toLowerCase() || "";
      const descAr = video.descriptionAr?.toLowerCase() || "";

      return (
        titleEn.includes(query) ||
        titleAr.includes(query) ||
        descEn.includes(query) ||
        descAr.includes(query)
      );
    });
  }, [videos, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-8">{t("watchVideos")}</h1>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("watchVideos")}</h1>
          <p className="text-xl text-muted-foreground">{t("feature4Desc")}</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder={language === "en" ? "Search videos..." : "ابحث عن الفيديوهات..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              dir={language === "ar" ? "rtl" : "ltr"}
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {language === "en" 
                ? `Found ${filteredVideos.length} video${filteredVideos.length !== 1 ? 's' : ''}`
                : `تم العثور على ${filteredVideos.length} فيديو`
              }
            </p>
          )}
        </div>

        {!videos || videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("noVideos")}</p>
            </CardContent>
          </Card>
        ) : filteredVideos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {language === "en" 
                  ? "No videos found matching your search."
                  : "لم يتم العثور على فيديوهات مطابقة لبحثك."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleVideoClick(
                  video.id, 
                  video.videoUrl, 
                  video.titleEn || "", 
                  video.titleAr || "", 
                  video.descriptionEn || "", 
                  video.descriptionAr || ""
                )}
              >
                <div className="relative aspect-video bg-muted">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={language === "en" ? video.titleEn : video.titleAr}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {language === "en" ? "English" : "العربية"}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">
                    {language === "en" ? video.titleEn : video.titleAr}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {language === "en" ? video.descriptionEn : video.descriptionAr}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{video.views}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Video Player Modal */}
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {selectedVideo && (
                  <video
                    ref={videoRef}
                    src={selectedVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full"
                    onPlay={() => {
                      // Save progress every 5 seconds while playing
                      if (isAuthenticated && videoRef.current) {
                        progressIntervalRef.current = setInterval(() => {
                          if (videoRef.current && !videoRef.current.paused) {
                            saveProgress.mutate({
                              mediaType: "video",
                              mediaId: selectedVideo.id,
                              progress: Math.floor(videoRef.current.currentTime),
                              duration: Math.floor(videoRef.current.duration),
                            });
                          }
                        }, 5000);
                      }
                    }}
                    onPause={() => {
                      // Clear interval and save final progress
                      if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                        progressIntervalRef.current = null;
                      }
                      if (isAuthenticated && videoRef.current) {
                        saveProgress.mutate({
                          mediaType: "video",
                          mediaId: selectedVideo.id,
                          progress: Math.floor(videoRef.current.currentTime),
                          duration: Math.floor(videoRef.current.duration),
                        });
                      }
                    }}
                    onEnded={() => {
                      // Clear interval and mark as completed
                      if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                        progressIntervalRef.current = null;
                      }
                      if (isAuthenticated && videoRef.current) {
                        saveProgress.mutate({
                          mediaType: "video",
                          mediaId: selectedVideo.id,
                          progress: Math.floor(videoRef.current.duration),
                          duration: Math.floor(videoRef.current.duration),
                        });
                      }
                    }}
                  >
                    {language === "en" 
                      ? "Your browser does not support the video tag."
                      : "متصفحك لا يدعم تشغيل الفيديو."
                    }
                  </video>
                )}
              </div>
              <p className="text-muted-foreground">{selectedVideo?.description}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
