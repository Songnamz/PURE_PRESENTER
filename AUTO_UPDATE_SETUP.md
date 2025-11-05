# Auto-Update Setup Guide

## ✅ Auto-Update Feature Implemented!

PURE PRESENTER now includes automatic update checking from GitHub releases.

## How It Works

1. **Automatic Check on Startup** - App checks for updates 5 seconds after launch (silent)
2. **Manual Check** - Users can check anytime via `Help > Check for Updates`
3. **Download & Install** - If update available, downloads installer and launches it
4. **Seamless Process** - Old version closes, new version installs automatically

---

## Setup Instructions for Deployment

### Step 1: Create GitHub Release

When you're ready to publish a new version:

1. **Update version in package.json**
   ```json
   {
     "version": "1.0.1"  // Increment this
   }
   ```

2. **Build the installer**
   - Run `build-installer.ps1` as Administrator
   - This creates: `dist\PURE-PRESENTER-Setup-1.0.1.exe`

3. **Create GitHub Release**
   - Go to: https://github.com/Songnamz/PURE_PRESENTER/releases
   - Click "Create a new release"
   - Tag version: `v1.0.1` (must start with 'v')
   - Release title: `PURE PRESENTER v1.0.1`
   - Description: Add release notes (what's new)
   - Upload file: `PURE-PRESENTER-Setup-1.0.1.exe`
   - Click "Publish release"

### Step 2: Users Get Updates Automatically

- ✅ App checks GitHub for latest release
- ✅ Compares version numbers
- ✅ Prompts user if update available
- ✅ Downloads and installs with one click

---

## How Users Check for Updates

### Option 1: Automatic (Default)
- App checks 5 seconds after startup
- Silent check - no popup if already up to date
- Popup only if update is available

### Option 2: Manual Check
1. Open PURE PRESENTER
2. Click menu: `Help > Check for Updates`
3. If update available:
   - See version number and release notes
   - Click "Download & Install"
   - Installer downloads and launches
   - App closes and new version installs
   - **Your Audio/Video/Images/Presentations are preserved** (stored in AppData)

### Option 3: View on GitHub
- Click "View on GitHub" button
- Opens release page in browser
- Download manually if preferred

---

## Version Number Format

**Must use semantic versioning:** `MAJOR.MINOR.PATCH`

Examples:
- `1.0.0` - Initial release
- `1.0.1` - Bug fix
- `1.1.0` - New feature
- `2.0.0` - Major update

**Important:**
- GitHub tag must be: `v1.0.1` (with 'v' prefix)
- package.json version: `1.0.1` (no 'v' prefix)

---

## User Data Protection During Updates

### What Gets Updated:
✅ Application files (Program Files folder)
✅ Electron framework
✅ App resources (Hymns, default backgrounds)

### What Stays Safe (Never Deleted):
✅ **Audio files** - `C:\Users\[username]\AppData\Roaming\PURE PRESENTER\Audio\`
✅ **Video files** - `C:\Users\[username]\AppData\Roaming\PURE PRESENTER\Video\`
✅ **Images** - `C:\Users\[username]\AppData\Roaming\PURE PRESENTER\Images\`
✅ **Presentations** - `C:\Users\[username]\AppData\Roaming\PURE PRESENTER\Presentations\`
✅ **Service slides** - `C:\Users\[username]\AppData\Roaming\PURE PRESENTER\service-slides.json`
✅ **License data** - License remains valid after update

**Users can update without fear of losing their content!**

---

## Testing Auto-Update

### Test Scenario:
1. Current version: `1.0.0`
2. Create fake release: `v1.0.1` on GitHub
3. Open app
4. Wait 5 seconds or click `Help > Check for Updates`
5. Should see update prompt with release notes

---

## Features Included

✅ **Automatic Check** - On app startup (silent)
✅ **Manual Check** - Help menu option
✅ **Version Comparison** - Smart semantic versioning
✅ **Release Notes** - Shows what's new
✅ **One-Click Install** - Downloads and launches installer
✅ **GitHub Integration** - Fetches from GitHub Releases API
✅ **Error Handling** - Graceful failures with user messages
✅ **No Server Required** - Uses GitHub's free hosting

---

## Security

- ✅ HTTPS downloads from GitHub
- ✅ Official GitHub Releases API
- ✅ User confirms before download
- ✅ No automatic installation without permission

---

## Troubleshooting

### "Update Check Failed"
- Check internet connection
- Verify GitHub repository is public
- Ensure release exists with proper tag

### "No Download URL Available"
- Ensure .exe file is uploaded to release
- Filename should contain "Setup" and end with ".exe"

### Version Not Detected
- Check package.json has correct version
- Ensure GitHub tag starts with 'v'
- Verify release is published (not draft)

---

## Example Release Workflow

```bash
# 1. Update version
# Edit package.json: "version": "1.0.1"

# 2. Build installer (as Admin)
.\build-installer.ps1

# 3. Commit changes
git add .
git commit -m "Release v1.0.1"
git push

# 4. Create GitHub Release
# - Tag: v1.0.1
# - Title: PURE PRESENTER v1.0.1
# - Upload: dist\PURE-PRESENTER-Setup-1.0.1.exe
# - Publish

# 5. Users get automatic update notifications!
```

---

## Current Status

✅ **Auto-Update Implemented**
✅ **GitHub Integration Ready**
✅ **Manual Check Available**
✅ **Automatic Startup Check**
✅ **One-Click Installation**

**Next Step:** Create first GitHub release at v1.0.0 to enable auto-update for future versions!

---

**Support:** songnam@apiu.edu | 061-580-2547
