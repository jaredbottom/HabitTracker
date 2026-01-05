import { useState, useEffect } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import CalendarHeatmap from 'react-calendar-heatmap'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getHabitAnalytics, createCompletion, deleteCompletion, getCompletions } from '../api'
import 'react-calendar-heatmap/dist/styles.css'

function HabitDetail({ habitId, onBack }) {
  const [analytics, setAnalytics] = useState(null)
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddCompletion, setShowAddCompletion] = useState(false)
  const [newCompletionDate, setNewCompletionDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newCompletionTime, setNewCompletionTime] = useState(format(new Date(), 'HH:mm'))

  const loadData = async () => {
    try {
      const [analyticsData, completionsData] = await Promise.all([
        getHabitAnalytics(habitId),
        getCompletions(habitId),
      ])
      setAnalytics(analyticsData)
      setCompletions(completionsData)
    } catch (error) {
      console.error('Failed to load habit data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [habitId])

  const handleAddCompletion = async (e) => {
    e.preventDefault()
    try {
      const datetime = `${newCompletionDate}T${newCompletionTime}:00`
      await createCompletion(habitId, datetime)
      setShowAddCompletion(false)
      setNewCompletionDate(format(new Date(), 'yyyy-MM-dd'))
      setNewCompletionTime(format(new Date(), 'HH:mm'))
      loadData()
    } catch (error) {
      console.error('Failed to add completion:', error)
    }
  }

  const handleDeleteCompletion = async (completionId) => {
    if (!confirm('Delete this completion?')) return

    try {
      await deleteCompletion(completionId)
      loadData()
    } catch (error) {
      console.error('Failed to delete completion:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          ← Back
        </button>
        <p className="text-gray-600">Failed to load habit data</p>
      </div>
    )
  }

  // Prepare heatmap data
  const endDate = new Date()
  const startDate = subDays(endDate, 365)
  const heatmapValues = analytics.heatmap_data.map(item => ({
    date: item.date,
    count: item.count,
  }))

  // Prepare trend data for chart (last 90 days)
  const trendData = []
  for (let i = 89; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const count = analytics.heatmap_data.find(d => d.date === date)?.count || 0
    trendData.push({
      date: format(subDays(new Date(), i), 'MMM d'),
      completions: count,
    })
  }

  // Group completions by date for display
  const completionsByDate = {}
  completions.forEach(completion => {
    const date = completion.completed_at.split('T')[0]
    if (!completionsByDate[date]) {
      completionsByDate[date] = []
    }
    completionsByDate[date].push(completion)
  })

  const sortedDates = Object.keys(completionsByDate).sort().reverse()

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{analytics.habit.name}</h1>
        <p className="text-gray-600">Habit analytics and history</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{analytics.current_streak}</div>
          <div className="text-sm text-gray-600">Current Streak</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{analytics.longest_streak}</div>
          <div className="text-sm text-gray-600">Longest Streak</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{analytics.total_days}</div>
          <div className="text-sm text-gray-600">Total Days</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{analytics.total_completions}</div>
          <div className="text-sm text-gray-600">Total Completions</div>
        </div>
      </div>

      {/* Completion rates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Completion Rates</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Last 7 days</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.stats_7d.completed_days}/{analytics.stats_7d.total_days} ({analytics.stats_7d.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${analytics.stats_7d.percentage}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Last 30 days</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.stats_30d.completed_days}/{analytics.stats_30d.total_days} ({analytics.stats_30d.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${analytics.stats_30d.percentage}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Last 90 days</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.stats_90d.completed_days}/{analytics.stats_90d.total_days} ({analytics.stats_90d.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${analytics.stats_90d.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Calendar</h2>
        <div className="overflow-x-auto">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={heatmapValues}
            classForValue={(value) => {
              if (!value || value.count === 0) {
                return 'color-empty'
              }
              if (value.count === 1) return 'color-scale-1'
              if (value.count === 2) return 'color-scale-2'
              if (value.count === 3) return 'color-scale-3'
              if (value.count === 4) return 'color-scale-4'
              return 'color-scale-5'
            }}
            tooltipDataAttrs={(value) => {
              if (!value || !value.date) {
                return {}
              }
              return {
                'data-tip': `${value.date}: ${value.count || 0} completions`,
              }
            }}
            showWeekdayLabels
          />
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">90-Day Trend</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={Math.floor(trendData.length / 10)}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completions" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Completions list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Completion History</h2>
          <button
            onClick={() => setShowAddCompletion(!showAddCompletion)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {showAddCompletion ? 'Cancel' : 'Add Entry'}
          </button>
        </div>

        {/* Add completion form */}
        {showAddCompletion && (
          <form onSubmit={handleAddCompletion} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newCompletionDate}
                  onChange={(e) => setNewCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={newCompletionTime}
                  onChange={(e) => setNewCompletionTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Add Completion
            </button>
          </form>
        )}

        {/* Completions grouped by date */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedDates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No completions yet</p>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium text-gray-900 mb-2">
                  {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="space-y-2">
                  {completionsByDate[date].map(completion => (
                    <div
                      key={completion.id}
                      className="flex items-center justify-between bg-gray-50 rounded p-2"
                    >
                      <span className="text-sm text-gray-600">
                        {format(parseISO(completion.completed_at), 'h:mm a')}
                      </span>
                      <button
                        onClick={() => handleDeleteCompletion(completion.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default HabitDetail
