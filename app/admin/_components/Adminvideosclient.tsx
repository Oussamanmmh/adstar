// app/admin/videos/_components/AdminVideosClient.tsx
"use client"

import {
  memo,
  useCallback,
  useOptimistic,
  useReducer,
  useTransition,
  startTransition,
} from "react"
import { useRouter } from "next/navigation"
import {
  createAdminVideo,
  updateAdminVideo,
  deleteAdminVideo,
  toggleAdminVideoStatus,
  type AdminVideoRow,
} from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { ExternalLink, GripVertical, Loader2, Pencil, Plus, Trash2, Video } from "lucide-react"
import { AdminTablePagination } from "./AdminTablePagination"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialVideos: AdminVideoRow[]
  fetchError?: string
  page: number
  count: number
  totalCount: number
  totalPages: number
}

interface FormState {
  title: string
  youtubeUrl: string
  isActive: boolean
}

type FormAction =
  | { type: "SET"; field: keyof FormState; value: string | boolean }
  | { type: "RESET" }
  | { type: "LOAD"; payload: AdminVideoRow }

const DEFAULT_FORM: FormState = { title: "", youtubeUrl: "", isActive: true }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET":
      return { ...state, [action.field]: action.value }
    case "RESET":
      return DEFAULT_FORM
    case "LOAD":
      return {
        title: action.payload.title,
        youtubeUrl: action.payload.youtube_url,
        isActive: action.payload.is_active,
      }
  }
}

// ─── Optimistic reducer ───────────────────────────────────────────────────────

type OptimisticAction =
  | { type: "TOGGLE"; id: string; isActive: boolean }
  | { type: "DELETE"; id: string }
  | { type: "UPDATE"; video: AdminVideoRow }

