import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { createHabit, updateHabit, deleteHabit, createCompletion, getCompletions, deleteCompletion } from '../api'

function HabitList({ habits, onHabitClick, onHabitsChange }) {
  const [newHabitName, setNewHabitName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [todayCompletions, setTodayCompletions] = useState({})

  const today = format(new Date(), 'yyyy-MM-dd')

  // Load today's completions for all habits
  useEffect(() => {
    const loadTodayCompletions = async () => {
      const completions = {}
      for (const habit of habits) {
        try {
          const data = await getCompletions(habit.id)
          const todayData = data.filter(c => c.completed_at.startsWith(today))
          completions[habit.id] = todayData
        } catch (error) {
          console.error(`Failed to load completions for habit ${habit.id}:`, error)
          completions[habit.id] = []
        }
      }
      setTodayCompletions(completions)
    }

    if (habits.length > 0) {
      loadTodayCompletions()
    }
  }, [habits, today])

  const handleAddHabit = async (e) => {
    e.preventDefault()
    if (!newHabitName.trim()) return

    try {
      await createHabit(newHabitName.trim())
      setNewHabitName('')
      onHabitsChange()
    } catch (error) {
      console.error('Failed to create habit:', error)
    }
  }

  const handleToggleCompletion = async (habitId) => {
    const completions = todayCompletions[habitId] || []

    if (completions.length > 0) {
      // Remove the most recent completion for today
      try {
        await deleteCompletion(completions[0].id)
        setTodayCompletions({
          ...todayCompletions,
          [habitId]: completions.slice(1),
        })
      } catch (error) {
        console.error('Failed to delete completion:', error)
      }
    } else {
      // Add a completion for today
      try {
        const completion = await createCompletion(habitId)
        setTodayCompletions({
          ...todayCompletions,
          [habitId]: [completion, ...completions],
        })
      } catch (error) {
        console.error('Failed to create completion:', error)
      }
    }
  }

  const handleStartEdit = (habit) => {
    setEditingId(habit.id)
    setEditName(habit.name)
  }

  const handleSaveEdit = async (habitId) => {
    if (!editName.trim()) return

    try {
      await updateHabit(habitId, { name: editName.trim() })
      setEditingId(null)
      onHabitsChange()
    } catch (error) {
      console.error('Failed to update habit:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (habitId) => {
    if (!confirm('Are you sure you want to delete this habit? All completion data will be lost.')) {
      return
    }

    try {
      await deleteHabit(habitId)
      onHabitsChange()
    } catch (error) {
      console.error('Failed to delete habit:', error)
    }
  }

  const handleArchive = async (habitId, currentArchived) => {
    try {
      await updateHabit(habitId, { archived: !currentArchived })
      onHabitsChange()
    } catch (error) {
      console.error('Failed to archive habit:', error)
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Habit Tracker</h1>
        <p className="text-gray-600">Track your daily habits</p>
      </div>

      {/* Add new habit form */}
      <form onSubmit={handleAddHabit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Add a new habit..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Add
          </button>
        </div>
      </form>

      {/* Today's date */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Habit list */}
      <div className="space-y-3">
        {habits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No habits yet. Add one above to get started!</p>
          </div>
        ) : (
          habits.map((habit) => {
            const isCompleted = (todayCompletions[habit.id] || []).length > 0
            const completionCount = (todayCompletions[habit.id] || []).length
            const isEditing = editingId === habit.id

            return (
              <div
                key={habit.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleCompletion(habit.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded border-2 transition-colors ${
                      isCompleted
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {isCompleted && (
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </button>

                  {/* Habit name */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(habit.id)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div>
                        <h3
                          className={`font-medium text-gray-900 cursor-pointer hover:text-blue-600 ${
                            isCompleted ? 'line-through text-gray-500' : ''
                          }`}
                          onClick={() => onHabitClick(habit.id)}
                        >
                          {habit.name}
                        </h3>
                        {completionCount > 1 && (
                          <p className="text-xs text-gray-500">
                            Completed {completionCount} times today
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(habit.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Save"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                          title="Cancel"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(habit)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                          title="Edit name"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(habit.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default HabitList
