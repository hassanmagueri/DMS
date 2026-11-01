"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { personName } from "@/lib/format";

export type NavLink = { href: string; label: string; icon: LucideIcon };

function NavLinks({
  links,
  onNavigate,
}: {
  links: NavLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  title,
  links,
  children,
}: {
  title: string;
  links: NavLink[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="px-5 py-6">
          <p className="text-xs font-medium tracking-wide text-sidebar-foreground/70">PFE</p>
          <p className="text-lg font-semibold">Delivery desk</p>
        </div>
        <div className="px-3">
          <NavLinks links={links} />
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-foreground">Delivery desk</SheetTitle>
                </SheetHeader>
                <div className="px-2">
                  <NavLinks links={links} onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {user ? personName(user) : "Account"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
