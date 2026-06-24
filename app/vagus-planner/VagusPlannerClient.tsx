'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

type VpTaskRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  notes: string | null;
  description?: string | null;
  priority: number | string;
  due_date: string | null;
  status: string;
};

function priorityLabel(priority: number | string): string {
  if (typeof priority === 'string') return priority;
  if (priority >= 2) return 'high';
  if (priority >= 1) return 'medium';
  return 'low';
}

function priorityToNumber(priority: string): number {
  if (priority === 'high') return 2;
  if (priority === 'medium') return 1;
  return 0;
}

function rowToTask(row: VpTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? row.notes ?? '',
    due_date: row.due_date ?? '',
    priority: priorityLabel(row.priority),
    status: row.status || 'pending',
    category_id: row.category_id ?? '',
  };
}

export default function VagusPlannerClient({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  const firstparty = () => supabase.schema('firstparty');

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching tasks...');
      const { data: tasksData, error: tasksError } = await firstparty()
        .from('vp_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsLast: true });

      if (tasksError) {
        console.error('❌ Tasks error:', tasksError);
        throw tasksError;
      }

      console.log('✅ Tasks data:', tasksData);
      setTasks(((tasksData ?? []) as VpTaskRow[]).map(rowToTask));

      console.log('🔍 Fetching categories...');
      const { data: categoriesData, error: categoriesError } = await firstparty()
        .from('vp_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('❌ Categories error:', categoriesError);
        throw categoriesError;
      }

      console.log('✅ Categories data:', categoriesData);
      setCategories((categoriesData ?? []) as Category[]);
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Vagus Planner data');
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const newTask = {
        title: newTaskTitle.trim(),
        user_id: user.id,
        category_id: selectedCategory || null,
        status: 'pending',
        priority: priorityToNumber('medium'),
      };

      console.log('📝 Adding task:', { ...newTask, priority: 'medium' });

      const { data, error: insertError } = await firstparty()
        .from('vp_tasks')
        .insert(newTask)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Task added:', data);
      setTasks([rowToTask(data as VpTaskRow), ...tasks]);
      setNewTaskTitle('');
      setSelectedCategory('');
    } catch (insertErr) {
      console.error('❌ Error adding task:', insertErr);
    } finally {
      setIsAdding(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating task ${taskId} to ${newStatus}`);

      const { error: updateError } = await firstparty()
        .from('vp_tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      console.log(`✅ Task ${taskId} updated to ${newStatus}`);

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (updateErr) {
      console.error('❌ Error updating task:', updateErr);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      console.log(`🗑️ Deleting task ${taskId}`);

      const { error: deleteError } = await firstparty()
        .from('vp_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw deleteError;
      }

      console.log(`✅ Task ${taskId} deleted`);
      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (deleteErr) {
      console.error('❌ Error deleting task:', deleteErr);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] pt-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading Vagus Planner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            Could not load Vagus Planner
          </h2>
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto p-6 pt-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🧠 Vagus Planner</h1>
        <div className="text-sm text-gray-500">
          {completedCount} / {tasks.length} completed
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && void addTask()}
          disabled={isAdding}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
          disabled={isAdding}
        >
          <option value="">No Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void addTask()}
          disabled={isAdding}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isAdding ? 'Adding...' : 'Add Task'}
        </button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No tasks yet. Add your first task above!
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() =>
                    void updateTaskStatus(
                      task.id,
                      task.status === 'completed' ? 'pending' : 'completed'
                    )
                  }
                  className="w-4 h-4 text-blue-600 rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      task.status === 'completed' ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-gray-500 truncate">{task.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    task.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {task.priority}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteTask(task.id)}
                  className="text-red-500 hover:text-red-700 transition px-2"
                  aria-label="Delete task"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
