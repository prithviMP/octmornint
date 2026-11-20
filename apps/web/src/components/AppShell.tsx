"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { HeaderClock } from "./HeaderClock";
import { Icon } from "./Icon";

type AppShellProps = {
  children: ReactNode;
  active?: "dashboard" | "start" | "history";
};

const navItems = [
  { id: "dashboard" as const, href: "/", label: "Dashboard", icon: "dashboard" },
  { id: "start" as const, href: "/start", label: "Start Interview", icon: "play_circle" },
  { id: "bank" as const, href: null, label: "Question Bank", icon: "library_books" },
  { id: "history" as const, href: "/history", label: "History", icon: "history" },
  { id: "settings" as const, href: null, label: "Settings", icon: "tune" },
];

function resolveActive(pathname: string): "dashboard" | "start" | "history" {
  if (pathname.startsWith("/start")) return "start";
  if (pathname.startsWith("/history") || pathname.startsWith("/results")) return "history";
  return "dashboard";
}

export function AppShell({ children, active }: AppShellProps) {
  const pathname = usePathname();
  const current = active ?? resolveActive(pathname);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface font-body">
      <aside className="w-full lg:w-64 bg-sidebar text-on-sidebar flex flex-col justify-between p-gutter-lg shrink-0 lg:min-h-screen">
        <div className="flex flex-col gap-gutter-xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-gutter-sm">
              <span className="w-9 h-9 rounded bg-accent text-on-accent flex items-center justify-center">
                <Icon name="bolt" />
              </span>
              <span className="font-headline text-title-lg text-on-sidebar">PrepPulse</span>
            </Link>
            <span className="px-gutter-sm py-0.5 rounded-full bg-sidebar-surface text-accent font-mono text-mono-sm">
              v1.0
            </span>
          </div>

          <nav aria-label="Main menu">
            <ul className="flex flex-col gap-gutter-xs">
              {navItems.map((item) => {
                const isActive = item.id === current;
                const className = isActive
                  ? "flex items-center gap-gutter-md px-gutter-md py-gutter-sm rounded bg-accent text-on-accent font-label text-label-lg"
                  : "flex items-center gap-gutter-md px-gutter-md py-gutter-sm rounded text-sidebar-muted hover:text-on-sidebar hover:bg-sidebar-surface font-label text-label-lg transition-colors duration-state-change ease-state-change";

                if (!item.href) {
                  return (
                    <li key={item.id}>
                      <span
                        className={`${className} opacity-50 cursor-not-allowed`}
                        title="Coming soon"
                      >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={className}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-gutter-md p-gutter-md rounded-xl bg-sidebar-surface mt-gutter-xl">
          <div className="flex items-center justify-between">
            <span className="font-label text-label-md text-accent">Groq AI Engine</span>
            <Icon name="auto_awesome" className="text-accent text-title-md" />
          </div>
          <p className="font-body text-body-sm text-sidebar-muted text-pretty">
            Curated bank plus on-the-fly Groq generation and coaching feedback.
          </p>
          <Link
            href="/start"
            className="inline-flex items-center justify-center gap-gutter-sm px-gutter-md py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg transition-colors duration-state-change ease-state-change hover:bg-accent-container"
          >
            Start Interview
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-gutter-md px-gutter-lg py-gutter-md bg-surface-container-low border-b border-outline-variant">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Icon
              name="search"
              className="text-outline absolute left-3 top-1/2 -translate-y-1/2 text-title-md pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search tracks, topics, or past sessions..."
              aria-label="Search tracks, topics, or past sessions"
              className="w-full pl-10 pr-gutter-md py-gutter-sm rounded-full bg-surface-container border border-outline-variant font-body text-body-md text-on-surface placeholder:text-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-gutter-md">
            <HeaderClock />
            <button
              type="button"
              aria-label="Saved questions"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container border border-outline-variant text-on-surface transition-colors duration-state-change ease-state-change hover:bg-surface-container-high"
            >
              <Icon name="star" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container border border-outline-variant text-on-surface transition-colors duration-state-change ease-state-change hover:bg-surface-container-high"
            >
              <Icon name="notifications" />
            </button>
            <div className="flex items-center gap-gutter-sm pl-gutter-sm">
              <span className="font-label text-label-lg text-on-surface hidden md:inline">
                Practice mode
              </span>
              <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-title-md">
                PP
              </span>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
