"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboardIcon,
  MicIcon,
  UsersIcon,
  DollarSignIcon,
  AudioWaveformIcon,
  BrainCircuitIcon,
  ZapIcon,
  LayoutGridIcon,
  FileTextIcon,
  GraduationCapIcon,
  BrainIcon,
  BookOpenIcon,
  LayoutTemplateIcon,
  SettingsIcon,
  LogOutIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional status tag rendered after the label (e.g. "Soon" for stubs). */
  badge?: string;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Sessions", url: "/dashboard/sessions", icon: MicIcon },
      { title: "Users", url: "/dashboard/users", icon: UsersIcon },
    ],
  },
  {
    label: "Costs & Usage",
    items: [
      {
        title: "Cost Overview",
        url: "/dashboard/costs",
        icon: DollarSignIcon,
      },
      {
        title: "Deepgram Usage",
        url: "/dashboard/costs/deepgram",
        icon: AudioWaveformIcon,
      },
      {
        title: "AI Chat Tokens",
        url: "/dashboard/costs/ai-chat",
        icon: BrainCircuitIcon,
      },
      {
        title: "Bridge / LLM Scoring",
        url: "/dashboard/costs/bridge",
        icon: ZapIcon,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        title: "Categories",
        url: "/dashboard/content/modules",
        icon: LayoutGridIcon,
      },
      {
        title: "App Copy",
        url: "/dashboard/content/app-copy",
        icon: FileTextIcon,
        // Stub page -- no copy table in Supabase yet, so flag it honestly.
        badge: "Soon",
      },
    ],
  },
  {
    label: "Learn",
    items: [
      {
        title: "Educational Content",
        url: "/dashboard/learn/educational",
        icon: GraduationCapIcon,
      },
      {
        title: "Psychometric Scales",
        url: "/dashboard/learn/psychometrics",
        icon: BrainIcon,
      },
      {
        title: "Blog / Articles",
        url: "/dashboard/learn/blogs",
        icon: BookOpenIcon,
      },
    ],
  },
  {
    label: "Templates",
    items: [
      {
        title: "Metric Templates",
        url: "/dashboard/templates",
        icon: LayoutTemplateIcon,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Admin", url: "/dashboard/settings", icon: SettingsIcon },
    ],
  },
];

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="bg-gradient-to-b from-primary/5 to-transparent pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold">
                IA
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold leading-tight">
                    IntualityAI
                  </span>
                  <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary leading-none">
                    Admin
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Admin Panel
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="mb-1 mt-2 text-[11px] uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    pathname === item.url ||
                    (item.url !== "/dashboard" &&
                      pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<a href={item.url} />}
                        isActive={active}
                        tooltip={item.title}
                        className={
                          active
                            ? "border-l-2 border-primary bg-primary/5 font-medium"
                            : ""
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Administrator</p>
              <p className="text-[10px] text-muted-foreground">Admin Account</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:text-red-400"
            onClick={handleLogout}
          >
            <LogOutIcon className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
