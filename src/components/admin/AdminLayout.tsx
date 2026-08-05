'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import {
  LayoutDashboard, Users, Key, CreditCard, Megaphone,
  ClipboardList, ArrowDownToLine, Bell, BarChart3, Share2,
  Menu, LogOut, X, Coins, ArrowLeft,
} from 'lucide-react';
import { useAppStore, ViewName } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  view: ViewName;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', view: 'admin-dashboard', icon: LayoutDashboard },
  { label: 'Users', view: 'admin-users', icon: Users },
  { label: 'Activation Codes', view: 'admin-activation-codes', icon: Key },
  { label: 'Deposit Codes', view: 'admin-deposit-codes', icon: CreditCard },
  { label: 'Ads', view: 'admin-ads', icon: Megaphone },
  { label: 'Tasks', view: 'admin-tasks', icon: ClipboardList },
  { label: 'Withdrawals', view: 'admin-withdrawals', icon: ArrowDownToLine },
  { label: 'Announcements', view: 'admin-announcements', icon: Bell },
  { label: 'Analytics', view: 'admin-analytics', icon: BarChart3 },
  { label: 'Referrals', view: 'admin-referrals', icon: Share2 },
];

function SidebarContent({
  currentView,
  onNavigate,
  onNavigateMobile,
}: {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
  onNavigateMobile?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
          <Coins className="w-5 h-5 text-[#0a0a0f]" />
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-gold-text">ALCOIN</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <Separator className="opacity-20" />
      <ScrollArea className="flex-1 px-3 py-4 scrollbar-thin">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            return (
              <motion.button
                key={item.view}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onNavigate(item.view);
                  onNavigateMobile?.();
                }}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer w-full text-left
                  ${
                    isActive
                      ? 'text-[#d4a853] gold-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`
                }
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-nav-active"
                    className="absolute inset-0 rounded-xl bg-[#d4a853]/10 border border-[#d4a853]/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { view, setView, user } = useAppStore();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { await signOut({ redirectUrl: '/' }); } catch { window.location.href = '/'; }
  };

  const handleNavigate = (v: ViewName) => {
    setView(v);
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/[0.08] bg-white/[0.02] backdrop-blur-xl fixed inset-y-0 left-0 z-40">
        <SidebarContent
          currentView={view}
          onNavigate={handleNavigate}
        />
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-[#0a0a0f] border-white/[0.08]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            currentView={view}
            onNavigate={handleNavigate}
            onNavigateMobile={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 glass-strong border-b border-white/[0.06]">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="lg:hidden w-10" />
            <div className="hidden lg:block">
              <h2 className="text-sm font-medium text-muted-foreground">
                {navItems.find((i) => i.view === view)?.label || 'Admin'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-[#0a0a0f]">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user?.fullName || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-8 opacity-20" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('dashboard')}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Separator orientation="vertical" className="h-8 opacity-20" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
