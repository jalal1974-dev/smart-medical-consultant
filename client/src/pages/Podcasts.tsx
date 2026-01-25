import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Headphones, Clock, Eye, Search } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Podcasts() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data: podcasts, isLoading } = trpc.media.podcasts.useQuery();
  const incrementViews = trpc.media.incrementPodcastViews.useMutation();
  const saveProgress = trpc.media.saveWatchProgress.useMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPodcast, setSelectedPodcast] = useState<{
    id: number;
    url: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePodcastClick = (
    id: number, 
    url: string, 
    titleEn: string, 
    titleAr: string, 
    descEn: string, 
    descAr: string,
    thumbnailUrl: string | null
  ) => {
    incrementViews.mutate({ id });
    setSelectedPodcast({
      id,
      url,
      title: language === "en" ? titleEn : titleAr,
      description: language === "en" ? descEn : descAr,
      thumbnailUrl,
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter podcasts based on search query (searches both English and Arabic)
  const filteredPodcasts = useMemo(() => {
    if (!podcasts) return [];
    if (!searchQuery.trim()) return podcasts;

    const query = searchQuery.toLowerCase().trim();
    return podcasts.filter((podcast) => {
      const titleEn = podcast.titleEn?.toLowerCase() || "";
      const titleAr = podcast.titleAr?.toLowerCase() || "";
      const descEn = podcast.descriptionEn?.toLowerCase() || "";
      const descAr = podcast.descriptionAr?.toLowerCase() || "";

      return (
        titleEn.includes(query) ||
        titleAr.includes(query) ||
        descEn.includes(query) ||
        descAr.includes(query)
      );
    });
  }, [podcasts, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-8">{t("listenPodcasts")}</h1>
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
          <h1 className="text-4xl font-bold mb-2">{t("listenPodcasts")}</h1>
          <p className="text-xl text-muted-foreground">{t("feature4Desc")}</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder={language === "en" ? "Search podcasts..." : "ابحث عن البودكاست..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              dir={language === "ar" ? "rtl" : "ltr"}
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {language === "en" 
                ? `Found ${filteredPodcasts.length} podcast${filteredPodcasts.length !== 1 ? 's' : ''}`
                : `تم العثور على ${filteredPodcasts.length} بودكاست`
              }
            </p>
          )}
        </div>

        {!podcasts || podcasts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("noPodcasts")}</p>
            </CardContent>
          </Card>
        ) : filteredPodcasts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {language === "en" 
                  ? "No podcasts found matching your search."
                  : "لم يتم العثور على بودكاست مطابق لبحثك."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPodcasts.map((podcast) => (
              <Card
                key={podcast.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePodcastClick(
                  podcast.id, 
                  podcast.audioUrl, 
                  podcast.titleEn || "", 
                  podcast.titleAr || "", 
                  podcast.descriptionEn || "", 
                  podcast.descriptionAr || "",
                  podcast.thumbnailUrl
                )}
              >
                <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
                  {podcast.thumbnailUrl ? (
                    <img
                      src={podcast.thumbnailUrl}
                      alt={language === "en" ? podcast.titleEn : podcast.titleAr}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Headphones className="w-16 h-16 text-primary" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {language === "en" ? "English" : "العربية"}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">
                    {language === "en" ? podcast.titleEn : podcast.titleAr}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {language === "en" ? podcast.descriptionEn : podcast.descriptionAr}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(podcast.duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{podcast.views}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Podcast Player Modal */}
        <Dialog open={!!selectedPodcast} onOpenChange={() => setSelectedPodcast(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPodcast?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPodcast?.thumbnailUrl && (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden">
                  <img
                    src={selectedPodcast.thumbnailUrl}
                    alt={selectedPodcast.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="bg-muted rounded-lg p-4">
                {selectedPodcast && (
                  <audio
                    ref={audioRef}
                    src={selectedPodcast.url}
                    controls
                    autoPlay
                    className="w-full"
                    onPlay={() => {
                      // Save progress every 5 seconds while playing
                      if (isAuthenticated && audioRef.current) {
                        progressIntervalRef.current = setInterval(() => {
                          if (audioRef.current && !audioRef.current.paused) {
                            saveProgress.mutate({
                              mediaType: "podcast",
                              mediaId: selectedPodcast.id,
                              progress: Math.floor(audioRef.current.currentTime),
                              duration: Math.floor(audioRef.current.duration),
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
                      if (isAuthenticated && audioRef.current) {
                        saveProgress.mutate({
                          mediaType: "podcast",
                          mediaId: selectedPodcast.id,
                          progress: Math.floor(audioRef.current.currentTime),
                          duration: Math.floor(audioRef.current.duration),
                        });
                      }
                    }}
                    onEnded={() => {
                      // Clear interval and mark as completed
                      if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                        progressIntervalRef.current = null;
                      }
                      if (isAuthenticated && audioRef.current) {
                        saveProgress.mutate({
                          mediaType: "podcast",
                          mediaId: selectedPodcast.id,
                          progress: Math.floor(audioRef.current.duration),
                          duration: Math.floor(audioRef.current.duration),
                        });
                      }
                    }}
                  >
                    {language === "en" 
                      ? "Your browser does not support the audio tag."
                      : "متصفحك لا يدعم تشغيل الصوت."
                    }
                  </audio>
                )}
              </div>
              <p className="text-muted-foreground">{selectedPodcast?.description}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
