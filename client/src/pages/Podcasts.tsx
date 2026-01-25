import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Headphones, Clock, Eye, Search, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
              
              {/* Social Sharing Buttons */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === "en" ? "Share this podcast:" : "شارك هذا البودكاست:"}
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* WhatsApp */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.origin + "/podcasts");
                      const text = encodeURIComponent(selectedPodcast?.title || "");
                      window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
                    }}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </Button>

                  {/* Facebook */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.origin + "/podcasts");
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
                    }}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </Button>

                  {/* Twitter/X */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.origin + "/podcasts");
                      const text = encodeURIComponent(selectedPodcast?.title || "");
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                    }}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
