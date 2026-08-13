import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Enterprise AI Agent",
  description: "Live enterprise MCP operations console",
}

const directionContract = {
  thesis:
    "Make the agent-to-enterprise handoff visible; refuse the generic chart-grid dashboard.",
  ownWorld:
    "White institutional shell, one signal-blue accent, pill controls, hairline tables, and a near-black orchestration room.",
  story:
    "The presenter sees system health, follows persisted MCP calls, and resolves the one decision that needs a human.",
  firstViewport:
    "A compact shell opens onto a dark live orchestration rail with the newest call floating above the data summaries.",
  form: "Presentation control room, brief-pinned structure, seed 372ef186.",
  finish:
    "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans antialiased", inter.variable, fontMono.variable)}
    >
      <body>
        <script
          id="design-direction-contract"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(directionContract),
          }}
        />
        <ThemeProvider defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <AppHeader />
                <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
