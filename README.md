# Habit Tracker

A simple, self-hosted habit tracking web application built with Python Flask and React. Track your daily habits, view trends, and analyze your progress over time.

## Features

- **Simple Habit Tracking**: Create habits and mark them as completed for any day
- **Multiple Completions**: Support for logging multiple completions per day
- **Edit History**: Add or remove completions for current and past days
- **Comprehensive Analytics**:
  - Calendar heatmap (GitHub-style activity view)
  - Current and longest streak counters
  - Completion rates for 7, 30, and 90-day periods
  - 90-day trend chart
  - Full completion history
- **Mobile Responsive**: Works great on desktop and mobile browsers
- **Lightweight**: Uses SQLite database (no complex setup required)

## Tech Stack

- **Backend**: Python 3 with Flask
- **Frontend**: React with Vite
- **Database**: SQLite
- **Styling**: TailwindCSS
- **Charts**: Recharts and react-calendar-heatmap

## Installation

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the Flask server:
   ```bash
   python app.py
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`

2. **Add a habit**: Type a habit name in the input field and click "Add"

3. **Mark as complete**: Click the checkbox next to a habit to mark it as completed for today

4. **View analytics**: Click on a habit name to view detailed trends and history

5. **Add past entries**: In the habit detail view, click "Add Entry" to log a completion for a previous day

6. **Edit or delete**: Use the edit button to rename a habit, or the delete button to remove it entirely

## Deployment for Self-Hosting

### Production Build

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Serve the built files with a web server (nginx, Apache, etc.) and configure it to proxy API requests to the Flask backend

### Running as a Service

For Ubuntu/Debian systems, you can create systemd service files:

**Backend service** (`/etc/systemd/system/habit-tracker-backend.service`):
```ini
[Unit]
Description=Habit Tracker Backend
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/HabitTracker/backend
ExecStart=/usr/bin/python3 app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Frontend service** (using a simple HTTP server):
```bash
# Install serve globally
npm install -g serve

# Run serve on the build directory
serve -s /path/to/HabitTracker/frontend/dist -l 3000
```

Or better yet, use nginx to serve the static files and proxy the API to Flask.

### Simple Single-Server Setup

For a quick self-hosted setup on Ubuntu:

1. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip nodejs npm
   ```

2. Clone and setup the application (follow installation steps above)

3. Use `tmux` or `screen` to run both servers in the background:
   ```bash
   # Start a tmux session
   tmux new -s habit-tracker

   # In first pane, start backend
   cd backend && python app.py

   # Create new pane (Ctrl+B then ")
   # In second pane, start frontend
   cd frontend && npm run dev
   ```

4. Access the app at `http://your-server-ip:3000`

## Database

The SQLite database file (`habits.db`) will be created in the `backend` directory on first run. This file contains all your habits and completion data.

To backup your data, simply copy the `habits.db` file to a safe location.

## API Documentation

The backend exposes a REST API at `http://localhost:5000/api`:

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create a new habit
- `GET /api/habits/:id` - Get a specific habit
- `PUT /api/habits/:id` - Update a habit
- `DELETE /api/habits/:id` - Delete a habit
- `POST /api/habits/reorder` - Reorder habits

### Completions
- `GET /api/habits/:id/completions` - Get completions for a habit
- `POST /api/habits/:id/completions` - Create a completion
- `PUT /api/completions/:id` - Update a completion
- `DELETE /api/completions/:id` - Delete a completion

### Analytics
- `GET /api/habits/:id/analytics` - Get analytics data for a habit

## Contributing

This is a personal project, but feel free to fork and modify for your own use!

## License

MIT License - feel free to use and modify as you wish.
