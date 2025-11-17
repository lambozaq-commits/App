'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, CheckSquare, Zap, TrendingUp, Calendar, Clock, Play } from 'lucide-react';
import { loadData } from '@/lib/simple-storage';
import { SharedTask } from '@/lib/shared-task-model';

interface FocusSession {
  completedSessions: number;
  isRunning: boolean;
  currentMode?: string;
  timeRemaining?: number;
}

export function Homepage() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [focusSession, setFocusSession] = useState<FocusSession>({ completedSessions: 0, isRunning: false });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const loadedTasks = loadData<SharedTask[]>('todo-tasks', []);
      setTasks(loadedTasks);

      // Load Focus session data
      const focusGlobalState = localStorage.getItem('focus-global-timer');
      if (focusGlobalState) {
        try {
          const state = JSON.parse(focusGlobalState);
          setFocusSession({
            completedSessions: state.sessionsCompleted || 0,
            isRunning: state.isRunning || false,
            currentMode: state.isBreak ? 'Break' : 'Focus',
            timeRemaining: state.timeLeft || 0,
          });
        } catch (error) {
          console.error('[v0] Failed to load focus state:', error);
        }
      }
    } catch (error) {
      console.error('[v0] Failed to load homepage data:', error);
    } finally {
      setLoading(false);
    }

    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate === today && t.status !== 'done');
    return todayTasks;
  };

  const getOverdueTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
    return overdueTasks;
  };

  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks
      .filter(t => t.dueDate && t.dueDate > today && t.status !== 'done')
      .sort((a, b) => {
        const dateA = a.dueDate || '';
        const dateB = b.dueDate || '';
        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityBg = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-950';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-950';
      case 'low': return 'bg-blue-100 dark:bg-blue-950';
      default: return 'bg-gray-100 dark:bg-gray-950';
    }
  };

  const getPriorityBorder = (priority?: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();
  const upcomingTasks = getUpcomingTasks();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}!
        </h1>
        <p className="text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Focus Session Widget */}
      <Card className="p-6 bg-card transition-all hover:shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Focus Session</h3>
              <p className="text-sm text-muted-foreground">
                {focusSession.isRunning 
                  ? `${focusSession.currentMode || 'Focus'} - ${formatTime(focusSession.timeRemaining || 0)} remaining`
                  : `${focusSession.completedSessions} sessions completed today`
                }
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              const event = new CustomEvent('changeView', { detail: 'focus' });
              window.dispatchEvent(event);
            }}
            variant={focusSession.isRunning ? 'default' : 'outline'}
            className="transition-all"
          >
            {focusSession.isRunning ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Continue
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Focus
              </>
            )}
          </Button>
        </div>
        {focusSession.isRunning && focusSession.timeRemaining && (
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, Math.max(0, ((1500 - focusSession.timeRemaining) / 1500) * 100))}%` }}
            />
          </div>
        )}
      </Card>

      {/* Today's Tasks and Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card transition-all hover:shadow-lg">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Due Today
            {overdueTasks.length > 0 && (
              <span className="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                {overdueTasks.length} overdue
              </span>
            )}
          </h3>
          {todayTasks.length === 0 && overdueTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks due today. Great job!</p>
          ) : (
            <div className="space-y-3">
              {[...overdueTasks.slice(0, 2), ...todayTasks.slice(0, 3)].map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border-l-4 ${getPriorityBorder(task.priority)} ${getPriorityBg(task.priority)} transition-all hover:scale-[1.02]`}
                >
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {(task.priority || 'medium').toUpperCase()}
                    </span>
                    {task.project && (
                      <span className="text-xs text-muted-foreground">• {task.project}</span>
                    )}
                    {task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && (
                      <span className="text-xs text-red-500 font-semibold">• OVERDUE</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-card transition-all hover:shadow-lg">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming
          </h3>
          {upcomingTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No upcoming tasks scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border-l-4 ${getPriorityBorder(task.priority)} ${getPriorityBg(task.priority)} transition-all hover:scale-[1.02]`}
                >
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      • {(task.priority || 'medium').toUpperCase()}
                    </span>
                    {task.project && (
                      <span className="text-xs text-muted-foreground">• {task.project}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-card transition-all hover:shadow-lg">
        <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
            onClick={() => {
              const event = new CustomEvent('changeView', { detail: 'kanban' });
              window.dispatchEvent(event);
            }}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="text-sm">Kanban Board</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
            onClick={() => {
              const event = new CustomEvent('changeView', { detail: 'todo' });
              window.dispatchEvent(event);
            }}
          >
            <CheckSquare className="w-6 h-6" />
            <span className="text-sm">To-Do List</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
            onClick={() => {
              const event = new CustomEvent('changeView', { detail: 'focus' });
              window.dispatchEvent(event);
            }}
          >
            <Zap className="w-6 h-6" />
            <span className="text-sm">Start Focus</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
            onClick={() => {
              const event = new CustomEvent('changeView', { detail: 'todo' });
              window.dispatchEvent(event);
            }}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-sm">Analytics</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
