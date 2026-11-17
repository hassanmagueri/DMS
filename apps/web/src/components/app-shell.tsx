"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogOut, Menu, PanelLeft, Search, Settings, type LucideIcon } from "lucide-react";
import { ActionNotifications } from "@/components/action-notifications";
import { ProfileAvatar } from "@/components/role-avatar";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { personName } from "@/lib/format";
import { titleForPath, type NavLink } from "@/lib/navigation";

export type { NavLink };

function NavLinkList({
  links,
  collapsed = false,
  onNavigate,
  pathname,
}: {
  links: NavLink[];
  collapsed?: boolean;
  onNavigate?: () => void;
  pathname: string | null;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((link) => {
        const matches = pathname
          ? links.filter((item) =>
              item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
            )
          : [];
        const activeHref = matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
        const active = link.href === activeHref;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {collapsed ? <span className="sr-only">{link.label}</span> : <span className="truncate">{link.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function NavLinks(props: { links: NavLink[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinkList {...props} pathname={pathname} />;
}

function ShellTitle() {
  const pathname = usePathname();
  return <p className="truncate text-sm font-semibold">{titleForPath(pathname)}</p>;
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={`flex h-full items-center ${collapsed ? "justify-center px-2" : "px-3"}`}>
      <img
        src={collapsed ? "/brand-mark.png" : "/brand-logo.png"}
        alt="Delivery Project Management"
        className={collapsed ? "size-8 rounded-md bg-white object-contain p-0.5" : "h-10 w-auto max-w-[168px] rounded-md bg-white object-contain px-1.5"}
      />
    </div>
  );
}

export function AppShell({
  links,
  children,
}: {
  title?: string;
  links: NavLink[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const canSearch = user?.role === "ADMIN" || user?.role === "DISPATCHER";
  const name = user ? personName(user) : "Account";

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("dms-sidebar") === "collapsed");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem("dms-sidebar", current ? "open" : "collapsed");
      return !current;
    });
  }

  const [signedOut, setSignedOut] = useState(false);

  async function handleLogout() {
    await logout();
    setSignedOut(true);
  }

  useEffect(() => {
    if (signedOut && !user) router.replace("/login");
  }, [signedOut, user, router]);

  return (
    <div className={`min-h-screen bg-background md:grid ${collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[240px_1fr]"}`}>
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border">
          <Brand collapsed={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <Suspense fallback={<NavLinkList links={links} collapsed={collapsed} pathname={null} />}>
            <NavLinks links={links} collapsed={collapsed} />
          </Suspense>
        </div>
        <div className="border-t border-sidebar-border p-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={toggleCollapsed}
          >
            <PanelLeft />
            {collapsed ? <span className="sr-only">Expand sidebar</span> : "Collapse"}
          </Button>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-foreground">
                    <img src="/brand-logo.png" alt="Delivery Project Management" className="h-10 w-auto rounded-md bg-white object-contain px-1.5" />
                  </SheetTitle>
                </SheetHeader>
                <div className="px-2">
                  <Suspense fallback={<NavLinkList links={links} pathname={null} onNavigate={() => setOpen(false)} />}>
                    <NavLinks links={links} onNavigate={() => setOpen(false)} />
                  </Suspense>
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <Suspense fallback={<p className="truncate text-sm font-semibold">Delivery Management System</p>}>
                <ShellTitle />
              </Suspense>
              <p className="hidden text-xs text-muted-foreground sm:block">Delivery Management System</p>
            </div>
          </div>
          {canSearch ? (
            <form
              className="hidden max-w-sm flex-1 md:block"
              onSubmit={(event) => {
                event.preventDefault();
                const next = query.trim();
                router.push(next ? `/deliveries?q=${encodeURIComponent(next)}` : "/deliveries");
              }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search deliveries"
                  aria-label="Search deliveries"
                  className="h-9 pl-8"
                />
              </div>
            </form>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center gap-2">
            <ActionNotifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 px-2">
                  <ProfileAvatar role={user?.role ?? "CUSTOMER"} name={name} src={user?.avatar} className="size-6" />
                  <span className="hidden max-w-32 truncate sm:inline">{name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <span className="block truncate">{name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/account")}>
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export type { LucideIcon };
