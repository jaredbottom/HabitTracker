const API_BASE = '/api';

// Habit API calls
export const getHabits = async (includeArchived = false) => {
  const response = await fetch(`${API_BASE}/habits?include_archived=${includeArchived}`);
  return response.json();
};

export const createHabit = async (name) => {
  const response = await fetch(`${API_BASE}/habits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
};

export const updateHabit = async (habitId, updates) => {
  const response = await fetch(`${API_BASE}/habits/${habitId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return response.json();
};

export const deleteHabit = async (habitId) => {
  await fetch(`${API_BASE}/habits/${habitId}`, {
    method: 'DELETE',
  });
};

export const reorderHabits = async (orders) => {
  const response = await fetch(`${API_BASE}/habits/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
  return response.json();
};

// Completion API calls
export const getCompletions = async (habitId, startDate = null, endDate = null) => {
  let url = `${API_BASE}/habits/${habitId}/completions`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await fetch(url);
  return response.json();
};

export const createCompletion = async (habitId, completedAt = null) => {
  const body = completedAt ? { completed_at: completedAt } : {};
  const response = await fetch(`${API_BASE}/habits/${habitId}/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
};

export const deleteCompletion = async (completionId) => {
  await fetch(`${API_BASE}/completions/${completionId}`, {
    method: 'DELETE',
  });
};

export const updateCompletion = async (completionId, completedAt) => {
  const response = await fetch(`${API_BASE}/completions/${completionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed_at: completedAt }),
  });
  return response.json();
};

// Analytics API calls
export const getHabitAnalytics = async (habitId) => {
  const response = await fetch(`${API_BASE}/habits/${habitId}/analytics`);
  return response.json();
};
