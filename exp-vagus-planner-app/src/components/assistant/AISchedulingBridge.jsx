import React, { createContext, useContext } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Context for AI scheduling capabilities
const AISchedulingContext = createContext();

export const useAIScheduling = () => {
  const context = useContext(AISchedulingContext);
  if (!context) {
    throw new Error('useAIScheduling must be used within AISchedulingProvider');
  }
  return context;
};

export function AISchedulingProvider({ children }) {
  const queryClient = useQueryClient();

  // Create event from AI suggestion
  const createEvent = async (eventData) => {
    try {
      await SDK.entities.Event.create({
        ...eventData,
        category: eventData.category || 'personal',
        is_all_day: eventData.is_all_day ?? false
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully!');
      return true;
    } catch (error) {
      toast.error('Failed to create event');
      console.error(error);
      return false;
    }
  };

  // Create task from AI suggestion
  const createTask = async (taskData) => {
    try {
      await SDK.entities.Task.create({
        ...taskData,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium'
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully!');
      return true;
    } catch (error) {
      toast.error('Failed to create task');
      console.error(error);
      return false;
    }
  };

  // Create meeting from AI suggestion
  const createMeeting = async (meetingData) => {
    try {
      await SDK.entities.Meeting.create({
        ...meetingData,
        status: meetingData.status || 'pending'
      });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting scheduled successfully!');
      return true;
    } catch (error) {
      toast.error('Failed to schedule meeting');
      console.error(error);
      return false;
    }
  };

  // Bulk create events (for weekly plans, etc.)
  const createBulkEvents = async (events) => {
    try {
      await SDK.entities.Event.bulkCreate(events);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${events.length} events created successfully!`);
      return true;
    } catch (error) {
      toast.error('Failed to create events');
      console.error(error);
      return false;
    }
  };

  // Create habit from AI suggestion
  const createHabit = async (habitData) => {
    try {
      await SDK.entities.Habit.create({
        ...habitData,
        is_active: habitData.is_active ?? true,
        frequency: habitData.frequency || 'daily'
      });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit created successfully!');
      return true;
    } catch (error) {
      toast.error('Failed to create habit');
      console.error(error);
      return false;
    }
  };

  const value = {
    createEvent,
    createTask,
    createMeeting,
    createBulkEvents,
    createHabit
  };

  return (
    <AISchedulingContext.Provider value={value}>
      {children}
    </AISchedulingContext.Provider>
  );
}