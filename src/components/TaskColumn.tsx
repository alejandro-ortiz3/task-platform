import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import type { Task } from '../lib/supabase';

interface TaskColumnProps {
  status: 'todo' | 'in-progress' | 'done';
  title: string;
  tasks: Task[];
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onAddTask: (status: string) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  status,
  title,
  tasks,
  onDelete,
  onEdit,
  onAddTask,
}) => {
  const { setNodeRef } = useDroppable({ id: status });

  const accentColors = {
    'todo': 'border-slate-600 bg-slate-900/50',
    'in-progress': 'border-blue-500/30 bg-blue-500/5',
    'done': 'border-cyan-500/30 bg-cyan-500/5',
  };

  const headerColors = {
    'todo': 'text-slate-300',
    'in-progress': 'text-blue-400',
    'done': 'text-cyan-400',
  };

  return (
    <div className={`flex flex-col h-full border-2 ${accentColors[status]} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className={`text-lg font-semibold ${headerColors[status]}`}>
            {title}
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
};