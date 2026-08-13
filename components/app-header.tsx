import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden h-5 w-px bg-border sm:block" />
        <p className="hidden text-sm text-muted-foreground sm:block">
          Enterprise operations through MCP
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-success" />
        <span>Live demo</span>
      </div>
    </header>
  )
}
