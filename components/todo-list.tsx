'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Trash2, Calendar, Tag, Folder, Clock, Bell, Edit2, Check, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SharedTask, TaskStatus, loadTodoTasks, saveTodoTasks, saveKanbanTasks, loadKanbanTasks } from '@/lib/shared-task-model'; // Changed import
import { getTodos, saveTodos, subscribeTodoChanges, migrateGuestDataToSupabase } from '@/lib/supabase-sync';

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  project: string;
  tags: string[];
  dueDate?: string;
  dueTime?: string;
  reminderTime?: string;
  reminderEnabled?: boolean;
  createdAt: string;
  completedAt?: string; // Added completion timestamp for analytics
  subtasks: SubTask[];
  owner: string;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'none'; // Added recurring task support
}

type ViewType = 'all' | 'today' | 'upcoming' | 'overdue' | 'project' | 'completed' | 'analytics'; // Added analytics view

const TODO_STORAGE_KEY = 'todos-advanced';
const PROJECTS_STORAGE_KEY = 'todo-projects';
const PROJECT_SHARING_KEY = 'project-sharing';
const OWNER_EMAIL = 'lambozaq@gmail.com';
const NOTIFICATION_PERMISSION_KEY = 'notification-permission-requested';

export function TodoList() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [projects, setProjects] = useState<string[]>(['Inbox']);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedProject, setSelectedProject] = useState('Inbox');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [newProject, setNewProject] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingSubtaskId, setAddingSubtaskId] = useState<string | null>(null);
  const [subtaskInputs, setSubtaskInputs] = useState<{ [taskId: string]: string[] }>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [projectSharing, setProjectSharing] = useState<{ [projectId: string]: string[] }>({});
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [selectedRecurring, setSelectedRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none'); // Added recurring selector
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  
  const [moveToKanbanDialog, setMoveToKanbanDialog] = useState<string | null>(null);
  const [selectedKanbanColumn, setSelectedKanbanColumn] = useState<TaskStatus>('todo');

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    console.log('[v0] TodoList initializing...');
    
    const loadedTasks = loadTodoTasks();
    console.log('[v0] Initial load - tasks count:', loadedTasks.length);
    setTasks(loadedTasks);
    
    const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const savedSharing = localStorage.getItem(PROJECT_SHARING_KEY);
    
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    }
    if (savedSharing) {
      try {
        setProjectSharing(JSON.parse(savedSharing));
      } catch (error) {
        console.error('Failed to load sharing:', error);
      }
    }
  }, []);


  useEffect(() => {
    // Save projects to Supabase or localStorage
    if (currentUser) {
      // For authenticated users, projects and sharing settings are part of the user's data
      // and should be saved via saveTodos or a dedicated user profile function.
      // For now, we'll just log this to indicate it needs proper integration.
      console.log('[v0] Saving projects to Supabase/user profile (needs implementation)');
    } else {
      // For guests, save to localStorage
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects, currentUser]);

  useEffect(() => {
    // Save sharing settings to Supabase or localStorage
    if (currentUser) {
      console.log('[v0] Saving sharing to Supabase/user profile (needs implementation)');
    } else {
      localStorage.setItem(PROJECT_SHARING_KEY, JSON.stringify(projectSharing));
    }
  }, [projectSharing, currentUser]);

  useEffect(() => {
    const hasRequested = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    
    if ('Notification' in window && Notification.permission === 'default' && !hasRequested) {
      Notification.requestPermission().then(() => {
        localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      });
    }
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      tasks.forEach((task) => {
        if (task.reminderEnabled && task.reminderTime?.startsWith(currentTime) && task.status !== 'done') {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Reminder', {
              body: task.title,
              icon: '/task-icon.png',
            });
          } else {
            alert(`Reminder: ${task.title}`);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    const checkRecurring = () => {
      const today = new Date().toISOString().split('T')[0];
      
      tasks.forEach((task) => {
        if (task.status === 'done' && task.recurring && task.recurring !== 'none' && task.completedAt) {
          const completed = new Date(task.completedAt);
          const now = new Date();
          let shouldRecreate = false;

          if (task.recurring === 'daily' && now.getTime() - completed.getTime() >= 86400000) {
            shouldRecreate = true;
          } else if (task.recurring === 'weekly' && now.getTime() - completed.getTime() >= 604800000) {
            shouldRecreate = true;
          } else if (task.recurring === 'monthly') {
             const completedDate = new Date(task.completedAt);
             const nextDueDate = new Date(completedDate);
             nextDueDate.setMonth(completedDate.getMonth() + 1);
             if (now >= nextDueDate) {
               shouldRecreate = true;
             }
          }

          if (shouldRecreate) {
            const newTask: SharedTask = {
              ...task,
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              status: 'todo',
              completedAt: undefined,
              createdAt: new Date().toISOString(),
            };
            setTasks(prev => [...prev, newTask]);
          }
        }
      });
    };

    const interval = setInterval(checkRecurring, 3600000); // Check every hour
    checkRecurring(); // Check on mount
    return () => clearInterval(interval);
  }, [tasks]);

  const addProject = () => {
    if (!newProject.trim()) return;
    if (!projects.includes(newProject)) {
      setProjects([...projects, newProject]);
    }
    setNewProject('');
  };

  const parseDueDate = (input: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (input.toLowerCase().includes('today')) {
      return today.toISOString().split('T')[0];
    } else if (input.toLowerCase().includes('tomorrow')) {
      return tomorrow.toISOString().split('T')[0];
    }
    return '';
  };

  const addTodo = () => { // Changed from async
    if (!newTodo.trim()) return;

    console.log('[v0] addTodo called with:', newTodo);
    
    const parsedDate = parseDueDate(newTodo);
    const newTask: SharedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newTodo,
      status: 'todo',
      priority,
      project: selectedProject,
      tags: selectedTags,
      dueDate: dueDate || parsedDate,
      dueTime: dueTime,
      reminderTime: dueTime,
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
      subtasks: [],
      owner: currentUser || 'guest',
      recurring: selectedRecurring,
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
    console.log('[v0] Saved successfully');
    
    // Reset form
    setNewTodo('');
    setSelectedTags([]);
    setDueDate('');
    setDueTime('');
    setSelectedRecurring('none');
  };

  const toggleTask = (id: string) => { // Changed from async
    const updated = tasks.map((t) => 
      t.id === id 
        ? { 
            ...t, 
            status: t.status === 'done' ? 'todo' : 'done',
            completedAt: t.status === 'done' ? undefined : new Date().toISOString()
          } 
        : t
    );
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
  };

  const startEditingTask = (task: SharedTask) => {
    setEditingTaskId(task.id);
    setEditingText(task.title);
  };

  const saveTaskEdit = (id: string) => { // Changed from async
    if (!editingText.trim()) return;
    const updated = tasks.map((t) => (t.id === id ? { ...t, title: editingText } : t));
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
    setEditingTaskId(null);
    setEditingText('');
  };

  const deleteTask = (id: string) => { // Changed from async
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
  };

  const addSubtask = (taskId: string, index: number) => { // Changed from async
    const inputs = subtaskInputs[taskId] || [];
    if (!Array.isArray(inputs)) return;
    
    const text = inputs[index] || '';
    if (!text.trim()) return;
    
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const existingSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        return {
          ...t,
          subtasks: [
            ...existingSubtasks,
            {
              id: Date.now().toString() + Math.random(),
              text: text.trim(),
              completed: false,
            },
          ],
        };
      }
      return t;
    });
    
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos

    const currentInputs = Array.isArray(subtaskInputs[taskId]) ? [...subtaskInputs[taskId]] : [''];
    currentInputs[index] = '';
    currentInputs.push('');
    setSubtaskInputs({ ...subtaskInputs, [taskId]: currentInputs });
  };

  const updateSubtaskInput = (taskId: string, index: number, value: string) => {
    const currentInputs = Array.isArray(subtaskInputs[taskId]) ? [...subtaskInputs[taskId]] : [''];
    currentInputs[index] = value;
    setSubtaskInputs({ ...subtaskInputs, [taskId]: currentInputs });
  };

  const startAddingSubtask = (taskId: string) => {
    setAddingSubtaskId(taskId);
    setExpandedTask(taskId);
    setSubtaskInputs({ ...subtaskInputs, [taskId]: [''] });
  };

  const finishAddingSubtasks = (taskId: string) => {
    const inputs = Array.isArray(subtaskInputs[taskId]) ? subtaskInputs[taskId] : [];
    inputs.forEach((text, index) => {
      if (text && text.trim()) {
        addSubtask(taskId, index);
      }
    });
    
    setAddingSubtaskId(null);
    setSubtaskInputs({ ...subtaskInputs, [taskId]: [] });
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => { // Changed from async
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const existingSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        return {
          ...t,
          subtasks: existingSubtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          ),
        };
      }
      return t;
    });
    
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => { // Changed from async
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const existingSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        return {
          ...t,
          subtasks: existingSubtasks.filter((st) => st.id !== subtaskId),
        };
      }
      return t;
    });
    
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
  };

  const toggleReminder = (id: string) => { // Changed from async
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, reminderEnabled: !t.reminderEnabled } : t
    );
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
  };

  const toggleProjectSharing = (projectId: string, userEmail: string) => {
    setProjectSharing(prev => {
      const current = prev[projectId] || [];
      const updated = current.includes(userEmail)
        ? current.filter(u => u !== userEmail)
        : [...current, userEmail];
      return { ...prev, [projectId]: updated };
    });
    // TODO: Save project sharing settings to Supabase/user profile when integrated
  };

  const getAccessibleProjects = () => {
    if (!currentUser) return projects;
    
    if (currentUser === OWNER_EMAIL) {
      return projects;
    }

    const ownProjects = projects.filter(p => !projectSharing[p] || projectSharing[p].length === 0); // Projects without explicit sharing are only owner's
    const sharedProjects = projects.filter(p => projectSharing[p]?.includes(currentUser));
    
    return [...ownProjects, ...sharedProjects];
  };

  const saveProjectName = (oldName: string) => { // Changed from async
    if (!editingProjectName.trim() || editingProjectName === oldName) {
      setEditingProjectId(null);
      return;
    }

    setProjects(projects.map(p => p === oldName ? editingProjectName : p));
    
    const updated = tasks.map(t => 
      t.project === oldName ? { ...t, project: editingProjectName } : t
    );
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
    
    // Update project sharing
    if (projectSharing[oldName]) {
      const newSharing = { ...projectSharing };
      newSharing[editingProjectName] = newSharing[oldName];
      delete newSharing[oldName];
      setProjectSharing(newSharing);
      // TODO: Save project sharing settings to Supabase/user profile when integrated
    }
    
    if (selectedProject === oldName) {
      setSelectedProject(editingProjectName);
    }
    
    setEditingProjectId(null);
  };

  const deleteProject = (projectName: string) => { // Changed from async
    if (projects.length <= 1) {
      alert("You must have at least one project");
      return;
    }

    if (!confirm(`Delete project "${projectName}"? Tasks in this project will be moved to the first remaining project.`)) {
      return;
    }

    const remainingProjects = projects.filter(p => p !== projectName);
    const newDefaultProject = remainingProjects[0];

    const updated = tasks.map(t => 
      t.project === projectName ? { ...t, project: newDefaultProject} : t
    );
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos

    setProjects(remainingProjects);

    if (projectSharing[projectName]) {
      const newSharing = { ...projectSharing };
      delete newSharing[projectName];
      setProjectSharing(newSharing);
      // TODO: Save project sharing settings to Supabase/user profile when integrated
    }

    if (selectedProject === projectName) {
      setSelectedProject(newDefaultProject);
    }
  };

  const startEditingProject = (projectName: string) => {
    setEditingProjectId(projectName);
    setEditingProjectName(projectName);
  };

  const setTaskReminder = (taskId: string, date: string, time: string) => { // Changed from async
    const updated = tasks.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            reminderTime: `${date}T${time}`,
            reminderEnabled: true 
          } 
        : t
    );
    setTasks(updated);
    saveTodoTasks(updated); // Changed from saveTodos
    setShowReminderDialog(null);
    setReminderDate('');
    setReminderTime('');
  };

  const getFilteredTasks = () => {
    console.log('[v0] getFilteredTasks - total tasks:', tasks.length);
    console.log('[v0] currentView:', currentView, 'selectedProject:', selectedProject);
    console.log('[v0] currentUser:', currentUser);
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let accessibleTasks = tasks.filter(task => {
      // If no owner set or owner is current user, show it
      if (!task.owner || task.owner === 'unknown' || task.owner === currentUser) return true;
      // If project is shared with current user, show it
      if (projectSharing[task.project]?.includes(currentUser || '')) return true;
      // Otherwise hide it
      return false;
    });

    console.log('[v0] accessibleTasks count:', accessibleTasks.length);

    let filtered = accessibleTasks;

    if (currentView === 'today') {
      filtered = accessibleTasks.filter((t) => t.dueDate === today && t.status !== 'done');
    } else if (currentView === 'upcoming') {
      filtered = accessibleTasks.filter((t) => t.dueDate && t.dueDate >= tomorrowStr && t.status !== 'done');
    } else if (currentView === 'overdue') {
      filtered = accessibleTasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done');
    } else if (currentView === 'project') {
      filtered = accessibleTasks.filter((t) => t.project === selectedProject);
    } else if (currentView === 'completed') {
      filtered = accessibleTasks.filter((t) => t.status === 'done');
    }

    // Always filter by selected tags if any are selected
    if (selectedTags.length > 0) {
      filtered = filtered.filter(task => 
        task.tags.some(tag => selectedTags.includes(tag))
      );
    }

    console.log('[v0] filtered tasks count:', filtered.length);
    return filtered;
  };

  const getAnalytics = () => {
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt) || [];
    const totalCompleted = completedTasks.length;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completedThisWeek = completedTasks.filter(t => 
      t.completedAt && new Date(t.completedAt) >= weekAgo
    ).length;

    const completionTimes = completedTasks
      .filter(t => t.createdAt && t.completedAt)
      .map(t => {
        const created = new Date(t.createdAt).getTime();
        const completed = new Date(t.completedAt!).getTime();
        return (completed - created) / (1000 * 60 * 60 * 24); // Days
      });
    
    const avgCompletionTime = completionTimes.length > 0
      ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1)
      : '0';

    const highPriorityTotal = tasks.filter(t => t.priority === 'high').length;
    const highPriorityCompleted = tasks.filter(t => t.priority === 'high' && t.status === 'done').length;
    const highPriorityRate = highPriorityTotal > 0 
      ? ((highPriorityCompleted / highPriorityTotal) * 100).toFixed(0)
      : '0';

    const projectCompletion: { [key: string]: number } = {};
    completedTasks.forEach(t => {
      if (t.project) {
        projectCompletion[t.project] = (projectCompletion[t.project] || 0) + 1;
      }
    });
    const mostProductiveProject = Object.entries(projectCompletion)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalCompleted,
      completedThisWeek,
      avgCompletionTime,
      highPriorityRate,
      mostProductiveProject: mostProductiveProject ? mostProductiveProject[0] : 'None',
      mostProductiveCount: mostProductiveProject ? mostProductiveProject[1] : 0,
    };
  };

  const analytics = getAnalytics();

  // Extract all unique tags from tasks that are accessible to the current user
  const allTags = Array.from(new Set(tasks.filter(task => {
    if (task.owner === currentUser) return true;
    if (projectSharing[task.project]?.includes(currentUser || '')) return true;
    return false;
  }).flatMap((t) => t.tags)));

  const completedCount = getFilteredTasks().filter((t) => t.status === 'done').length;
  const filteredTasks = getFilteredTasks();
  const isOwner = currentUser === OWNER_EMAIL;
  const accessibleProjects = getAccessibleProjects();

  const priorityColor = {
    low: 'text-blue-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const priorityBorder = {
    low: 'border-l-blue-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-red-500',
  };

  const moveTaskToKanbanBoard = (taskId: string, column: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Remove from todo list
    const updatedTodoTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTodoTasks);
    saveTodoTasks(updatedTodoTasks);

    // Add to kanban with selected column status
    const kanbanTasks = loadKanbanTasks();
    const kanbanTask: SharedTask = {
      ...task,
      status: column,
    };
    const updatedKanbanTasks = [...kanbanTasks, kanbanTask];
    saveKanbanTasks(updatedKanbanTasks);

    setMoveToKanbanDialog(null);
    console.log('[v0] Task moved to Kanban:', column);
  };


  console.log('[v0] Rendering TodoList - tasks:', tasks.length, 'filtered:', filteredTasks.length);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-foreground">Task Manager</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Sidebar - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          {/* Projects */}
          <Card className="p-4 bg-card">
            <h3 className="text-sm font-bold text-foreground mb-3">Projects</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {accessibleProjects.map((proj) => (
                <div key={proj} className="flex items-center justify-between gap-2 group">
                  {editingProjectId === proj ? (
                    <div className="flex-1 flex gap-1">
                      <Input
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveProjectName(proj)}
                        onBlur={() => saveProjectName(proj)}
                        className="text-sm h-8"
                        autoFocus
                      />
                      <button
                        onClick={() => saveProjectName(proj)}
                        className="text-primary p-1"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setCurrentView('project');
                          setSelectedProject(proj);
                        }}
                        className={`flex-1 text-left px-3 py-2 rounded text-sm transition-colors ${
                          currentView === 'project' && selectedProject === proj
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <Folder size={14} className="inline mr-2" />
                        {proj}
                      </button>
                      <button
                        onClick={() => startEditingProject(proj)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1"
                        title="Rename project"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteProject(proj)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => setShowShareModal(proj)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1"
                          title="Share project"
                        >
                          <Share2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="New project"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addProject()}
                className="text-sm h-8"
              />
              <Button onClick={addProject} size="sm" className="h-8">
                <Plus size={16} />
              </Button>
            </div>
          </Card>

          {/* Smart Views */}
          <Card className="p-4 bg-card">
            <h3 className="text-sm font-bold text-foreground mb-3">Views</h3>
            <div className="space-y-2">
              {[
                { view: 'all', label: 'All Tasks' },
                { view: 'today', label: 'Today' },
                { view: 'upcoming', label: 'Upcoming' },
                { view: 'overdue', label: 'Overdue' },
                { view: 'project', label: 'Project' },
                { view: 'completed', label: 'Completed' },
                { view: 'analytics', label: 'Analytics' },
              ].map(({ view, label }) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view as ViewType)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    currentView === view
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <Card className="p-4 bg-card">
              <h3 className="text-sm font-bold text-foreground mb-3">Tags</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTags([...selectedTags, tag]);
                        } else {
                          setSelectedTags(selectedTags.filter((t) => t !== tag));
                        }
                      }}
                    />
                    <Tag size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{tag}</span>
                  </label>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          <div className="lg:hidden">
            <Card className="p-4 bg-card">
              <label className="text-sm font-semibold text-foreground mb-2 block">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setCurrentView('project');
                }}
                className="w-full px-3 py-2 border-2 border-primary rounded-md bg-background text-foreground text-sm font-medium"
              >
                {accessibleProjects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </Card>
          </div>

          {currentView === 'analytics' ? (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-foreground">Productivity Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-card">
                  <p className="text-sm text-muted-foreground mb-2">Total Completed</p>
                  <p className="text-4xl font-bold text-foreground">{analytics.totalCompleted}</p>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </Card>

                <Card className="p-6 bg-card">
                  <p className="text-sm text-muted-foreground mb-2">Completed This Week</p>
                  <p className="text-4xl font-bold text-primary">{analytics.completedThisWeek}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                </Card>

                <Card className="p-6 bg-card">
                  <p className="text-sm text-muted-foreground mb-2">Avg. Completion Time</p>
                  <p className="text-4xl font-bold text-foreground">{analytics.avgCompletionTime}</p>
                  <p className="text-xs text-muted-foreground mt-1">Days</p>
                </Card>

                <Card className="p-6 bg-card">
                  <p className="text-sm text-muted-foreground mb-2">High Priority Success</p>
                  <p className="text-4xl font-bold text-red-500">{analytics.highPriorityRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Completion rate</p>
                </Card>

                <Card className="p-6 bg-card col-span-1 md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">Most Productive Project</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.mostProductiveProject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.mostProductiveCount} tasks completed
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-card">
                <h4 className="font-bold text-foreground mb-4">Task Distribution</h4>
                <div className="space-y-3">
                  {['high', 'medium', 'low'].map(priority => {
                    const total = tasks.filter(t => t.priority === priority).length;
                    const completed = tasks.filter(t => t.priority === priority && t.status === 'done').length;
                    const percentage = total > 0 ? (completed / total) * 100 : 0;
                    
                    return (
                      <div key={priority}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground capitalize">{priority} Priority</span>
                          <span className="text-muted-foreground">{completed}/{total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              priority === 'high' ? 'bg-red-500' : 
                              priority === 'medium' ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <Card className="p-3 md:p-4 bg-card">
                  <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{filteredTasks.length}</p>
                </Card>
                <Card className="p-3 md:p-4 bg-card">
                  <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{completedCount}</p>
                </Card>
                <Card className="p-3 md:p-4 bg-card">
                  <p className="text-xs md:text-sm text-muted-foreground">Active</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{filteredTasks.length - completedCount}</p>
                </Card>
              </div>

              {/* Project Selector - Desktop only */}
              <Card className="hidden lg:block p-4 bg-card">
                <label className="text-sm font-semibold text-foreground mb-2 block">Select Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-primary rounded-md bg-background text-foreground text-sm font-medium ring-2 ring-primary/30 focus:outline-none"
                >
                  {accessibleProjects.map((proj) => (
                    <option key={proj} value={proj}>
                      {proj}
                    </option>
                  ))}
                </select>
              </Card>

              {/* Add Task */}
              <Card className="p-4 md:p-6 bg-card">
                <div className="space-y-3 md:space-y-4">
                  <Input
                    placeholder="Add a new task..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                    className="text-base border-2 border-blue-500 ring-2 ring-blue-500/30 focus:outline-none focus:ring-blue-500/50 bg-blue-50 dark:bg-blue-950/20"
                  />

                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="lg:hidden flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Advanced Options
                  </button>

                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 ${showAdvancedOptions || 'hidden lg:grid'}`}>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>

                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="text-sm"
                    />

                    <Input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="text-sm"
                    />

                    <select
                      value={selectedRecurring}
                      onChange={(e) => setSelectedRecurring(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    >
                      <option value="none">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <Button onClick={addTodo} className="w-full">
                    <Plus size={16} /> Add Task
                  </Button>
                </div>
              </Card>

              {/* Task List */}
              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <Card className="p-8 text-center bg-card">
                    <p className="text-muted-foreground">
                      {currentView === 'completed' ? 'No completed tasks yet!' : 'No tasks yet. Add one to get started!'}
                    </p>
                  </Card>
                ) : (
                  filteredTasks.map((task) => {
                    const taskSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                    const currentInputs = Array.isArray(subtaskInputs[task.id]) ? subtaskInputs[task.id] : [''];
                    
                    return (
                      <Card
                        key={task.id}
                        className={`p-3 md:p-4 bg-card border-l-4 transition-all ${priorityBorder[task.priority]} ${
                          task.status === 'done' ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Task Header */}
                          <div className="flex items-start gap-3 md:gap-4">
                            <div className="pt-1">
                              <Checkbox 
                                checked={task.status === 'done'} 
                                onCheckedChange={() => toggleTask(task.id)}
                                className="w-5 h-5 md:w-4 md:h-4"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              {editingTaskId === task.id ? (
                                <div className="flex gap-2">
                                  <Input
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="text-foreground font-medium"
                                    onKeyPress={(e) => e.key === 'Enter' && saveTaskEdit(task.id)}
                                  />
                                  <Button size="sm" onClick={() => saveTaskEdit(task.id)}>
                                    <Check size={16} />
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className={`text-foreground font-medium cursor-pointer hover:opacity-70 break-words ${
                                    task.status === 'done' ? 'line-through text-muted-foreground' : ''
                                  }`}
                                  onDoubleClick={() => startEditingTask(task)}
                                >
                                  {task.title}
                                </div>
                              )}

                              {/* Task Meta */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`text-xs font-semibold ${priorityColor[task.priority]}`}>
                                  {task.priority.toUpperCase()}
                                </span>

                                {task.dueDate && (
                                  <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1 text-foreground">
                                    <Calendar size={12} />
                                    {task.dueDate}
                                  </span>
                                )}

                                {task.dueTime && (
                                  <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1 text-foreground">
                                    <Clock size={12} />
                                    {task.dueTime}
                                  </span>
                                )}

                                {task.tags.map((tag) => (
                                  <span key={tag} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded flex items-center gap-1">
                                    <Tag size={12} />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-1 md:gap-2 flex-shrink-0">
                              <button
                                onClick={() => setMoveToKanbanDialog(task.id)}
                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                title="Move to Kanban"
                              >
                                <Share2 size={18} />
                              </button>
                              <button
                                onClick={() => setShowReminderDialog(task.id)}
                                className={`p-2 transition-colors ${
                                  task.reminderEnabled 
                                    ? 'text-primary bg-primary/10' 
                                    : 'text-muted-foreground hover:text-primary'
                                }`}
                                title={task.reminderEnabled ? 'Reminder set' : 'Set reminder'}
                              >
                                <Bell size={18} fill={task.reminderEnabled ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => startEditingTask(task)}
                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                title="Edit task"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {(taskSubtasks.length > 0 || expandedTask === task.id) && (
                            <div className="ml-8 md:ml-10 space-y-2 border-t pt-3">
                              <div className="text-sm font-semibold text-foreground">Subtasks</div>
                              {taskSubtasks.map((subtask) => (
                                <div key={subtask.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={subtask.completed}
                                    onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                    className="w-4 h-4"
                                  />
                                  <span
                                    className={`text-sm flex-1 ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                                  >
                                    {subtask.text}
                                  </span>
                                  <button
                                    onClick={() => deleteSubtask(task.id, subtask.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}

                              {addingSubtaskId === task.id && (
                                <div className="space-y-2">
                                  {currentInputs.map((text, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        placeholder={index === 0 ? "Add subtask (press Enter)" : "Add another subtask..."}
                                        value={text}
                                        onChange={(e) => updateSubtaskInput(task.id, index, e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (text.trim()) {
                                              addSubtask(task.id, index);
                                              // Focus will automatically move to the newly added input
                                              setTimeout(() => {
                                                const inputs = document.querySelectorAll(`input[placeholder*="Add another subtask"]`);
                                                const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                                                if (lastInput) lastInput.focus();
                                              }, 10);
                                            } else {
                                              // Empty input + Enter = exit subtask mode
                                              finishAddingSubtasks(task.id);
                                            }
                                          }
                                        }}
                                        className="text-sm"
                                        autoFocus={index === currentInputs.length - 1}
                                      />
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => finishAddingSubtasks(task.id)}
                                      >
                                        Done
                                      </Button>
                                    </div>
                                  ))}
                                  <p className="text-xs text-muted-foreground italic">
                                    Press Enter with text to add subtask, press Enter on empty field to finish
                                  </p>
                                </div>
                              )}
                              
                              {!addingSubtaskId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startAddingSubtask(task.id)}
                                  className="w-full text-xs"
                                >
                                  <Plus size={12} /> Add Subtask
                                </Button>
                              )}
                            </div>
                          )}

                          {!addingSubtaskId && taskSubtasks.length === 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startAddingSubtask(task.id)}
                              className="ml-8 md:ml-10 text-xs"
                            >
                              <Plus size={12} /> Add Subtasks
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showReminderDialog && (
        <Dialog open={!!showReminderDialog} onOpenChange={() => setShowReminderDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Time</label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setTaskReminder(showReminderDialog, reminderDate, reminderTime)}
                  className="flex-1"
                  disabled={!reminderDate || !reminderTime}
                >
                  Set Reminder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReminderDialog(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 bg-card max-w-md w-full">
            <h3 className="text-lg font-bold text-foreground mb-4">Share "{showShareModal}" with users</h3>
            <div className="space-y-2 mb-4">
              {allUsers.filter(u => u !== OWNER_EMAIL).map(user => (
                <label key={user} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                  <Checkbox
                    checked={(projectSharing[showShareModal] || []).includes(user)}
                    onCheckedChange={() => toggleProjectSharing(showShareModal, user)}
                  />
                  <span className="text-foreground text-sm">{user}</span>
                </label>
              ))}
            </div>
            <Button onClick={() => setShowShareModal(null)} className="w-full">
              Done
            </Button>
          </Card>
        </div>
      )}

      {moveToKanbanDialog && (
        <Dialog open={!!moveToKanbanDialog} onOpenChange={() => setMoveToKanbanDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move to Kanban Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which column to move this task to:
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <input
                    type="radio"
                    name="kanban-column"
                    value="todo"
                    checked={selectedKanbanColumn === 'todo'}
                    onChange={(e) => setSelectedKanbanColumn(e.target.value as TaskStatus)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">To Do</div>
                    <div className="text-xs text-muted-foreground">Move to the To Do column</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <input
                    type="radio"
                    name="kanban-column"
                    value="inprogress"
                    checked={selectedKanbanColumn === 'inprogress'}
                    onChange={(e) => setSelectedKanbanColumn(e.target.value as TaskStatus)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">In Progress</div>
                    <div className="text-xs text-muted-foreground">Move to the In Progress column</div>
                  </div>
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => moveTaskToKanbanBoard(moveToKanbanDialog, selectedKanbanColumn)}
                  className="flex-1"
                >
                  Move to Kanban
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMoveToKanbanDialog(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
