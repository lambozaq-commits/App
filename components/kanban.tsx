'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Filter, Settings, Archive, Calendar, AlertCircle, MessageSquare, CheckSquare, Pencil, Check, Folder, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SharedTask, TaskStatus, mapStatusToColumn, mapColumnToStatus } from '@/lib/shared-task-model';
import { getKanbanCards, saveKanbanCards, subscribeKanbanChanges, migrateGuestDataToSupabase } from '@/lib/supabase-sync';

const PROJECTS_STORAGE_KEY = 'todo-projects';

export function Kanban() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [draggedTask, setDraggedTask] = useState<{ taskId: string } | null>(null);
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null);
  const [editingProjectValue, setEditingProjectValue] = useState('');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardPriority, setNewCardPriority] = useState('medium');
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [task, setTask] = useState<Partial<SharedTask>>({});

  const columns = [
    { id: 'todo', title: 'To Do', wipLimit: undefined },
    { id: 'inprogress', title: 'In Progress', wipLimit: 5 },
    { id: 'done', title: 'Done', wipLimit: undefined },
  ];

  useEffect(() => {
    console.log('[v0] Kanban initializing...');
    
    const loadData = async () => {
      await migrateGuestDataToSupabase();
      
      const loadedTasks = await getKanbanCards();
      console.log('[v0] Kanban: Loaded', loadedTasks.length, 'tasks');
      
      const now = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      const cleanedTasks = loadedTasks.filter(task => {
        if (task.archived && task.archivedAt) {
          const archivedTime = new Date(task.archivedAt).getTime();
          return now - archivedTime < oneDayInMs;
        }
        return true;
      });
      
      console.log('[v0] Kanban: After cleanup:', cleanedTasks.length, 'tasks');
      setTasks(cleanedTasks);
      
      const guestMode = localStorage.getItem('guestMode');
      const user = localStorage.getItem('currentUser');
      if (!guestMode && user) {
        const unsubscribe = subscribeKanbanChanges((updatedCards) => {
          console.log('[v0] Real-time update received:', updatedCards.length, 'cards');
          setTasks(updatedCards);
        });
        
        return () => unsubscribe();
      }
    };
    
    loadData();
    
    const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        if (parsedProjects.length > 0) {
          setProjects(parsedProjects);
          setSelectedProject(parsedProjects[0]);
        }
      } catch (error) {
        console.error('[v0] Failed to load projects:', error);
      }
    } else {
      setProjects(['General']);
      setSelectedProject('General');
    }
  }, []);

  const getTasksByColumn = (columnId: string) => {
    const status = mapColumnToStatus(columnId);
    return tasks.filter((task) => task.status === status);
  };

  const filterTasks = (tasksToFilter: SharedTask[]) => {
    return tasksToFilter.filter((task) => {
      if (task.archived && !showArchived) return false;
      if (filterProject && task.project !== filterProject) return false;
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterTags.length > 0 && !task.tags?.some((t) => filterTags.includes(t))) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  const addTask = async (columnId: string) => {
    if (!newTaskText[columnId]?.trim()) return;

    console.log('[v0] Kanban: addTask called with:', newTaskText[columnId]);

    const newTask: SharedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newTaskText[columnId],
      status: mapColumnToStatus(columnId),
      priority: 'medium',
      createdAt: new Date().toISOString(),
      owner: 'current-user',
      tags: [],
      project: selectedProject || 'General',
      subtasks: [],
      recurring: 'none',
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    
    await saveKanbanCards(updated);
    console.log('[v0] Kanban: Saved successfully');

    setNewTaskText({ ...newTaskText, [columnId]: '' });
  };

  const addCard = async () => {
    if (newCardTitle.trim() && selectedProject) {
      const newTask: SharedTask = {
        title: newCardTitle.trim(),
        status: 'todo' as TaskStatus,
        project: selectedProject,
        priority: newCardPriority,
        dueDate: newCardDueDate || undefined,
        owner: 'current-user',
        ...task,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      await saveKanbanCards(updatedTasks);
      console.log('[v0] Kanban: Added card, new count:', updatedTasks.length);

      setNewCardTitle('');
      setNewCardPriority('medium');
      setNewCardDueDate('');
      setTask({});
    }
  };

  const deleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    await saveKanbanCards(updated);
  };

  const moveTask = async (taskId: string, toColumnId: string) => {
    const newStatus = mapColumnToStatus(toColumnId);
    const updated = tasks.map((t) => 
      t.id === taskId 
        ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined }
        : t
    );
    setTasks(updated);
    await saveKanbanCards(updated);
  };

  const duplicateTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newTask: SharedTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    await saveKanbanCards(updatedTasks);
  };

  const archiveTask = async (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { 
        ...t, 
        archived: !t.archived,
        archivedAt: !t.archived ? new Date().toISOString() : undefined
      } : t
    );
    setTasks(updated);
    await saveKanbanCards(updated);
  };

  const updateTaskPriority = async (taskId: string, priority: 'low' | 'medium' | 'high') => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, priority } : t
    );
    setTasks(updated);
    await saveKanbanCards(updated);
  };

  const updateTask = async (taskId: string, updates: Partial<SharedTask>) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    setTasks(updated);
    await saveKanbanCards(updated);
  };

  const addComment = (taskId: string, text: string) => {
    if (!text.trim()) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCommentObj = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toISOString(),
    };

    updateTask(taskId, {
      comments: [...(task.comments || []), newCommentObj],
    });
    setNewComment('');
  };

  const toggleChecklistItem = (taskId: string, itemId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      checklist: task.checklist?.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    });
  };

  const addChecklistItem = (taskId: string, text: string) => {
    if (!text.trim()) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newItem = {
      id: Date.now().toString(),
      text,
      completed: false,
    };

    updateTask(taskId, {
      checklist: [...(task.checklist || []), newItem],
    });
    setNewChecklistItem('');
  };

  const removeChecklistItem = (taskId: string, itemId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      checklist: task.checklist?.filter(item => item.id !== itemId),
    });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const totalTasksFiltered = columns.reduce((sum, col) => {
    const columnTasks = getTasksByColumn(col.id);
    return sum + filterTasks(columnTasks).length;
  }, 0);

  const allProjects = projects.length > 0 ? projects : ['General'];

  const saveProjects = (projectList: string[]) => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectList));
    setProjects(projectList);
  };

  const renameProject = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) {
      setEditingProjectName(null);
      return;
    }

    if (projects.some(p => p.toLowerCase() === newName.toLowerCase() && p !== oldName)) {
      alert('A project with this name already exists');
      return;
    }

    const updatedProjects = projects.map(p => p === oldName ? newName : p);
    saveProjects(updatedProjects);

    const updated = tasks.map(t => 
      t.project === oldName ? { ...t, project: newName } : t
    );
    setTasks(updated);
    await saveKanbanCards(updated);

    if (selectedProject === oldName) {
      setSelectedProject(newName);
    }

    if (filterProject === oldName) {
      setFilterProject(newName);
    }

    setEditingProjectName(null);
  };

  const addNewProject = () => {
    if (!newProjectName.trim()) return;

    if (projects.some(p => p.toLowerCase() === newProjectName.toLowerCase())) {
      alert('A project with this name already exists');
      return;
    }

    const updatedProjects = [...projects, newProjectName];
    saveProjects(updatedProjects);
    setNewProjectName('');
  };

  const deleteProject = async (projectName: string) => {
    if (projects.length === 1) {
      alert('Cannot delete the last project. At least one project must remain.');
      return;
    }

    const tasksInProject = tasks.filter(t => t.project === projectName).length;
    if (tasksInProject > 0) {
      const confirmed = confirm(`This project has ${tasksInProject} task(s). Delete anyway? Tasks will be moved to the first available project.`);
      if (!confirmed) return;

      const targetProject = projects.find(p => p !== projectName);
      if (targetProject) {
        const updated = tasks.map(t => 
          t.project === projectName ? { ...t, project: targetProject } : t
        );
        setTasks(updated);
        await saveKanbanCards(updated);
      }
    }

    const updatedProjects = projects.filter(p => p !== projectName);
    saveProjects(updatedProjects);

    if (selectedProject === projectName) {
      setSelectedProject(updatedProjects[0] || '');
    }
    if (filterProject === projectName) {
      setFilterProject(null);
    }
  };

  return (
    <div className="p-3 md:p-6 h-full flex flex-col bg-background overflow-hidden">
      <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Kanban Board</h2>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowProjectManager(!showProjectManager)}
              className="text-xs md:text-sm"
            >
              <Folder size={14} className="mr-1 md:mr-2" />
              Manage Projects
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm">
              <Settings size={14} className="mr-1 md:mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {showProjectManager && (
          <Card className="p-4 space-y-3 bg-muted/50">
            <h3 className="font-semibold text-sm">Project Management</h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="New project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') addNewProject();
                }}
                className="flex-1"
              />
              <Button onClick={addNewProject} size="sm">
                <Plus size={16} className="mr-1" />
                Add Project
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projects.map((project) => (
                <div key={project} className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                  {editingProjectName === project ? (
                    <>
                      <Input
                        value={editingProjectValue}
                        onChange={(e) => setEditingProjectValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            renameProject(project, editingProjectValue);
                          }
                          if (e.key === 'Escape') {
                            setEditingProjectName(null);
                          }
                        }}
                        onBlur={() => renameProject(project, editingProjectValue)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => renameProject(project, editingProjectValue)}
                      >
                        <Check size={14} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Folder size={14} className="text-muted-foreground" />
                      <span className="flex-1 text-sm">{project}</span>
                      <span className="text-xs text-muted-foreground">
                        ({tasks.filter(t => t.project === project).length} tasks)
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingProjectName(project);
                          setEditingProjectValue(project);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      {projects.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProject(project)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-2 flex-wrap items-center text-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0 md:flex-initial md:w-auto">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-40 text-sm"
            />
          </div>

          <select
            value={filterProject || ''}
            onChange={(e) => setFilterProject(e.target.value || null)}
            className="px-2 py-1 text-xs md:text-sm border border-border rounded-md bg-background flex-1 md:flex-initial"
          >
            <option value="">All Projects</option>
            {allProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>

          <select
            value={filterPriority || ''}
            onChange={(e) => setFilterPriority(e.target.value || null)}
            className="px-2 py-1 text-xs md:text-sm border border-border rounded-md bg-background flex-1 md:flex-initial"
          >
            <option value="">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="flex gap-2 items-center">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <Input
              placeholder="Filter by tags..."
              value={filterTags.join(', ')}
              onChange={(e) => setFilterTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              className="w-full md:w-40 text-sm"
            />
          </div>

          <span className="text-xs md:text-sm text-muted-foreground ml-auto">
            {totalTasksFiltered} cards
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <Folder size={14} className="text-muted-foreground shrink-0" />
          <label className="text-xs md:text-sm text-muted-foreground">New cards:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm border-2 border-primary rounded-md bg-background font-medium flex-1 md:flex-initial"
          >
            {allProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 md:gap-6 overflow-x-auto flex-1 pb-4 snap-x snap-mandatory md:snap-none">
        {columns.map((column) => {
          const columnTasks = getTasksByColumn(column.id);
          const filteredColumnTasks = filterTasks(columnTasks);
          const isWipLimitExceeded = column.wipLimit && filteredColumnTasks.length > column.wipLimit;

          return (
            <Card
              key={column.id}
              className="min-w-[280px] w-[280px] md:w-96 bg-card p-3 md:p-4 flex flex-col flex-shrink-0 snap-center md:snap-align-none"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 group">
                    <h3 className="font-semibold text-sm md:text-base text-foreground">{column.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filteredColumnTasks.length} {column.wipLimit ? `/ ${column.wipLimit}` : 'tasks'}
                  </p>
                </div>
                {isWipLimitExceeded && (
                  <AlertCircle size={16} className="text-orange-500" title="WIP limit exceeded" />
                )}
              </div>

              <Button
                onClick={() => addTask(column.id)}
                variant="default"
                size="sm"
                className="w-full mb-2 md:mb-3 text-xs md:text-sm"
                disabled={!newTaskText[column.id]?.trim()}
              >
                <Plus size={14} className="mr-1 md:mr-2" />
                Add Card
              </Button>

              <Input
                placeholder="Card title..."
                value={newTaskText[column.id] || ''}
                onChange={(e) =>
                  setNewTaskText({ ...newTaskText, [column.id]: e.target.value })
                }
                onKeyPress={(e) => {
                  if (e.key === 'Enter') addTask(column.id);
                }}
                className="mb-2 md:mb-3 text-sm"
              />

              <div
                className="space-y-2 flex-1 min-h-[200px] md:min-h-96 bg-background rounded-lg p-2 md:p-3 overflow-y-auto"
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedTask) {
                    moveTask(draggedTask.taskId, column.id);
                    setDraggedTask(null);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {filteredColumnTasks.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                    No cards
                  </p>
                ) : (
                  filteredColumnTasks.map((task) => (
                    <Dialog key={task.id}>
                      <DialogTrigger asChild>
                        <Card
                          draggable
                          onDragStart={() => setDraggedTask({ taskId: task.id })}
                          className="bg-card p-2 md:p-3 cursor-move hover:shadow-md transition-shadow border-l-4 touch-manipulation"
                          style={{
                            borderLeftColor:
                              task.priority === 'high'
                                ? '#ef4444'
                                : task.priority === 'medium'
                                  ? '#f59e0b'
                                  : '#10b981',
                          }}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <p className="text-xs md:text-sm font-medium text-foreground flex-1 line-clamp-2 break-words">
                              {task.title}
                            </p>
                            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => archiveTask(task.id)}
                                className="text-muted-foreground hover:text-foreground p-1 touch-manipulation"
                                title={task.archived ? 'Restore' : 'Archive'}
                              >
                                <Archive size={12} />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-muted-foreground hover:text-destructive p-1 touch-manipulation"
                                title="Delete"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>

                          {task.project && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 bg-muted px-2 py-1 rounded w-fit">
                              <Folder size={10} />
                              <span className="truncate">{task.project}</span>
                            </div>
                          )}

                          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={task.priority || 'medium'}
                              onChange={(e) =>
                                updateTaskPriority(
                                  task.id,
                                  e.target.value as 'low' | 'medium' | 'high'
                                )
                              }
                              className={`text-xs px-2 py-1 rounded border cursor-pointer font-medium w-full ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>

                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <Calendar size={10} />
                              <span className="truncate">{new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          {task.checklist && task.checklist.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <CheckSquare size={10} />
                              {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                            </div>
                          )}

                          {task.comments && task.comments.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MessageSquare size={10} />
                              {task.comments.length}
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-2">
                              {task.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded truncate max-w-[100px]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                              )}
                            </div>
                          )}

                          {task.archived && (
                            <div className="text-xs text-muted-foreground font-medium mt-2 opacity-60">
                              [Archived]
                            </div>
                          )}
                        </Card>
                      </DialogTrigger>

                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Card Details</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Title</label>
                            <Input
                              value={task.title}
                              onChange={(e) => updateTask(task.id, { title: e.target.value })}
                              className="font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                              value={task.description || ''}
                              onChange={(e) => updateTask(task.id, { description: e.target.value })}
                              placeholder="Add a more detailed description..."
                              rows={4}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Due Date</label>
                            <Input
                              type="date"
                              value={task.dueDate || ''}
                              onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Tags</label>
                            <Input
                              placeholder="Add tags (comma-separated)"
                              value={task.tags?.join(', ') || ''}
                              onChange={(e) => {
                                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                updateTask(task.id, { tags });
                              }}
                            />
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-2 flex-wrap mt-2">
                                {task.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Assignee</label>
                            <Input
                              placeholder="Assign to..."
                              value={task.assignee || ''}
                              onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Checklist</label>
                            <div className="space-y-2 mb-3">
                              {task.checklist?.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => toggleChecklistItem(task.id, item.id)}
                                    className="w-4 h-4"
                                  />
                                  <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {item.text}
                                  </span>
                                  <button
                                    onClick={() => removeChecklistItem(task.id, item.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add checklist item..."
                                value={newChecklistItem}
                                onChange={(e) => setNewChecklistItem(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addChecklistItem(task.id, newChecklistItem);
                                  }
                                }}
                              />
                              <Button
                                onClick={() => addChecklistItem(task.id, newChecklistItem)}
                                size="sm"
                              >
                                Add
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Comments ({task.comments?.length || 0})
                            </label>
                            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                              {task.comments?.map((comment) => (
                                <div key={comment.id} className="bg-muted p-3 rounded-lg">
                                  <p className="text-sm">{comment.text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(comment.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={2}
                              />
                              <Button
                                onClick={() => addComment(task.id, newComment)}
                                size="sm"
                              >
                                <MessageSquare size={16} />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Project</label>
                            <select
                              value={task.project || selectedProject}
                              onChange={(e) => updateTask(task.id, { project: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            >
                              {allProjects.map(proj => (
                                <option key={proj} value={proj}>{proj}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
