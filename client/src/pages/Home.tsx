import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Activity, Globe, Shield, Video, Play, Headphones, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getThumbnailUrl } from "@/lib/videoUtils";
import { SEO, OrganizationSchema, MedicalServiceSchema, WebsiteSchema } from "@/components/SEO";

export default function Home() {
  const { t, language } = useLanguage();
  const { data: videos } = trpc.media.videos.useQuery();
  const { data: podcasts } = trpc.media.podcasts.useQuery();

  // Get latest 3 videos and 3 podcasts
  const latestVideos = videos?.slice(0, 3) || [];
  const latestPodcasts = podcasts?.slice(0, 3) || [];

  // Get most popular media (combine videos and podcasts, sort by views, take top 6)
  const allMedia = [
    ...(videos?.map(v => ({ ...v, type: 'video' as const })) || []),
    ...(podcasts?.map(p => ({ ...p, type: 'podcast' as const })) || [])
  ];
  const mostPopular = allMedia
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const features = [
    {
      icon: Activity,
      title: t("feature1Title"),
      description: t("feature1Desc"),
    },
    {
      icon: Globe,
      title: t("feature2Title"),
      description: t("feature2Desc"),
    },
    {
      icon: Shield,
      title: t("feature3Title"),
      description: t("feature3Desc"),
    },
    {
      icon: Video,
      title: t("feature4Title"),
      description: t("feature4Desc"),
    },
  ];

  return (
    <>
      <SEO />
      <OrganizationSchema />
      <MedicalServiceSchema />
      <WebsiteSchema />
      <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20 md:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {t("heroTitle")}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t("heroSubtitle")}
              </p>
              <p className="text-lg text-muted-foreground">
                {t("heroDescription")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/consultations">{t("bookConsultation")}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/videos">{t("learnMore")}</Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src="/logo.jpeg"
                alt={t("siteName")}
                className="w-full max-w-md rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("heroDescription")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Videos & Podcasts Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          {/* Latest Videos */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  {language === "en" ? "Latest Videos" : "أحدث الفيديوهات"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "en" 
                    ? "Explore our newest educational medical content"
                    : "استكشف أحدث المحتوى الطبي التعليمي"}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/videos">
                  {language === "en" ? "View All" : "عرض الكل"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestVideos.map((video) => (
                <Link key={video.id} href="/videos">
                  <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
                    <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
                      {video.thumbnailUrl ? (
                      <img
                        src={getThumbnailUrl(video.videoUrl, video.thumbnailUrl)}
                        alt={language === "en" ? video.titleEn : video.titleAr}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-video.jpg';
                        }}
                      />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-16 h-16 text-primary" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2">
                        {language === "en" ? video.titleEn : video.titleAr}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        {video.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(video.duration / 60)} {language === "en" ? "min" : "دقيقة"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Video className="w-4 h-4" />
                          {video.views} {language === "en" ? "views" : "مشاهدة"}
                        </span>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Latest Podcasts */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  {language === "en" ? "Latest Podcasts" : "أحدث البودكاست"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "en" 
                    ? "Listen to expert medical discussions and insights"
                    : "استمع إلى المناقشات والرؤى الطبية من الخبراء"}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/podcasts">
                  {language === "en" ? "View All" : "عرض الكل"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestPodcasts.map((podcast) => (
                <Link key={podcast.id} href="/podcasts">
                  <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
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
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Headphones className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2">
                        {language === "en" ? podcast.titleEn : podcast.titleAr}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        {podcast.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(podcast.duration / 60)} {language === "en" ? "min" : "دقيقة"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Headphones className="w-4 h-4" />
                          {podcast.views} {language === "en" ? "listens" : "استماع"}
                        </span>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">
                {language === "en" ? "Most Popular" : "الأكثر شعبية"}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === "en" 
                ? "Trending Medical Content" 
                : "المحتوى الطبي الأكثر مشاهدة"}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {language === "en" 
                ? "Discover our most viewed educational content trusted by thousands"
                : "اكتشف المحتوى التعليمي الأكثر مشاهدة والموثوق به من قبل الآلاف"}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mostPopular.map((item) => {
              const isVideo = item.type === 'video';
              const title = language === "en" ? item.titleEn : item.titleAr;
              const linkPath = isVideo ? "/videos" : "/podcasts";

              return (
                <Link key={`${item.type}-${item.id}`} href={linkPath}>
                  <Card className="overflow-hidden hover:shadow-xl transition-all hover:scale-[1.03] cursor-pointer h-full border-2 hover:border-primary/50">
                    <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isVideo ? (
                            <Play className="w-16 h-16 text-primary" />
                          ) : (
                            <Headphones className="w-16 h-16 text-primary" />
                          )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        {isVideo ? (
                          <Play className="w-12 h-12 text-white" />
                        ) : (
                          <Headphones className="w-12 h-12 text-white" />
                        )}
                      </div>
                      {/* Trending badge */}
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {item.views.toLocaleString()}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2 flex items-start gap-2">
                        {isVideo ? (
                          <Video className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        ) : (
                          <Headphones className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        )}
                        <span>{title}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        {item.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(item.duration / 60)} {language === "en" ? "min" : "دقيقة"}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">{t("consultationTitle")}</h2>
            <p className="text-xl text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <Button size="lg" asChild>
              <Link href="/consultations">{t("getStarted")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
