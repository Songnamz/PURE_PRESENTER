# PURE PRESENTER - Build Contents & File Structure

## What's Included in the Installer

### Application Files (Program Files)
```
C:\Program Files\PURE PRESENTER\
├── app/
│   ├── main.js                 (Main process)
│   ├── control.html            (Control window)
│   ├── list.html               (Project list)
│   ├── output.html             (Display2/Projector)
│   ├── activation.html         (License activation)
│   ├── license.js              (License system)
│   ├── auto-updater.js         (Auto-update system)
│   └── package.json
├── Hymns/
│   ├── Thai/                   (Thai hymns)
│   ├── Thai-English/           (Thai-English hymns)
│   ├── English/                (English hymns)
│   └── Non_Hymnal/             (Non-hymnal songs)
├── backgrounds/                (Default backgrounds)
├── assets/
│   └── PURE PRESENTER.ico      (Application icon)
├── Audio/                      (Sample/demo audio - PACKAGED WITH APP)
│   └── *.mp3                   (Included in installer)
├── Video/
│   └── README.txt              (Empty folder placeholder)
├── Images/
│   └── README.txt              (Images folder)
├── Presentations/
│   └── README.txt              (Presentations folder)
├── main.js                     (Entry point)
├── LICENSE.txt                 (License agreement)
└── [Electron framework files]
```

### User Data (AppData - Preserved During Updates)
```
C:\Users\[username]\AppData\Roaming\PURE PRESENTER\
├── Audio/                      (User's audio files)
│   └── *.mp3, *.wav, *.m4a     (Added by user after installation)
├── Video/                      (User's video files)
│   └── *.mp4, *.mov, etc.      (Added by user after installation)
├── Images/                     (User's images)
│   └── *.jpg, *.png, etc.      (Added by user after installation)
├── Presentations/              (Imported PowerPoint presentations)
│   └── [Presentation folders]  (Created when importing .pptx)
└── service-slides.json         (User's custom service slides)
```

---

## Audio Files Handling

### During Initial Installation:
✅ **Audio folder IS included** in the installer
✅ All MP3 files in `Audio/` are packaged with the app
✅ Users get sample audio files immediately after installation
✅ Audio files are copied to: `C:\Program Files\PURE PRESENTER\Audio\`

### During Runtime:
✅ App reads from `C:\Users\[username]\AppData\Roaming\PURE PRESENTER\Audio\`
✅ Users can add their own audio files to AppData location
✅ Sample audio from installation serves as examples

### During Updates:
✅ **User's audio files are SAFE** - stored in AppData
✅ AppData folder is NEVER touched during updates
✅ Only Program Files installation is updated
✅ User's custom audio collection remains intact

---

## Build Configuration

### Included in Build (`package.json`):
```json
"files": [
  "app/**/*",           // Application files
  "Audio/**/*",         // ✅ AUDIO FILES INCLUDED
  "Video/**/*",         // Video folder (may be empty)
  "Images/**/*",        // Images folder
  "Presentations/**/*", // Presentations folder
  "Hymns/**/*",         // All hymn libraries
  "backgrounds/**/*",   // Background images
  "assets/**/*",        // Icons and resources
  "main.js",
  "*.js",
  "*.json",
  "LICENSE.txt"
]
```

### Excluded from Build:
```json
"!dist",              // Build output
"!.git",              // Git repository
"!.github",           // GitHub actions
"!node_modules/electron-builder",
"!build-*.ps1",       // Build scripts
"!*.md"               // Documentation
```

---

## Folder Size Estimates

### Installed Application (~1.2 GB):
- Electron framework: ~200 MB
- Application files: ~50 MB
- Hymns (text files): ~5 MB
- Backgrounds: ~20 MB
- Audio files: ~50-100 MB (depends on your Audio folder)
- Sample media: ~10 MB

### Installer Size (~800-900 MB):
- Compressed with NSIS LZMA
- Single .exe file
- Includes all above content

### User Data Growth:
- Starts at ~1 MB (service-slides.json)
- Grows as user adds:
  - Audio files
  - Video files
  - Images
  - Imported presentations

---

## Update Behavior

### What Happens During Auto-Update:

1. **Download Phase:**
   - New installer downloads to `C:\Users\[username]\AppData\Local\Temp\`
   - Progress shown to user
   - Size: ~800-900 MB

2. **Installation Phase:**
   - Old app closes
   - Installer launches with admin privileges
   - **Program Files folder is REPLACED** with new version
   - **AppData folder is UNTOUCHED** - all user data safe

3. **Post-Install:**
   - App launches with new version
   - User's audio, video, images, presentations intact
   - License remains valid
   - Service slides preserved

### File Operations:
```
UPDATED:
✅ C:\Program Files\PURE PRESENTER\*    (All app files replaced)

PRESERVED:
✅ C:\Users\[user]\AppData\Roaming\PURE PRESENTER\Audio\*
✅ C:\Users\[user]\AppData\Roaming\PURE PRESENTER\Video\*
✅ C:\Users\[user]\AppData\Roaming\PURE PRESENTER\Images\*
✅ C:\Users\[user]\AppData\Roaming\PURE PRESENTER\Presentations\*
✅ C:\Users\[user]\AppData\Roaming\PURE PRESENTER\service-slides.json
```

---

## Verification

### To Verify Audio Files Are Included:

1. **After building installer:**
   ```powershell
   # Check installer size (should be ~800-900 MB if Audio included)
   Get-Item "dist\PURE-PRESENTER-Setup-*.exe" | Select-Object Length
   ```

2. **After installation:**
   ```powershell
   # Check if Audio files are in Program Files
   Get-ChildItem "C:\Program Files\PURE PRESENTER\Audio" -Filter "*.mp3"
   ```

3. **During runtime:**
   - Open PURE PRESENTER
   - Check if Audio section shows files
   - Audio files should be listed immediately

---

## Best Practices

### For Developers:
1. ✅ Keep demo/sample audio files in project `Audio/` folder
2. ✅ These get packaged with installer
3. ✅ Users see examples immediately after installation
4. ✅ Commit small sample files to Git (not huge libraries)

### For Users:
1. ✅ Sample audio included with installation
2. ✅ Add your own audio to AppData location
3. ✅ Import via app's Audio management
4. ✅ Your audio survives updates automatically

---

## Summary

✅ **Audio files ARE included** in the installer
✅ **All media folders** are packaged (Audio, Video, Images, Presentations)
✅ **Sample/demo content** ships with the app
✅ **User's custom content** stored safely in AppData
✅ **Updates preserve** all user data
✅ **Auto-update works** without data loss

**Your MP3 files in the Audio folder will be included in every build!** 🎵