function optimisticReducer(videos: AdminVideoRow[], action: OptimisticAction): AdminVideoRow[] {
  switch (action.type) {
    case "TOGGLE":
      return videos.map((v) => (v.id === action.id ? { ...v, is_active: action.isActive } : v))
    case "DELETE":
      return videos.filter((v) => v.id !== action.id)
    case "UPDATE":
      return videos.map((v) => (v.id === action.video.id ? action.video : v))
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
  return match ? match[1] : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminVideosClient({
  initialVideos,
  fetchError,
  page,
  count,
  totalCount,
  totalPages,
}: Props) {
  const router = useRouter()

  const [optimisticVideos, dispatchOptimistic] = useOptimistic(initialVideos, optimisticReducer)
  const [form, dispatchForm] = useReducer(formReducer, DEFAULT_FORM)

  const [editingVideo, setEditingVideo] = useReducer(
    (_: AdminVideoRow | null, next: AdminVideoRow | null) => next,
    null,
  )
  const [isAddDialogOpen, setIsAddDialogOpen] = useReducer((_: boolean, next: boolean) => next, false)
  const [deleteVideoRow, setDeleteVideoRow] = useReducer(
    (_: AdminVideoRow | null, next: AdminVideoRow | null) => next,
    null,
  )

  const [isSubmitting, startSubmitTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  if (fetchError) toast.error(fetchError)

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleOpenAddDialog = useCallback(() => {
    dispatchForm({ type: "RESET" })
    setEditingVideo(null)
    setIsAddDialogOpen(true)
  }, [])

  const handleOpenEditDialog = useCallback((video: AdminVideoRow) => {
    dispatchForm({ type: "LOAD", payload: video })
    setEditingVideo(video)
    setIsAddDialogOpen(false)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setIsAddDialogOpen(false)
    setEditingVideo(null)
    dispatchForm({ type: "RESET" })
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!form.title.trim() || !form.youtubeUrl.trim()) {
        toast.error("يرجى تعبئة جميع الحقول")
        return
      }

      startSubmitTransition(async () => {
        if (editingVideo) {
          // Optimistically update the row in the list
          startTransition(() =>
            dispatchOptimistic({
              type: "UPDATE",
              video: {
                ...editingVideo,
                title: form.title.trim(),
                youtube_url: form.youtubeUrl.trim(),
                is_active: form.isActive,
              },
            }),
          )

          const result = await updateAdminVideo({
            id: editingVideo.id,
            title: form.title.trim(),
            youtubeUrl: form.youtubeUrl.trim(),
            isActive: form.isActive,
          })

          if (!result.success) {
            // Revert optimistic update
            startTransition(() => dispatchOptimistic({ type: "UPDATE", video: editingVideo }))
            toast.error(result.error)
            return
          }

          toast.success("تم تحديث الفيديو")
        } else {
          const result = await createAdminVideo({
            title: form.title.trim(),
            youtubeUrl: form.youtubeUrl.trim(),
            isActive: form.isActive,
          })

          if (!result.success) {
            toast.error(result.error)
            return
          }

          toast.success("تمت إضافة الفيديو")
          // router.refresh() to get the real new row with id + order_index from DB
          router.refresh()
        }

        handleCloseDialog()
      })
    },
    [form, editingVideo, handleCloseDialog, router],
  )

  const handleToggleActive = useCallback((video: AdminVideoRow, checked: boolean) => {
    // Instant toggle — no spinner, no full refetch
    startTransition(() =>
      dispatchOptimistic({ type: "TOGGLE", id: video.id, isActive: checked }),
    )

    void toggleAdminVideoStatus({ id: video.id, isActive: checked }).then((result) => {
      if (!result.success) {
        // Revert on failure
        startTransition(() =>
          dispatchOptimistic({ type: "TOGGLE", id: video.id, isActive: !checked }),
        )
        toast.error(result.error)
      }
    })
  }, [])

  const handleDeleteVideo = useCallback(() => {
    if (!deleteVideoRow) return

    startDeleteTransition(async () => {
      // Optimistically remove from list
      startTransition(() => dispatchOptimistic({ type: "DELETE", id: deleteVideoRow.id }))

      const result = await deleteAdminVideo({ id: deleteVideoRow.id })

      if (!result.success) {
        // Revert: put the row back
        startTransition(() => dispatchOptimistic({ type: "UPDATE", video: deleteVideoRow }))
        toast.error(result.error)
        return
      }

      toast.success("تم حذف الفيديو")
      setDeleteVideoRow(null)
    })
  }, [deleteVideoRow])

  // ─── Render ───────────────────────────────────────────────────────────────

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
          <CardDescription>إجمالي الفيديوهات: {optimisticVideos.length}</CardDescription>
        </CardHeader>

        <CardContent>
          {optimisticVideos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد فيديوهات بعد</p>
              <p className="text-sm">أضف أول فيديو للبدء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {optimisticVideos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  onEdit={handleOpenEditDialog}
                  onToggle={handleToggleActive}
                  onDelete={setDeleteVideoRow}
                />
              ))}
            </div>
          )}

          <AdminTablePagination
            page={page}
            count={count}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ── */}
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
                value={form.title}
                onChange={(e) => dispatchForm({ type: "SET", field: "title", value: e.target.value })}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="youtubeUrl">YouTube URL</FieldLabel>
              <Input
                id="youtubeUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.youtubeUrl}
                onChange={(e) =>
                  dispatchForm({ type: "SET", field: "youtubeUrl", value: e.target.value })
                }
              />
            </Field>

            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="isActive">نشط</FieldLabel>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => dispatchForm({ type: "SET", field: "isActive", value: v })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحفظ...
                  </span>
                ) : editingVideo ? (
                  "حفظ التغييرات"
                ) : (
                  "إضافة الفيديو"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog
        open={!!deleteVideoRow}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteVideoRow(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفيديو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف فيديو &quot;{deleteVideoRow?.title ?? ""}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحذف...
                </span>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Memoised video row ───────────────────────────────────────────────────────

interface VideoRowProps {
  video: AdminVideoRow
  onEdit: (video: AdminVideoRow) => void
  onToggle: (video: AdminVideoRow, checked: boolean) => void
  onDelete: (video: AdminVideoRow) => void
}

const VideoRow = memo(function VideoRow({ video, onEdit, onToggle, onDelete }: VideoRowProps) {
  const youtubeId = getYoutubeId(video.youtube_url)

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />

      {/* Thumbnail */}
      <div className="w-24 h-14 rounded overflow-hidden bg-muted shrink-0">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
            alt={video.title}
            loading="lazy"
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
          <span className="truncate">{video.youtube_url}</span>
          {youtubeId && (
            <a
              href={video.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">نشط</span>
          <Switch
            checked={video.is_active}
            onCheckedChange={(checked) => onToggle(video, checked)}
          />
        </div>
        <Button size="icon" variant="ghost" onClick={() => onEdit(video)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(video)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
})