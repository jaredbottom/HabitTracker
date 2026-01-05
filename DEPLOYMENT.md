# Habit Tracker - Complete Deployment Guide

This guide provides step-by-step instructions for deploying the Habit Tracker on a self-hosted Ubuntu server.

## Prerequisites

- Ubuntu 20.04 or newer
- A server that stays running (desktop PC, home server, etc.)
- SSH access to the server (if remote)
- Basic command line knowledge

## Table of Contents

1. [Initial Server Setup](#initial-server-setup)
2. [Install Dependencies](#install-dependencies)
3. [Clone and Setup Application](#clone-and-setup-application)
4. [Test the Application](#test-the-application)
5. [Production Deployment with systemd](#production-deployment-with-systemd)
6. [Setup Nginx Reverse Proxy](#setup-nginx-reverse-proxy)
7. [Firewall Configuration](#firewall-configuration)
8. [Optional: HTTPS with Let's Encrypt](#optional-https-with-lets-encrypt)
9. [Maintenance and Troubleshooting](#maintenance-and-troubleshooting)

---

## Initial Server Setup

### 1. Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Create a User for the Application (Optional but Recommended)

If you want to run the app as a specific user instead of your main user:

```bash
sudo adduser habittracker
sudo usermod -aG sudo habittracker
```

Then switch to that user:
```bash
sudo su - habittracker
```

---

## Install Dependencies

### 1. Install Python

```bash
sudo apt install -y python3 python3-pip python3-venv
```

Verify installation:
```bash
python3 --version  # Should show Python 3.8 or higher
```

### 2. Install Node.js and npm

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version   # Should show npm version
```

### 3. Install uv (Recommended for faster Python package installation)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add to PATH (add this to ~/.bashrc for persistence)
export PATH="$HOME/.cargo/bin:$PATH"
source ~/.bashrc
```

### 4. Install Git

```bash
sudo apt install -y git
```

---

## Clone and Setup Application

### 1. Choose Installation Directory

```bash
cd ~
# Or choose another directory like /opt or /var/www
# For this guide, we'll use the home directory
```

### 2. Clone the Repository

```bash
git clone https://github.com/jaredbottom/HabitTracker.git
cd HabitTracker
```

If you don't have the repo on GitHub yet, you can copy the files to your server using `scp` or `rsync`:

```bash
# From your local machine:
scp -r /path/to/HabitTracker user@server-ip:~/
```

### 3. Setup Backend

```bash
cd ~/HabitTracker/backend

# Option A: Using uv (faster)
uv pip install -r requirements.txt

# Option B: Using pip with virtual environment (recommended for isolation)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Setup Frontend

```bash
cd ~/HabitTracker/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist` folder with optimized production files.

---

## Test the Application

Before setting up as a service, test that everything works:

### 1. Test Backend

```bash
cd ~/HabitTracker/backend

# If using virtual environment:
source venv/bin/activate

# Run the Flask app
python app.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

Leave this running and open a new terminal.

### 2. Test Frontend (Development Mode)

In a new terminal:

```bash
cd ~/HabitTracker/frontend
npm run dev
```

You should see:
```
  VITE ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 3. Access the Application

- Open your browser to `http://server-ip:5173`
- Try creating a habit and checking it off
- If it works, you're ready for production deployment!

Press `Ctrl+C` in both terminals to stop the test servers.

---

## Production Deployment with systemd

For production, we'll run both the backend and frontend as systemd services that start automatically.

### 1. Create Backend Service

Create the service file:

```bash
sudo nano /etc/systemd/system/habit-tracker-backend.service
```

Add the following content (adjust paths and username as needed):

```ini
[Unit]
Description=Habit Tracker Backend
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
Group=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/HabitTracker/backend
Environment="PATH=/home/YOUR_USERNAME/HabitTracker/backend/venv/bin"
ExecStart=/home/YOUR_USERNAME/HabitTracker/backend/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Important**: Replace `YOUR_USERNAME` with your actual username (run `whoami` to find it).

If you didn't use a virtual environment, change the `ExecStart` line to:
```
ExecStart=/usr/bin/python3 app.py
```

### 2. Create Frontend Service

First, install a production HTTP server:

```bash
sudo npm install -g serve
```

Create the service file:

```bash
sudo nano /etc/systemd/system/habit-tracker-frontend.service
```

Add the following content:

```ini
[Unit]
Description=Habit Tracker Frontend
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
Group=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/HabitTracker/frontend/dist
ExecStart=/usr/bin/serve -s . -l 5173
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Again, replace `YOUR_USERNAME` with your actual username.

### 3. Enable and Start Services

```bash
# Reload systemd to recognize new services
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable habit-tracker-backend
sudo systemctl enable habit-tracker-frontend

# Start services now
sudo systemctl start habit-tracker-backend
sudo systemctl start habit-tracker-frontend

# Check status
sudo systemctl status habit-tracker-backend
sudo systemctl status habit-tracker-frontend
```

Both should show "active (running)" in green.

### 4. Useful Service Commands

```bash
# Stop services
sudo systemctl stop habit-tracker-backend
sudo systemctl stop habit-tracker-frontend

# Restart services
sudo systemctl restart habit-tracker-backend
sudo systemctl restart habit-tracker-frontend

# View logs
sudo journalctl -u habit-tracker-backend -f
sudo journalctl -u habit-tracker-frontend -f
```

---

## Setup Nginx Reverse Proxy

Using nginx as a reverse proxy provides better performance and allows you to serve the app on port 80 (standard HTTP).

### 1. Install Nginx

```bash
sudo apt install -y nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/habit-tracker
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name _;  # Replace with your domain if you have one

    # Frontend - serve static files directly
    location / {
        root /home/YOUR_USERNAME/HabitTracker/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - proxy to Flask
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Replace `YOUR_USERNAME` with your actual username.

### 3. Enable the Site

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/habit-tracker /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# If test passes, restart nginx
sudo systemctl restart nginx
```

### 4. Disable Frontend Service (nginx will serve it now)

Since nginx now serves the frontend files directly, we don't need the frontend service:

```bash
sudo systemctl stop habit-tracker-frontend
sudo systemctl disable habit-tracker-frontend
```

### 5. Access Your Application

You can now access the app at:
- `http://server-ip` (port 80, standard HTTP)
- `http://your-domain.com` (if you have a domain pointed to your server)

---

## Firewall Configuration

### 1. Install UFW (if not already installed)

```bash
sudo apt install -y ufw
```

### 2. Configure Firewall Rules

```bash
# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (if you plan to use SSL)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Optional: HTTPS with Let's Encrypt

If you have a domain name pointed to your server, you can get free SSL certificates:

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Update Nginx Configuration

Edit the nginx config:
```bash
sudo nano /etc/nginx/sites-available/habit-tracker
```

Change `server_name _;` to `server_name yourdomain.com www.yourdomain.com;`

### 3. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically update your nginx configuration.

### 4. Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Certificates will auto-renew via a systemd timer.

---

## Maintenance and Troubleshooting

### Backup Your Data

Your habit data is stored in `/home/YOUR_USERNAME/HabitTracker/backend/habits.db`

To backup:
```bash
cp ~/HabitTracker/backend/habits.db ~/habit-tracker-backup-$(date +%Y%m%d).db
```

Automate with cron:
```bash
crontab -e

# Add this line to backup daily at 2 AM:
0 2 * * * cp ~/HabitTracker/backend/habits.db ~/backups/habit-tracker-$(date +\%Y\%m\%d).db
```

### Update the Application

```bash
cd ~/HabitTracker

# Pull latest changes
git pull

# Update backend dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Rebuild frontend
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl restart habit-tracker-backend
sudo systemctl restart nginx
```

### Common Issues

**Issue: Backend service fails to start**
```bash
# Check logs
sudo journalctl -u habit-tracker-backend -n 50

# Common causes:
# - Wrong path in service file
# - Missing dependencies
# - Port 5000 already in use
```

**Issue: Can't connect to the app**
```bash
# Check if services are running
sudo systemctl status habit-tracker-backend
sudo systemctl status nginx

# Check if ports are open
sudo netstat -tlnp | grep -E '80|5000'

# Check firewall
sudo ufw status
```

**Issue: Database errors**
```bash
# Check database file permissions
ls -la ~/HabitTracker/backend/habits.db

# Should be owned by the user running the service
# If not:
sudo chown YOUR_USERNAME:YOUR_USERNAME ~/HabitTracker/backend/habits.db
```

**Issue: Changes to frontend not showing**
```bash
# Clear browser cache
# Or rebuild frontend:
cd ~/HabitTracker/frontend
npm run build
sudo systemctl restart nginx
```

### Monitoring

Check service status regularly:
```bash
# Backend
sudo systemctl status habit-tracker-backend

# Nginx
sudo systemctl status nginx

# View recent logs
sudo journalctl -u habit-tracker-backend --since "1 hour ago"
```

### Performance Tuning

For better performance with many habits:

1. **Enable nginx gzip compression** - Add to nginx config:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Consider upgrading to PostgreSQL** if you need better concurrent access

3. **Add database indices** (already included in the schema)

---

## Quick Reference Commands

```bash
# Service management
sudo systemctl start|stop|restart|status habit-tracker-backend
sudo systemctl start|stop|restart|status nginx

# View logs
sudo journalctl -u habit-tracker-backend -f

# Nginx
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Reload without downtime

# Backup database
cp ~/HabitTracker/backend/habits.db ~/backup-$(date +%Y%m%d).db

# Update application
cd ~/HabitTracker && git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install && npm run build
sudo systemctl restart habit-tracker-backend nginx
```

---

## Getting Help

If you run into issues:

1. Check the logs: `sudo journalctl -u habit-tracker-backend -n 100`
2. Verify services are running: `sudo systemctl status habit-tracker-backend nginx`
3. Check the database file exists and has correct permissions
4. Ensure all dependencies are installed
5. Verify nginx configuration: `sudo nginx -t`

For more help, check the main README.md or open an issue on GitHub.
