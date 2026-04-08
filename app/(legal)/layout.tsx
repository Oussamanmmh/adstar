// app/(legal)/layout.tsx  — wrap around terms, privacy, support
import Link from "next/link"
import { Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Button asChild variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground gap-2">
            <Link href="/">
              <ArrowRight className="h-4 w-4 rotate-180" />
              العودة للرئيسية
            </Link>
          </Button>
        </div>
      </nav>

      {/* Page content */}
      <main className="pt-24 pb-20">{children}</main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/40">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
         
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">الشروط</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">الخصوصية</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">الدعم</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}