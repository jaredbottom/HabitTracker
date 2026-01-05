from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from collections import defaultdict
import database as db

app = Flask(__name__)
CORS(app)

# Initialize database on startup
db.init_db()

# Habit endpoints
@app.route('/api/habits', methods=['GET'])
def get_habits():
    """Get all habits"""
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    habits = db.get_all_habits(include_archived)
    return jsonify(habits)

@app.route('/api/habits', methods=['POST'])
def create_habit():
    """Create a new habit"""
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Name is required'}), 400

    habit_id = db.create_habit(data['name'])
    habit = db.get_habit(habit_id)
    return jsonify(habit), 201

@app.route('/api/habits/<int:habit_id>', methods=['GET'])
def get_habit(habit_id):
    """Get a specific habit"""
    habit = db.get_habit(habit_id)
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404
    return jsonify(habit)

@app.route('/api/habits/<int:habit_id>', methods=['PUT'])
def update_habit(habit_id):
    """Update a habit"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name')
    order_index = data.get('order_index')
    archived = data.get('archived')

    success = db.update_habit(habit_id, name, order_index, archived)
    if not success:
        return jsonify({'error': 'Habit not found or no changes made'}), 404

    habit = db.get_habit(habit_id)
    return jsonify(habit)

@app.route('/api/habits/<int:habit_id>', methods=['DELETE'])
def delete_habit(habit_id):
    """Delete a habit"""
    success = db.delete_habit(habit_id)
    if not success:
        return jsonify({'error': 'Habit not found'}), 404
    return '', 204

@app.route('/api/habits/reorder', methods=['POST'])
def reorder_habits():
    """Reorder habits"""
    data = request.get_json()
    if not data or 'orders' not in data:
        return jsonify({'error': 'Orders array is required'}), 400

    db.reorder_habits(data['orders'])
    return jsonify({'success': True})

# Completion endpoints
@app.route('/api/habits/<int:habit_id>/completions', methods=['GET'])
def get_completions(habit_id):
    """Get completions for a habit"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    completions = db.get_completions_for_habit(habit_id, start_date, end_date)
    return jsonify(completions)

@app.route('/api/habits/<int:habit_id>/completions', methods=['POST'])
def create_completion(habit_id):
    """Create a completion entry"""
    data = request.get_json() or {}
    completed_at = data.get('completed_at')

    completion_id = db.create_completion(habit_id, completed_at)
    completions = db.get_completions_for_habit(habit_id)
    completion = next((c for c in completions if c['id'] == completion_id), None)

    return jsonify(completion), 201

@app.route('/api/completions/<int:completion_id>', methods=['PUT'])
def update_completion(completion_id):
    """Update a completion entry"""
    data = request.get_json()
    if not data or 'completed_at' not in data:
        return jsonify({'error': 'completed_at is required'}), 400

    success = db.update_completion(completion_id, data['completed_at'])
    if not success:
        return jsonify({'error': 'Completion not found'}), 404

    return jsonify({'success': True})

@app.route('/api/completions/<int:completion_id>', methods=['DELETE'])
def delete_completion(completion_id):
    """Delete a completion entry"""
    success = db.delete_completion(completion_id)
    if not success:
        return jsonify({'error': 'Completion not found'}), 404
    return '', 204

# Analytics endpoints
@app.route('/api/habits/<int:habit_id>/analytics', methods=['GET'])
def get_habit_analytics(habit_id):
    """Get analytics data for a habit"""
    habit = db.get_habit(habit_id)
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404

    # Get all completions
    completions = db.get_completions_for_habit(habit_id)

    # Calculate streaks
    dates = sorted(set(c['completed_at'][:10] for c in completions))  # Get unique dates (YYYY-MM-DD)

    current_streak = 0
    longest_streak = 0
    temp_streak = 0

    if dates:
        # Convert to date objects for easier comparison
        date_objects = [datetime.fromisoformat(d).date() for d in dates]
        today = datetime.now().date()

        # Calculate current streak (working backwards from today)
        check_date = today
        while check_date in date_objects:
            current_streak += 1
            check_date -= timedelta(days=1)

        # Calculate longest streak
        for i, date in enumerate(date_objects):
            if i == 0:
                temp_streak = 1
            else:
                prev_date = date_objects[i - 1]
                if (date - prev_date).days == 1:
                    temp_streak += 1
                else:
                    temp_streak = 1

            longest_streak = max(longest_streak, temp_streak)

    # Calculate completion rate for different periods
    today = datetime.now()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)
    ninety_days_ago = today - timedelta(days=90)

    def count_unique_days(start_date):
        """Count unique days with completions since start_date"""
        filtered = [c for c in completions
                   if datetime.fromisoformat(c['completed_at']) >= start_date]
        return len(set(c['completed_at'][:10] for c in filtered))

    def days_elapsed(start_date):
        """Calculate days elapsed since start_date"""
        return (today - start_date).days + 1

    # Calculate stats
    total_completions = len(completions)
    total_days = len(dates)

    stats_7d = {
        'completed_days': count_unique_days(seven_days_ago),
        'total_days': min(7, days_elapsed(seven_days_ago)),
    }
    stats_7d['percentage'] = (stats_7d['completed_days'] / stats_7d['total_days'] * 100) if stats_7d['total_days'] > 0 else 0

    stats_30d = {
        'completed_days': count_unique_days(thirty_days_ago),
        'total_days': min(30, days_elapsed(thirty_days_ago)),
    }
    stats_30d['percentage'] = (stats_30d['completed_days'] / stats_30d['total_days'] * 100) if stats_30d['total_days'] > 0 else 0

    stats_90d = {
        'completed_days': count_unique_days(ninety_days_ago),
        'total_days': min(90, days_elapsed(ninety_days_ago)),
    }
    stats_90d['percentage'] = (stats_90d['completed_days'] / stats_90d['total_days'] * 100) if stats_90d['total_days'] > 0 else 0

    # Group completions by date for heatmap
    completion_counts = defaultdict(int)
    for completion in completions:
        date_str = completion['completed_at'][:10]
        completion_counts[date_str] += 1

    heatmap_data = [
        {'date': date, 'count': count}
        for date, count in completion_counts.items()
    ]

    return jsonify({
        'habit': habit,
        'total_completions': total_completions,
        'total_days': total_days,
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'stats_7d': stats_7d,
        'stats_30d': stats_30d,
        'stats_90d': stats_90d,
        'heatmap_data': heatmap_data,
        'completion_dates': dates
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
