# Meeting Manager - Deployment Guide

This guide covers deploying the Meeting Manager app to a Frappe/ERPNext production server.

## Prerequisites

- SSH access to the server
- Frappe Bench installed and configured
- Site already created (e.g., `bs-infra.dk`)

## Fresh Installation

### 1. SSH into the Server

```bash
ssh root@your-server.com
# or
ssh frappeuser@your-server.com
```

### 2. Navigate to the Bench Directory

```bash
cd /home/frappeuser/bestsecurity  # Adjust path to your bench
```

### 3. Install the App Using bench get-app

```bash
bench get-app https://github.com/ric-zng/BestSecurity-Meeting-Manager.git --branch test-rick
```

This command:
- Clones the repository into `apps/meeting_manager`
- Installs the Python package in development mode
- Registers the app with the bench

### 4. Install on Site

```bash
bench --site bs-infra.dk install-app meeting_manager
```

### 5. Run Migrations

```bash
bench --site bs-infra.dk migrate
```

### 6. Clear Cache and Restart

```bash
bench --site bs-infra.dk clear-cache
bench restart
```

## Updating an Existing Installation

### Option A: Simple Update (No Conflicts)

```bash
cd /home/frappeuser/bestsecurity
cd apps/meeting_manager
git pull origin test-rick
cd ../..
bench --site bs-infra.dk migrate
bench --site bs-infra.dk clear-cache
bench restart
```

### Option B: Update with Local Changes (Stash)

If there are local changes on the server:

```bash
cd /home/frappeuser/bestsecurity/apps/meeting_manager
git stash
git pull origin test-rick
git stash pop  # Optional: reapply local changes
cd ../..
bench --site bs-infra.dk migrate
bench --site bs-infra.dk clear-cache
bench restart
```

### Option C: Clean Reinstall

If you need to completely reinstall the app:

```bash
cd /home/frappeuser/bestsecurity

# Uninstall from site
bench --site bs-infra.dk uninstall-app meeting_manager --yes

# Remove app from bench
bench remove-app meeting_manager

# If remove-app fails due to permissions:
chmod -R 755 apps/meeting_manager
rm -rf apps/meeting_manager
rm -rf archived/apps/meeting_manager*

# Fresh install
bench get-app https://github.com/ric-zng/BestSecurity-Meeting-Manager.git --branch test-rick
bench --site bs-infra.dk install-app meeting_manager
bench --site bs-infra.dk migrate
bench --site bs-infra.dk clear-cache
bench restart
```

## Troubleshooting

### Permission Denied Errors

If you encounter permission errors during `bench remove-app`:

```bash
chmod -R 755 /home/frappeuser/bestsecurity/apps/meeting_manager
rm -rf /home/frappeuser/bestsecurity/apps/meeting_manager
```

### ModuleNotFoundError: No module named 'meeting_manager'

This usually means the app wasn't properly installed. Use `bench get-app` instead of manual `git clone`:

```bash
# Wrong way (may not register Python module)
git clone <repo-url> apps/meeting_manager

# Correct way
bench get-app <repo-url>
```

### Git "Dubious Ownership" Error

If git complains about ownership:

```bash
git config --global --add safe.directory /home/frappeuser/bestsecurity/apps/meeting_manager
```

### Fixing File Ownership

After installation, ensure proper ownership:

```bash
chown -R frappeuser:frappeuser /home/frappeuser/bestsecurity/apps/meeting_manager
```

## Post-Deployment Verification

1. Access the site in browser
2. Check Meeting Manager workspace is visible
3. Test key pages:
   - `/app/mm-self-book-meeting`
   - `/app/mm-enhanced-calendar`
   - `/app/mm-timeline-calendar`
4. Verify doctypes are accessible:
   - MM Meeting Booking
   - MM Department
   - MM Meeting Type
   - MM Customer

## Useful Commands

```bash
# Check installed apps
bench --site bs-infra.dk list-apps

# View site logs
tail -f /home/frappeuser/bestsecurity/logs/frappe.log

# Run specific migration
bench --site bs-infra.dk migrate --skip-failing

# Build assets
bench build --app meeting_manager

# Clear all caches
bench --site bs-infra.dk clear-cache
bench --site bs-infra.dk clear-website-cache
```
