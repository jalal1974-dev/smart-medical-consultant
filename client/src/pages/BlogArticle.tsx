import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Eye, Calendar, Share2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { updateSEO } from "@/lib/seo";

export default function BlogArticle() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const language = localStorage.getItem("preferredLanguage") as "en" | "ar" || "en";

  const { data: post, isLoading } = trpc.blog.getPostBySlug.useQuery({ slug, language });
  const { data: categories } = trpc.blog.getAllCategories.useQuery();

  const category = categories?.find((c) => c.id === post?.categoryId);

  useEffect(() => {
    if (post) {
      const title = language === "ar" ? post.titleAr : post.titleEn;
      const description = language === "ar" ? post.metaDescriptionAr || post.excerptAr : post.metaDescriptionEn || post.excerptEn;
      
      updateSEO({
        title,
        description,
        keywords: language === "ar" ? post.metaKeywordsAr : post.metaKeywordsEn,
        image: post.featuredImage,
        type: "article",
      });
    }
  }, [post, language]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: language === "ar" ? post.titleAr : post.titleEn,
          text: language === "ar" ? post.excerptAr : post.excerptEn,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share failed:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert(language === "ar" ? "تم نسخ الرابط" : "Link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">
            {language === "ar" ? "المقال غير موجود" : "Article Not Found"}
          </h1>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {language === "ar" ? "العودة إلى المدونة" : "Back to Blog"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = language === "ar" ? post.titleAr : post.titleEn;
  const content = language === "ar" ? post.contentAr : post.contentEn;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container py-8">
        {/* Back Button */}
        <Link href="/blog">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === "ar" ? "العودة إلى المدونة" : "Back to Blog"}
          </Button>
        </Link>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto">
          {category && (
            <Badge variant="secondary" className="mb-4">
              {language === "ar" ? category.nameAr : category.nameEn}
            </Badge>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            {title}
          </h1>

          {/* Article Meta */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>{post.readingTimeMinutes} {language === "ar" ? "دقائق قراءة" : "min read"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <span>{post.views} {language === "ar" ? "مشاهدة" : "views"}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {language === "ar" ? "مشاركة" : "Share"}
            </Button>
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.featuredImageAlt || title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <Streamdown>{content}</Streamdown>
          </div>

          {/* Article Footer */}
          <div className="border-t pt-8 mt-12">
            <div className="flex justify-between items-center">
              <Link href="/blog">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {language === "ar" ? "المزيد من المقالات" : "More Articles"}
                </Button>
              </Link>
              <Button onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                {language === "ar" ? "مشاركة المقال" : "Share Article"}
              </Button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
