import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, Eye, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const language = localStorage.getItem("preferredLanguage") as "en" | "ar" || "en";

  const { data: categories, isLoading: categoriesLoading } = trpc.blog.getAllCategories.useQuery();
  const { data: posts, isLoading: postsLoading } = trpc.blog.getAllPublishedPosts.useQuery({ categoryId: selectedCategory });
  const { data: searchResults, isLoading: searchLoading } = trpc.blog.searchPosts.useQuery(
    { query: searchQuery, language },
    { enabled: searchQuery.length > 2 }
  );

  const displayPosts = searchQuery.length > 2 ? searchResults : posts;
  const isLoading = searchQuery.length > 2 ? searchLoading : postsLoading;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-teal-600 dark:bg-teal-800 text-white py-16">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === "ar" ? "المدونة الطبية" : "Medical Blog"}
          </h1>
          <p className="text-xl text-teal-100 max-w-2xl">
            {language === "ar"
              ? "مقالات طبية موثوقة ومبسطة مبنية على أحدث التطورات الطبية"
              : "Trusted and simplified medical articles based on the latest medical advances"}
          </p>
        </div>
      </div>

      <div className="container py-8">
        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder={language === "ar" ? "ابحث في المقالات..." : "Search articles..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          {!categoriesLoading && categories && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === undefined ? "default" : "outline"}
                onClick={() => setSelectedCategory(undefined)}
                size="sm"
              >
                {language === "ar" ? "الكل" : "All"}
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  size="sm"
                >
                  {language === "ar" ? category.nameAr : category.nameEn}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Blog Posts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : displayPosts && displayPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPosts.map((post) => {
              const title = language === "ar" ? post.titleAr : post.titleEn;
              const excerpt = language === "ar" ? post.excerptAr : post.excerptEn;
              const slug = language === "ar" ? post.slugAr : post.slugEn;
              const category = categories?.find((c) => c.id === post.categoryId);

              return (
                <Link key={post.id} href={`/blog/${slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {post.featuredImage && (
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={post.featuredImage}
                          alt={post.featuredImageAlt || title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      {category && (
                        <Badge variant="secondary" className="w-fit mb-2">
                          {language === "ar" ? category.nameAr : category.nameEn}
                        </Badge>
                      )}
                      <CardTitle className="line-clamp-2">{title}</CardTitle>
                      <CardDescription className="line-clamp-3">{excerpt}</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{post.readingTimeMinutes} {language === "ar" ? "دقائق" : "min"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{post.views}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-gray-500">
              {language === "ar" ? "لا توجد مقالات" : "No articles found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
