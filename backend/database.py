import sqlite3
from datetime import datetime
from typing import List, Dict, Optional

DATABASE_PATH = 'habits.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with schema"""
    conn = get_db()
    cursor = conn.cursor()

    # Create habits table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            order_index INTEGER DEFAULT 0,
            archived BOOLEAN DEFAULT 0
        )
    ''')

    # Create completions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            completed_at TIMESTAMP NOT NULL,
            FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
        )
    ''')

    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_completions_habit_id
        ON completions(habit_id)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_completions_completed_at
        ON completions(completed_at)
    ''')

    conn.commit()
    conn.close()

# Habit operations
def create_habit(name: str) -> int:
    """Create a new habit"""
    conn = get_db()
    cursor = conn.cursor()

    # Get max order_index
    cursor.execute('SELECT MAX(order_index) as max_order FROM habits')
    result = cursor.fetchone()
    next_order = (result['max_order'] or 0) + 1

    cursor.execute(
        'INSERT INTO habits (name, order_index) VALUES (?, ?)',
        (name, next_order)
    )
    habit_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return habit_id

def get_all_habits(include_archived: bool = False) -> List[Dict]:
    """Get all habits"""
    conn = get_db()
    cursor = conn.cursor()

    if include_archived:
        cursor.execute('SELECT * FROM habits ORDER BY order_index')
    else:
        cursor.execute('SELECT * FROM habits WHERE archived = 0 ORDER BY order_index')

    habits = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return habits

def get_habit(habit_id: int) -> Optional[Dict]:
    """Get a specific habit"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM habits WHERE id = ?', (habit_id,))
    habit = cursor.fetchone()
    conn.close()
    return dict(habit) if habit else None

def update_habit(habit_id: int, name: Optional[str] = None,
                order_index: Optional[int] = None,
                archived: Optional[bool] = None) -> bool:
    """Update a habit"""
    conn = get_db()
    cursor = conn.cursor()

    updates = []
    params = []

    if name is not None:
        updates.append('name = ?')
        params.append(name)
    if order_index is not None:
        updates.append('order_index = ?')
        params.append(order_index)
    if archived is not None:
        updates.append('archived = ?')
        params.append(1 if archived else 0)

    if not updates:
        conn.close()
        return False

    params.append(habit_id)
    query = f"UPDATE habits SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def delete_habit(habit_id: int) -> bool:
    """Delete a habit and all its completions"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM habits WHERE id = ?', (habit_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def reorder_habits(habit_orders: List[Dict[str, int]]) -> bool:
    """Reorder habits based on provided order"""
    conn = get_db()
    cursor = conn.cursor()

    for item in habit_orders:
        cursor.execute(
            'UPDATE habits SET order_index = ? WHERE id = ?',
            (item['order_index'], item['id'])
        )

    conn.commit()
    conn.close()
    return True

# Completion operations
def create_completion(habit_id: int, completed_at: Optional[str] = None) -> int:
    """Create a completion entry"""
    if completed_at is None:
        completed_at = datetime.now().isoformat()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO completions (habit_id, completed_at) VALUES (?, ?)',
        (habit_id, completed_at)
    )
    completion_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return completion_id

def get_completions_for_habit(habit_id: int, start_date: Optional[str] = None,
                              end_date: Optional[str] = None) -> List[Dict]:
    """Get all completions for a habit, optionally filtered by date range"""
    conn = get_db()
    cursor = conn.cursor()

    query = 'SELECT * FROM completions WHERE habit_id = ?'
    params = [habit_id]

    if start_date:
        query += ' AND completed_at >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND completed_at <= ?'
        params.append(end_date)

    query += ' ORDER BY completed_at DESC'

    cursor.execute(query, params)
    completions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return completions

def delete_completion(completion_id: int) -> bool:
    """Delete a completion entry"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM completions WHERE id = ?', (completion_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def update_completion(completion_id: int, completed_at: str) -> bool:
    """Update a completion timestamp"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE completions SET completed_at = ? WHERE id = ?',
        (completed_at, completion_id)
    )
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success
