import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Eye, Clock, BookOpen, Tag } from "lucide-react";
import { Link } from "wouter";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyAr(text: string): string {
  return text
    .replace(/[^\u0600-\u06FF\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogManagement() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  // Form state for new post
  const [postForm, setPostForm] = useState({
    categoryId: "",
    titleEn: "",
    titleAr: "",
    slugEn: "",
    slugAr: "",
    excerptEn: "",
    excerptAr: "",
    contentEn: "",
    contentAr: "",
    metaDescriptionEn: "",
    metaDescriptionAr: "",
    metaKeywordsEn: "",
    metaKeywordsAr: "",
    featuredImage: "",
    published: false,
    readingTimeMinutes: 5,
  });

  // Form state for new category
  const [categoryForm, setCategoryForm] = useState({
    nameEn: "",
    nameAr: "",
    slugEn: "",
    slugAr: "",
    descriptionEn: "",
    descriptionAr: "",
  });

  const utils = trpc.useUtils();
  const { data: posts, isLoading: postsLoading } = trpc.blog.getAllPosts.useQuery();
  const { data: categories } = trpc.blog.getAllCategories.useQuery();

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      toast.success("Blog post created successfully");
      utils.blog.getAllPosts.invalidate();
      setIsCreatePostOpen(false);
      setPostForm({
        categoryId: "", titleEn: "", titleAr: "", slugEn: "", slugAr: "",
        excerptEn: "", excerptAr: "", contentEn: "", contentAr: "",
        metaDescriptionEn: "", metaDescriptionAr: "", metaKeywordsEn: "",
        metaKeywordsAr: "", featuredImage: "", published: false, readingTimeMinutes: 5,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePost = trpc.blog.updatePost.useMutation({
    onSuccess: () => {
      toast.success("Blog post updated successfully");
      utils.blog.getAllPosts.invalidate();
      setEditingPost(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const createCategory = trpc.blog.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      utils.blog.getAllCategories.invalidate();
      setIsCreateCategoryOpen(false);
      setCategoryForm({ nameEn: "", nameAr: "", slugEn: "", slugAr: "", descriptionEn: "", descriptionAr: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreatePost = () => {
    if (!postForm.categoryId || !postForm.titleEn || !postForm.titleAr || !postForm.contentEn || !postForm.contentAr) {
      toast.error("Please fill in all required fields (category, titles, and content)");
      return;
    }
    createPost.mutate({
      ...postForm,
      categoryId: parseInt(postForm.categoryId),
      slugEn: postForm.slugEn || slugify(postForm.titleEn),
      slugAr: postForm.slugAr || slugifyAr(postForm.titleAr) || slugify(postForm.titleEn) + "-ar",
    });
  };

  const handleTogglePublish = (post: any) => {
    updatePost.mutate({ id: post.id, published: !post.published });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Draft";
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Blog Management</h1>
        <div className="flex gap-2">
          {/* Create Category */}
          <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Blog Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name (English) *</Label>
                    <Input value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value, slugEn: slugify(e.target.value) })} placeholder="Cardiology" />
                  </div>
                  <div>
                    <Label>Name (Arabic) *</Label>
                    <Input value={categoryForm.nameAr} onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })} placeholder="أمراض القلب" dir="rtl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Slug (English)</Label>
                    <Input value={categoryForm.slugEn} onChange={(e) => setCategoryForm({ ...categoryForm, slugEn: e.target.value })} placeholder="cardiology" />
                  </div>
                  <div>
                    <Label>Slug (Arabic)</Label>
                    <Input value={categoryForm.slugAr} onChange={(e) => setCategoryForm({ ...categoryForm, slugAr: e.target.value })} placeholder="امراض-القلب" dir="rtl" />
                  </div>
                </div>
                <div>
                  <Label>Description (English)</Label>
                  <Textarea value={categoryForm.descriptionEn} onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })} placeholder="Articles about heart health..." />
                </div>
                <div>
                  <Label>Description (Arabic)</Label>
                  <Textarea value={categoryForm.descriptionAr} onChange={(e) => setCategoryForm({ ...categoryForm, descriptionAr: e.target.value })} placeholder="مقالات عن صحة القلب..." dir="rtl" />
                </div>
                <Button onClick={() => createCategory.mutate({ ...categoryForm, slugAr: categoryForm.slugAr || slugify(categoryForm.nameEn) + "-ar" })} disabled={createCategory.isPending} className="w-full">
                  {createCategory.isPending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Post */}
          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Blog Article</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="content">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="arabic">Arabic</TabsTrigger>
                  <TabsTrigger value="seo">SEO & Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={postForm.categoryId} onValueChange={(v) => setPostForm({ ...postForm, categoryId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameEn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title (English) *</Label>
                    <Input value={postForm.titleEn} onChange={(e) => setPostForm({ ...postForm, titleEn: e.target.value, slugEn: slugify(e.target.value) })} placeholder="Understanding Hypertension: Causes and Treatment" />
                  </div>
                  <div>
                    <Label>Excerpt (English) *</Label>
                    <Textarea value={postForm.excerptEn} onChange={(e) => setPostForm({ ...postForm, excerptEn: e.target.value })} placeholder="A brief summary of the article..." rows={2} />
                  </div>
                  <div>
                    <Label>Content (English) * — Markdown supported</Label>
                    <Textarea value={postForm.contentEn} onChange={(e) => setPostForm({ ...postForm, contentEn: e.target.value })} placeholder="## Introduction&#10;&#10;Write your article content here in Markdown format..." rows={12} className="font-mono text-sm" />
                  </div>
                </TabsContent>

                <TabsContent value="arabic" className="space-y-4">
                  <div>
                    <Label>Title (Arabic) *</Label>
                    <Input value={postForm.titleAr} onChange={(e) => setPostForm({ ...postForm, titleAr: e.target.value })} placeholder="فهم ارتفاع ضغط الدم: الأسباب والعلاج" dir="rtl" />
                  </div>
                  <div>
                    <Label>Excerpt (Arabic) *</Label>
                    <Textarea value={postForm.excerptAr} onChange={(e) => setPostForm({ ...postForm, excerptAr: e.target.value })} placeholder="ملخص مختصر للمقال..." rows={2} dir="rtl" />
                  </div>
                  <div>
                    <Label>Content (Arabic) * — Markdown supported</Label>
                    <Textarea value={postForm.contentAr} onChange={(e) => setPostForm({ ...postForm, contentAr: e.target.value })} placeholder="## مقدمة&#10;&#10;اكتب محتوى المقال هنا..." rows={12} dir="rtl" className="font-mono text-sm" />
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>URL Slug (English)</Label>
                      <Input value={postForm.slugEn} onChange={(e) => setPostForm({ ...postForm, slugEn: e.target.value })} placeholder="understanding-hypertension" />
                    </div>
                    <div>
                      <Label>URL Slug (Arabic)</Label>
                      <Input value={postForm.slugAr} onChange={(e) => setPostForm({ ...postForm, slugAr: e.target.value })} placeholder="فهم-ارتفاع-ضغط-الدم" dir="rtl" />
                    </div>
                  </div>
                  <div>
                    <Label>Meta Description (English)</Label>
                    <Textarea value={postForm.metaDescriptionEn} onChange={(e) => setPostForm({ ...postForm, metaDescriptionEn: e.target.value })} placeholder="SEO description for search engines (150-160 chars)..." rows={2} />
                  </div>
                  <div>
                    <Label>Meta Description (Arabic)</Label>
                    <Textarea value={postForm.metaDescriptionAr} onChange={(e) => setPostForm({ ...postForm, metaDescriptionAr: e.target.value })} placeholder="وصف لمحركات البحث..." rows={2} dir="rtl" />
                  </div>
                  <div>
                    <Label>Keywords (English, comma-separated)</Label>
                    <Input value={postForm.metaKeywordsEn} onChange={(e) => setPostForm({ ...postForm, metaKeywordsEn: e.target.value })} placeholder="hypertension, blood pressure, heart health" />
                  </div>
                  <div>
                    <Label>Keywords (Arabic, comma-separated)</Label>
                    <Input value={postForm.metaKeywordsAr} onChange={(e) => setPostForm({ ...postForm, metaKeywordsAr: e.target.value })} placeholder="ارتفاع ضغط الدم، صحة القلب" dir="rtl" />
                  </div>
                  <div>
                    <Label>Featured Image URL</Label>
                    <Input value={postForm.featuredImage} onChange={(e) => setPostForm({ ...postForm, featuredImage: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reading Time (minutes)</Label>
                      <Input type="number" value={postForm.readingTimeMinutes} onChange={(e) => setPostForm({ ...postForm, readingTimeMinutes: parseInt(e.target.value) || 5 })} min={1} max={60} />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch checked={postForm.published} onCheckedChange={(v) => setPostForm({ ...postForm, published: v })} />
                      <Label>Publish immediately</Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={handleCreatePost} disabled={createPost.isPending} className="w-full mt-4">
                {createPost.isPending ? "Creating..." : postForm.published ? "Publish Article" : "Save as Draft"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-teal-600" />
              <div>
                <p className="text-2xl font-bold">{posts?.length || 0}</p>
                <p className="text-sm text-gray-500">Total Articles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{posts?.filter((p) => p.published).length || 0}</p>
                <p className="text-sm text-gray-500">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Tag className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{categories?.length || 0}</p>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <p className="text-center py-8 text-gray-500">Loading articles...</p>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => {
                const category = categories?.find((c) => c.id === post.categoryId);
                return (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {category && <Badge variant="outline" className="text-xs">{category.nameEn}</Badge>}
                        <Badge variant={post.published ? "default" : "secondary"}>
                          {post.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{post.titleEn}</p>
                      <p className="text-sm text-gray-500 truncate">{post.titleAr}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readingTimeMinutes} min</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views} views</span>
                        <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/blog/${post.slugEn}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePublish(post)}
                        disabled={updatePost.isPending}
                      >
                        {post.published ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No articles yet. Create your first article!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
