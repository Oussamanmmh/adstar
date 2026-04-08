"use client"

import { useEffect, useState } from "react"
import { getVideos, createVideo, updateVideo, deleteVideo } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Video, GripVertical, ExternalLink } from "lucide-react"
import type { Video as VideoType } from "@/lib/types"

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null)
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    loadVideos()
  }, [])

  function loadVideos() {
    const allVideos = getVideos().sort((a, b) => a.orderIndex - b.orderIndex)
    setVideos(allVideos)
  }

  function resetForm() {
    setTitle("")
    setYoutubeUrl("")
    setIsActive(true)
  }

  function handleOpenAddDialog() {
    resetForm()
    setIsAddDialogOpen(true)
  }

  function handleOpenEditDialog(video: VideoType) {
    setTitle(video.title)
    setYoutubeUrl(video.youtubeUrl)
    setIsActive(video.isActive)
    setEditingVideo(video)
  }

  function handleCloseDialog() {
    setIsAddDialogOpen(false)
    setEditingVideo(null)
    resetForm()
  }

  function extractThumbnail(url: string): string | undefined {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
    }
    return undefined
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !youtubeUrl.trim()) {
      toast.error("يرجى تعبئة جميع الحقول")
      return
    }

    const thumbnailUrl = extractThumbnail(youtubeUrl)

    if (editingVideo) {
      // Update existing video
      updateVideo(editingVideo.id, {
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        thumbnailUrl,
        isActive,
      })
      toast.success("تم تحديث الفيديو")
    } else {
      // Create new video
      const maxOrder = Math.max(0, ...videos.map(v => v.orderIndex))
      createVideo({
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        thumbnailUrl,
        orderIndex: maxOrder + 1,
        isActive,
      })
      toast.success("تمت إضافة الفيديو")
    }

    handleCloseDialog()
    loadVideos()
  }

  function handleDeleteVideo() {
    if (!deleteVideoId) return

    deleteVideo(deleteVideoId)
    toast.success("تم حذف الفيديو")
    setDeleteVideoId(null)
    loadVideos()
  }

  function handleToggleActive(videoId: string, active: boolean) {
    updateVideo(videoId, { isActive: active })
    loadVideos()
  }

  function getYoutubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    return match ? match[1] : null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الفيديوهات</h1>
          <p className="text-muted-foreground">إدارة الفيديوهات المتاحة للتقييم</p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة فيديو
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع الفيديوهات</CardTitle>
          <CardDescription>إجمالي الفيديوهات: {videos.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد فيديوهات بعد</p>
              <p className="text-sm">أضف أول فيديو للبدء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => {
                const youtubeId = getYoutubeId(video.youtubeUrl)
                
                return (
                  <div 
                    key={video.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    
                    {/* Thumbnail */}
                    <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{video.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="truncate">{video.youtubeUrl}</span>
                        {youtubeId && (
                          <a 
                            href={video.youtubeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">نشط</span>
                        <Switch
                          checked={video.isActive}
                          onCheckedChange={(checked) => handleToggleActive(video.id, checked)}
                        />
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleOpenEditDialog(video)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setDeleteVideoId(video.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Video Dialog */}
      <Dialog open={isAddDialogOpen || !!editingVideo} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? "تعديل الفيديو" : "إضافة فيديو جديد"}</DialogTitle>
            <DialogDescription>
              {editingVideo ? "حدّث بيانات الفيديو بالأسفل" : "أدخل تفاصيل الفيديو الجديد"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="title">العنوان</FieldLabel>
              <Input
                id="title"
                placeholder="أدخل عنوان الفيديو"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="youtubeUrl">YouTube URL</FieldLabel>
              <Input
                id="youtubeUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </Field>

            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="isActive">نشط</FieldLabel>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button type="submit" className="flex-1">
                {editingVideo ? "حفظ التغييرات" : "إضافة الفيديو"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteVideoId} onOpenChange={() => setDeleteVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفيديو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الفيديو؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVideo} className="bg-destructive text-white hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
