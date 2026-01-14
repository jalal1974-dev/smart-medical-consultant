import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Activity, Globe, Shield, Video } from "lucide-react";

export default function Home() {
  const { t } = useLanguage();

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
  );
}
