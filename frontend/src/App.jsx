import { useState, useEffect } from 'react'
import HabitList from './components/HabitList'
import HabitDetail from './components/HabitDetail'
import { getHabits } from './api'

function App() {
  const [habits, setHabits] = useState([])
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadHabits = async () => {
    try {
      const data = await getHabits()
      setHabits(data)
    } catch (error) {
      console.error('Failed to load habits:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHabits()
  }, [])

  const handleBack = () => {
    setSelectedHabit(null)
    loadHabits() // Reload habits when returning to list
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {selectedHabit ? (
          <HabitDetail habitId={selectedHabit} onBack={handleBack} />
        ) : (
          <HabitList
            habits={habits}
            onHabitClick={setSelectedHabit}
            onHabitsChange={loadHabits}
          />
        )}
      </div>
    </div>
  )
}

export default App
