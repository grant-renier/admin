"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/sessions": "Sessions",
  "/dashboard/users": "Users",
  "/dashboard/costs": "Cost Overview",
  "/dashboard/costs/deepgram": "Deepgram Usage",
  "/dashboard/costs/ai-chat": "AI Chat Tokens",
  "/dashboard/costs/bridge": "Bridge / Gemini",
  "/dashboard/content/modules": "Modules",
  "/dashboard/content/app-copy": "App Copy",
  "/dashboard/learn/educational": "Educational Content",
  "/dashboard/learn/psychometrics": "Psychometric Scales",
  "/dashboard/learn/blogs": "Blog / Articles",
  "/dashboard/templates": "Metric Templates",
  "/dashboard/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.match(/^\/dashboard\/sessions\/[^/]+$/)) return "Session Detail";
  if (pathname.match(/^\/dashboard\/users\/[^/]+$/)) return "User Detail";
  return "Dashboard";
}

export function SiteHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
