'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Square, Settings, TrendingUp, CheckSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FocusSession {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: 'focus' | 'break';
  completed: boolean;
  task?: string;
}

interface FocusSettings {
  focusDuration: number;
  shortBreak: number;
  longBreak: number;
  totalSessions: number;
  longBreakInterval: number;
}

const FOCUS_STORAGE_KEY = 'focus-mode-sessions';
const FOCUS_HISTORY_KEY = 'focus-session-history';
const FOCUS_SETTINGS_KEY = 'focus-settings';
const GLOBAL_TIMER_KEY = 'focus-global-timer';
const NOTIFICATION_PERMISSION_KEY = 'notification-permission-requested';

const DEFAULT_SETTINGS: FocusSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  totalSessions: 4,
  longBreakInterval: 4,
};

export function FocusMode() {
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>([]);
  const [currentTask, setCurrentTask] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentSessionStart, setCurrentSessionStart] = useState<string | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const savedGlobalState = localStorage.getItem(GLOBAL_TIMER_KEY);
    if (savedGlobalState) {
      try {
        const state = JSON.parse(savedGlobalState);
        
        if (state.isRunning && state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
          
          setTimeLeft(newTimeLeft);
          setStartTimestamp(state.startTime);
          
          if (newTimeLeft === 0) {
            handleSessionCompleteFromRestore(state);
            return;
          }
        } else {
          setTimeLeft(state.timeLeft);
        }
        
        setIsRunning(state.isRunning);
        setIsBreak(state.isBreak);
        setSessionsCompleted(state.sessionsCompleted);
        setCurrentTask(state.currentTask);
        setSettings(state.settings);
      } catch (error) {
        console.error('Failed to restore timer state:', error);
      }
    }

    const savedSessions = localStorage.getItem(FOCUS_STORAGE_KEY);
    const savedHistory = localStorage.getItem(FOCUS_HISTORY_KEY);
    const savedSettings = localStorage.getItem(FOCUS_SETTINGS_KEY);
    
    if (savedSessions) {
      try {
        setSessionsCompleted(parseInt(savedSessions, 10));
      } catch (error) {
        console.error('Failed to load focus mode data:', error);
      }
    }
    if (savedHistory) {
      try {
        setSessionHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load session history:', error);
      }
    }
    if (savedSettings && !savedGlobalState) {
      try {
        const loaded = JSON.parse(savedSettings);
        setSettings(loaded);
        setTimeLeft(loaded.focusDuration * 60);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    const globalState = {
      timeLeft,
      isRunning,
      isBreak,
      sessionsCompleted,
      startTime: startTimestamp,
      currentTask,
      settings,
    };
    localStorage.setItem(GLOBAL_TIMER_KEY, JSON.stringify(globalState));
  }, [timeLeft, isRunning, isBreak, sessionsCompleted, startTimestamp, currentTask, settings]);

  useEffect(() => {
    localStorage.setItem(FOCUS_STORAGE_KEY, sessionsCompleted.toString());
  }, [sessionsCompleted]);

  useEffect(() => {
    localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(sessionHistory));
  }, [sessionHistory]);

  useEffect(() => {
    localStorage.setItem(FOCUS_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const hasRequested = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    
    if ('Notification' in window && Notification.permission === 'default' && !hasRequested) {
      Notification.requestPermission().then(() => {
        localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      });
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isBreak, sessionsCompleted, settings]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!isRunning && !startTimestamp) {
      setStartTimestamp(Date.now());
      setCurrentSessionStart(new Date().toISOString());
    }
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(settings.focusDuration * 60);
    setCurrentSessionStart(null);
    setStartTimestamp(null);
  };

  const handleSessionCompleteFromRestore = (state) => {
    if (!state.isBreak) {
      setSessionsCompleted(state.sessionsCompleted + 1);
    }

    const isLongBreak = !state.isBreak && (state.sessionsCompleted + 1) % state.settings.longBreakInterval === 0;
    const hasMoreSessions = !state.isBreak && (state.sessionsCompleted + 1) < state.settings.totalSessions;
    
    if (!state.isBreak && hasMoreSessions) {
      const nextDuration = isLongBreak ? state.settings.longBreak : state.settings.shortBreak;
      setIsBreak(true);
      setTimeLeft(nextDuration * 60);
      setIsRunning(false);
    } else if (state.isBreak && state.sessionsCompleted < state.settings.totalSessions) {
      setIsBreak(false);
      setTimeLeft(state.settings.focusDuration * 60);
      setIsRunning(false);
    } else {
      handleCycleComplete();
    }
    
    setCurrentSessionStart(null);
    setStartTimestamp(null);
  };

  const handleSessionComplete = () => {
    if (currentSessionStart) {
      const session: FocusSession = {
        id: Date.now().toString(),
        startTime: currentSessionStart,
        endTime: new Date().toISOString(),
        duration: isBreak 
          ? (sessionsCompleted % settings.longBreakInterval === 0 ? settings.longBreak : settings.shortBreak)
          : settings.focusDuration,
        type: isBreak ? 'break' : 'focus',
        completed: true,
        task: isBreak ? undefined : currentTask || undefined,
      };
      setSessionHistory([session, ...sessionHistory]);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        isBreak ? 'Break Complete!' : 'Focus Session Complete!',
        { body: isBreak ? 'Time to focus again!' : 'Take a break!' }
      );
    }

    if (!isBreak) {
      setSessionsCompleted(sessionsCompleted + 1);
      
      if (sessionsCompleted + 1 >= settings.totalSessions) {
        handleCycleComplete();
        return;
      }
    }

    const isLongBreak = !isBreak && (sessionsCompleted % settings.longBreakInterval === 0);
    const nextDuration = !isBreak 
      ? (isLongBreak ? settings.longBreak : settings.shortBreak)
      : settings.focusDuration;

    setIsBreak(!isBreak);
    setTimeLeft(nextDuration * 60);
    setCurrentSessionStart(new Date().toISOString());
    setStartTimestamp(Date.now());
    setIsRunning(true);
  };

  const handleCycleComplete = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(settings.focusDuration * 60);
    setCurrentSessionStart(null);
    setStartTimestamp(null);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        'All Sessions Completed!',
        { body: `Congratulations! You completed ${settings.totalSessions} focus sessions.` }
      );
    }
  };

  const updateSettings = (key: keyof FocusSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (!isRunning) {
      setTimeLeft(isBreak ? newSettings.shortBreak * 60 : newSettings.focusDuration * 60);
    }
  };

  const getStatistics = () => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const todaySessions = sessionHistory.filter(s => 
      s.startTime.startsWith(today) && s.type === 'focus'
    );
    const weekSessions = sessionHistory.filter(s => 
      new Date(s.startTime) >= thisWeek && s.type === 'focus'
    );

    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalMinutes = sessionHistory
      .filter(s => s.type === 'focus')
      .reduce((sum, s) => sum + s.duration, 0);

    return {
      todayCount: todaySessions.length,
      todayMinutes,
      weekCount: weekSessions.length,
      weekMinutes,
      totalSessions: sessionHistory.filter(s => s.type === 'focus').length,
      totalMinutes,
    };
  };

  const stats = getStatistics();
  const progress = isBreak
    ? ((((sessionsCompleted % settings.longBreakInterval === 0 ? settings.longBreak : settings.shortBreak) * 60) - timeLeft) / ((sessionsCompleted % settings.longBreakInterval === 0 ? settings.longBreak : settings.shortBreak) * 60)) * 100
    : (((settings.focusDuration * 60) - timeLeft) / (settings.focusDuration * 60)) * 100;

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Focus Mode</h2>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              <TrendingUp size={16} className="md:mr-2" />
              <span className="hidden md:inline">Stats</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={16} className="md:mr-2" />
              <span className="hidden md:inline">Settings</span>
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="p-4 md:p-6 bg-card">
            <h3 className="font-semibold text-foreground mb-4">Pomodoro Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Focus Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.focusDuration}
                  onChange={(e) => updateSettings('focusDuration', parseInt(e.target.value) || 25)}
                  min={1}
                  max={120}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Short Break (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.shortBreak}
                  onChange={(e) => updateSettings('shortBreak', parseInt(e.target.value) || 5)}
                  min={1}
                  max={30}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Long Break (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.longBreak}
                  onChange={(e) => updateSettings('longBreak', parseInt(e.target.value) || 15)}
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Total Sessions to Complete
                </label>
                <Input
                  type="number"
                  value={settings.totalSessions}
                  onChange={(e) => updateSettings('totalSessions', parseInt(e.target.value) || 4)}
                  min={1}
                  max={20}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Long Break Interval
                </label>
                <Input
                  type="number"
                  value={settings.longBreakInterval}
                  onChange={(e) => updateSettings('longBreakInterval', parseInt(e.target.value) || 4)}
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Note: Changing settings during an active cycle will require a restart.
            </p>
          </Card>
        )}

        {/* Statistics Panel */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 md:p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-2">Today</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.todayCount}</p>
              <p className="text-xs text-muted-foreground">{stats.todayMinutes} minutes</p>
            </Card>
            <Card className="p-4 md:p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-2">This Week</p>
              <p className="text-2xl md:text-3xl font-bold text-primary">{stats.weekCount}</p>
              <p className="text-xs text-muted-foreground">{stats.weekMinutes} minutes</p>
            </Card>
            <Card className="p-4 md:p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-2">All Time</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalSessions}</p>
              <p className="text-xs text-muted-foreground">{stats.totalMinutes} minutes</p>
            </Card>
          </div>
        )}

        {/* Main Timer */}
        <Card className="bg-card p-6 md:p-12">
          <div className="text-center space-y-6 md:space-y-8">
            {!isBreak && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  What are you working on?
                </label>
                <Input
                  placeholder="Enter task name..."
                  value={currentTask}
                  onChange={(e) => setCurrentTask(e.target.value)}
                  disabled={isRunning}
                  className="text-center"
                />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isBreak 
                  ? (sessionsCompleted % settings.longBreakInterval === 0 ? 'Long Break' : 'Short Break')
                  : `Focus Time (${sessionsCompleted + 1}/${settings.totalSessions})`}
              </p>
              <p className="text-5xl md:text-7xl font-bold text-primary font-mono">{formatTime(timeLeft)}</p>
              
              <div className="w-full bg-muted rounded-full h-2 mt-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3 md:gap-4 justify-center items-center flex-wrap">
              <Button
                onClick={handlePlayPause}
                size="lg"
                className="gap-2 px-6 md:px-8"
              >
                {isRunning ? (
                  <>
                    <Pause size={20} /> Pause
                  </>
                ) : (
                  <>
                    <Play size={20} /> {startTimestamp ? 'Resume' : 'Start'}
                  </>
                )}
              </Button>

              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Square size={20} /> Stop
              </Button>
            </div>

            <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sessions Today</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.todayCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Until Long Break</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">
                  {settings.longBreakInterval - (sessionsCompleted % settings.longBreakInterval)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Sessions */}
        {sessionHistory.length > 0 && (
          <Card className="p-4 md:p-6 bg-card">
            <h3 className="font-semibold text-foreground mb-4">Recent Sessions</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sessionHistory.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex justify-between items-center p-3 bg-muted rounded"
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare
                      size={16}
                      className={session.type === 'focus' ? 'text-primary' : 'text-muted-foreground'}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.task || `${session.type === 'focus' ? 'Focus' : 'Break'} Session`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {session.duration}m
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
