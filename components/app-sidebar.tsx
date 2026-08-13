"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ActivityIcon,
  BoxesIcon,
  CircleDollarSignIcon,
  ClipboardCheckIcon,
  ContactRoundIcon,
  LayoutDashboardIcon,
  PackageCheckIcon,
  TicketCheckIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/customers", label: "Customers", icon: ContactRoundIcon },
  { href: "/orders", label: "Orders", icon: BoxesIcon },
  { href: "/shipments", label: "Shipments", icon: PackageCheckIcon },
  { href: "/refunds", label: "Refunds", icon: CircleDollarSignIcon },
  { href: "/tickets", label: "Tickets", icon: TicketCheckIcon },
  { href: "/activity", label: "MCP Activity", icon: ActivityIcon },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheckIcon },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Enterprise AI Agent"
              render={<Link href="/" />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                EA
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">Enterprise AI</span>
                <span className="truncate text-xs text-muted-foreground">
                  Agent console
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
                    }
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="px-3 py-4">
        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="size-2 shrink-0 rounded-full bg-success" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Demo environment online
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
