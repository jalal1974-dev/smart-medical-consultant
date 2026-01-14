import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Headphones, Clock, Eye } from "lucide-react";

export default function Podcasts() {
  const { t, language } = useLanguage();
  const { data: podcasts, isLoading } = trpc.media.podcasts.useQuery();
  const incrementViews = trpc.media.incrementPodcastViews.useMutation();

  const handlePodcastClick = (id: number, url: string) => {
    incrementViews.mutate({ id });
    window.open(url, "_blank");
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

        {!podcasts || podcasts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("noPodcasts")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {podcasts.map((podcast) => (
              <Card
                key={podcast.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePodcastClick(podcast.id, podcast.audioUrl)}
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
      </div>
    </div>
  );
}
