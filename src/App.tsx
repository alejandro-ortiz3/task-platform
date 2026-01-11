import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, type DragEndEvent } from '@dnd-kit/core';import { arrayMove } from '@dnd-kit/sortable';
import { supabase, type Task } from './lib/supabase';
import { useIndexedDB } from './hooks/useIndexedDB';
import { TaskColumn } from './components/TaskColumn';
import { TaskModal } from './components/TaskModal';
import { TaskCard } from './components/TaskCard';
import { Wifi, WifiOff, RotateCcw, Undo2 } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<string>('todo');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<Task[][]>([]);
  
  const { saveTask, getTasks, deleteTask: deleteFromIndexedDB, isReady } = useIndexedDB();

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
    
    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Polling for updates (since Realtime requires alpha access)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      loadTasks();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [isOnline, isReady]);

  const loadTasks = async () => {
    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('position');
      
      if (data && !error) {
        setTasks(data);
        // Save to IndexedDB
        if (isReady) {
          data.forEach(task => saveTask(task));
        }
      }
    } else if (isReady) {
      // Load from IndexedDB when offline
      const offlineTasks = await getTasks();
      setTasks(offlineTasks);
    }
  };

  const saveHistory = () => {
    setHistory(prev => [...prev.slice(-9), tasks]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setTasks(previousState);
      setHistory(prev => prev.slice(0, -1));
      
      // Sync to Supabase if online
      if (isOnline) {
        previousState.forEach(async (task) => {
          await supabase.from('tasks').upsert(task);
        });
      }
    }
  };

  const handleCreateTask = async (title: string, description: string) => {
    saveHistory();

    const newTask: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
      title,
      description: description || null,
      status: newTaskStatus as any,
      position: tasks.filter(t => t.status === newTaskStatus).length,
    };

    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (data && !error) {
        setTasks(prev => [...prev, data]);
        if (isReady) await saveTask(data);
      }
    } else {
      // Offline mode: save locally
      const offlineTask: Task = {
        ...newTask,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks(prev => [...prev, offlineTask]);
      if (isReady) await saveTask(offlineTask);
    }
  };

  const handleUpdateTask = async (title: string, description: string) => {
    if (!editingTask) return;
    saveHistory();

    const updatedTask = {
      ...editingTask,
      title,
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    if (isOnline) {
      const { error } = await supabase
        .from('tasks')
        .update({ title, description, updated_at: updatedTask.updated_at })
        .eq('id', editingTask.id);

      if (!error) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
        if (isReady) await saveTask(updatedTask);
      }
    } else {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      if (isReady) await saveTask(updatedTask);
    }

    setEditingTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    saveHistory();

    if (isOnline) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) {
        setTasks(prev => prev.filter(t => t.id !== id));
        if (isReady) await deleteFromIndexedDB(id);
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (isReady) await deleteFromIndexedDB(id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    const newStatus = ['todo', 'in-progress', 'done'].includes(overId) 
      ? overId 
      : tasks.find(t => t.id === overId)?.status || activeTask.status;

    saveHistory();

    if (activeTask.status !== newStatus) {
      // Moving to different column
      const updatedTask = { ...activeTask, status: newStatus as any };
      
      if (isOnline) {
        await supabase.from('tasks').update({ status: newStatus }).eq('id', activeTask.id);
      }
      
      setTasks(prev => prev.map(t => t.id === activeTask.id ? updatedTask : t));
      if (isReady) await saveTask(updatedTask);
    } else if (active.id !== over.id) {
      // Reordering within same column
      const sameStatusTasks = tasks.filter(t => t.status === activeTask.status);
      const oldIndex = sameStatusTasks.findIndex(t => t.id === active.id);
      const newIndex = sameStatusTasks.findIndex(t => t.id === over.id);
      
      const reordered = arrayMove(sameStatusTasks, oldIndex, newIndex);
      const updatedTasks = tasks.map(t => {
        if (t.status !== activeTask.status) return t;
        const newPosition = reordered.findIndex(rt => rt.id === t.id);
        return { ...t, position: newPosition };
      });

      setTasks(updatedTasks);
      
      if (isOnline) {
        reordered.forEach(async (task, idx) => {
          await supabase.from('tasks').update({ position: idx }).eq('id', task.id);
        });
      }
    }

    setActiveId(null);
  };

  const todoTasks = tasks.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').sort((a, b) => a.position - b.position);
  const doneTasks = tasks.filter(t => t.status === 'done').sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Task Platform</h1>
                <p className="text-sm text-slate-400">Collaborative task management</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 size={18} />
                <span className="text-sm">Undo</span>
              </button>

              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                {isOnline ? (
                  <>
                    <Wifi size={18} className="text-green-400" />
                    <span className="text-sm text-slate-300">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={18} className="text-orange-400" />
                    <span className="text-sm text-slate-300">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            <TaskColumn
              status="todo"
              title="To Do"
              tasks={todoTasks}
              onDelete={handleDeleteTask}
              onEdit={(task) => {
                setEditingTask(task);
                setIsModalOpen(true);
              }}
              onAddTask={(status) => {
                setNewTaskStatus(status);
                setEditingTask(null);
                setIsModalOpen(true);
              }}
            />

            <TaskColumn
              status="in-progress"
              title="In Progress"
              tasks={inProgressTasks}
              onDelete={handleDeleteTask}
              onEdit={(task) => {
                setEditingTask(task);
                setIsModalOpen(true);
              }}
              onAddTask={(status) => {
                setNewTaskStatus(status);
                setEditingTask(null);
                setIsModalOpen(true);
              }}
            />

            <TaskColumn
              status="done"
              title="Done"
              tasks={doneTasks}
              onDelete={handleDeleteTask}
              onEdit={(task) => {
                setEditingTask(task);
                setIsModalOpen(true);
              }}
              onAddTask={(status) => {
                setNewTaskStatus(status);
                setEditingTask(null);
                setIsModalOpen(true);
              }}
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <TaskCard
                task={tasks.find(t => t.id === activeId)!}
                onDelete={() => {}}
                onEdit={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        status={newTaskStatus}
      />
    </div>
  );
}

export default App;