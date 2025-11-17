'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Kanban } from '@/components/kanban';
import { TodoList } from '@/components/todo-list';
import { FocusMode } from '@/components/focus-mode';
import { Journal } from '@/components/journal';
import { BudgetTracker } from '@/components/budget-tracker';
import { Homepage } from '@/components/homepage';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { Button } from '@/components/ui/button';
import { LayoutGrid, CheckSquare, Zap, BookOpen, DollarSign, LogOut, Menu, X, Home, MoreHorizontal, Settings } from 'lucide-react';
import Link from 'next/link';
import { AccountSettings } from './account-settings';
import { DataProvider, useDataProvider } from '@/lib/data-provider';

type View = 'home' | 'kanban' | 'todo' | 'focus' | 'journal' | 'budget' | 'settings';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isGuest, isLoading, signOut } = useDataProvider();
  const viewParam = searchParams.get('view') as View;
  const [currentView, setCurrentView] = useState<View | 'settings'>(viewParam || 'home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    const handleViewChange = (event: any) => {
      setCurrentView(event.detail);
    };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Loading...</div>
          <p className="text-muted-foreground">Setting up your workspace</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'home' as View, icon: Home, label: 'Home' },
    { id: 'kanban' as View, icon: LayoutGrid, label: 'Kanban' },
    { id: 'todo' as View, icon: CheckSquare, label: 'To-Do' },
    { id: 'focus' as View, icon: Zap, label: 'Focus' },
    { id: 'journal' as View, icon: BookOpen, label: 'Journal' },
    { id: 'budget' as View, icon: DollarSign, label: 'Budget' }
  ];

  const primaryMobileNavItems = [
    { id: 'home' as View, icon: Home, label: 'Home' },
    { id: 'todo' as View, icon: CheckSquare, label: 'To-Do' },
    { id: 'kanban' as View, icon: LayoutGrid, label: 'Kanban' },
    { id: 'focus' as View, icon: Zap, label: 'Focus' },
  ];

  const secondaryItems = [
    { id: 'journal' as View, icon: BookOpen, label: 'Journal' },
    { id: 'budget' as View, icon: DollarSign, label: 'Budget' },
    { id: 'settings' as View, icon: Settings, label: 'Settings' },
  ];

  const handleViewChange = (view: View | 'settings') => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    setMobileMoreOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <PWAInstallPrompt />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <Link href="/">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 cursor-pointer hover:opacity-80 transition">
              ProductivityHub
            </div>
          </Link>
          {isGuest && (
            <p className="text-xs text-muted-foreground mt-2">Guest Mode</p>
          )}
          {user && (
            <p className="text-xs text-muted-foreground mt-2 truncate">{user.email}</p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={() => handleViewChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
              currentView === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          <Button onClick={handleSignOut} variant="outline" className="w-full justify-start gap-2">
            <LogOut className="w-4 h-4" />
            {isGuest ? 'Exit Guest Mode' : 'Logout'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 md:h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 md:px-8 justify-between">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            {currentView === 'settings' ? 'Settings' : navItems.find(item => item.id === currentView)?.label || 'Dashboard'}
          </h1>

          <div className="md:hidden w-10"></div>
        </div>

        {mobileMenuOpen && (
          <>
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="md:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 z-50 flex flex-col shadow-xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  ProductivityHub
                </div>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      currentView === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => handleViewChange('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                    currentView === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </button>
                <Button onClick={handleSignOut} variant="outline" className="w-full justify-start gap-2">
                  <LogOut className="w-4 h-4" />
                  {isGuest ? 'Exit Guest Mode' : 'Logout'}
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">
          {currentView === 'home' && <Homepage />}
          {currentView === 'kanban' && <Kanban />}
          {currentView === 'todo' && <TodoList />}
          {currentView === 'focus' && <FocusMode />}
          {currentView === 'journal' && <Journal />}
          {currentView === 'budget' && <BudgetTracker />}
          {currentView === 'settings' && <AccountSettings currentUser={user?.email || 'guest'} />}
        </div>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
          <div className="flex items-center justify-around h-16 px-2">
            {primaryMobileNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] ${
                  currentView === item.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <item.icon className={`w-6 h-6 ${currentView === item.id ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
            
            <button
              onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] ${
                mobileMoreOpen || ['journal', 'budget', 'settings'].includes(currentView)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-xs font-medium">More</span>
            </button>
          </div>

          {mobileMoreOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setMobileMoreOpen(false)}
              />
              <div className="absolute bottom-16 right-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
                {secondaryItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                      currentView === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DataProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="text-center">
            <div className="text-2xl font-semibold mb-2">Loading...</div>
            <p className="text-muted-foreground">Setting up your workspace</p>
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </DataProvider>
  );
}
