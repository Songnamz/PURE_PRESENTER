const { app, BrowserWindow, ipcMain, screen, Menu, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const officeParser = require('officeparser');
const { exec } = require('child_process');
const license = require('./license');
const AutoUpdater = require('./auto-updater');

let projectorWindow, controlWindow, listWindow, activationWindow;
let windowTitleSuffix = '- BY SONGNAM SARAPHAI'; // Global title suffix for all windows
let autoUpdater; // Auto-updater instance

// Resource directories (read-only, bundled with app)
const SONG_DIR = path.join(__dirname, '../Hymns/Thai-English');
const BACKGROUNDS_DIR = path.join(__dirname, '../backgrounds');
const ICON_PATH = path.join(__dirname, '../assets/PURE PRESENTER.ico');

// User data directories (writable, in user's AppData folder for portable compatibility)
const USER_DATA_DIR = app.getPath('userData');
const SERVICE_SLIDES_FILE = path.join(USER_DATA_DIR, 'service-slides.json');
const PRESENTATIONS_DIR = path.join(USER_DATA_DIR, 'Presentations');
const AUDIO_DIR = path.join(USER_DATA_DIR, 'Audio');
const VIDEO_DIR = path.join(USER_DATA_DIR, 'Video');
const IMAGES_DIR = path.join(USER_DATA_DIR, 'Images');

function createProjectorWindow() {
  if (projectorWindow) return; // Don't create if already exists

  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find(d => d.bounds.x !== 0 || d.bounds.y !== 0);

  projectorWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: !!externalDisplay,
    x: externalDisplay ? externalDisplay.bounds.x : 0,
    y: externalDisplay ? externalDisplay.bounds.y : 0,
    backgroundColor: '#000000',
    title: 'DISPLAYX2' + windowTitleSuffix,
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  projectorWindow.loadFile(path.join(__dirname, 'output.html'));

  // Apply stored background when projector window is ready
  projectorWindow.webContents.on('did-finish-load', () => {
    if (global.selectedBackground) {
      const bgPath = path.join(BACKGROUNDS_DIR, global.selectedBackground);
      projectorWindow.webContents.send('update-background', bgPath);
    }
    if (global.selectedFont) {
      projectorWindow.webContents.send('update-font', global.selectedFont);
    }
  });

  projectorWindow.on('closed', () => {
    console.log('Projector window closed event fired');
    projectorWindow = null;
    // Notify control window that projector is closed
    if (controlWindow && !controlWindow.isDestroyed()) {
      console.log('Sending projector-state: false to control window');
      controlWindow.webContents.send('projector-state', false);
    }
  });

  // Notify control window that projector is open
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('projector-state', true);
  }
}

function createActivationWindow() {
  if (activationWindow) return;

  activationWindow = new BrowserWindow({
    width: 550,
    height: 805,
    resizable: false,
    center: true,
    modal: true,
    title: 'PURE PRESENTER - LICENSE ACTIVATION - BY SONGNAM SARAPHAI',
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false 
    }
  });
  
  activationWindow.loadFile(path.join(__dirname, 'activation.html'));
  activationWindow.setMenu(null); // Remove menu bar

  activationWindow.on('closed', () => {
    activationWindow = null;
  });
}

function checkLicenseAndStart() {
  const licenseStatus = license.checkLicense();
  
  if (licenseStatus.isValid) {
    // License is valid, create main windows
    console.log('License valid:', licenseStatus.message);
    
    // Get license data to show in window title
    const licenseData = license.getLicenseData();
    
    if (licenseData && licenseData.customerInfo) {
      const customer = licenseData.customerInfo.toUpperCase();
      const expiryDate = licenseStatus.expiryDate ? licenseStatus.expiryDate.toLocaleDateString() : 'UNKNOWN';
      windowTitleSuffix = ` - CUSTOMER: ${customer} | VALID UNTIL: ${expiryDate}`;
    } else {
      windowTitleSuffix = ' - BY SONGNAM SARAPHAI';
    }
    
    createWindows();
    
    // Check for updates on startup (after 5 seconds)
    if (autoUpdater) {
      autoUpdater.checkOnStartup();
    }
    
    // Show warning if expiring soon
    if (licenseStatus.status === 'EXPIRING_SOON') {
      setTimeout(() => {
        dialog.showMessageBox({
          type: 'warning',
          title: 'License Expiring Soon',
          message: `Your license will expire in ${licenseStatus.daysRemaining} day(s)`,
          detail: `Expiry Date: ${licenseStatus.expiryDate.toLocaleDateString()}\n\nPlease contact your administrator to renew your license.`,
          buttons: ['OK']
        });
      }, 2000);
    }
  } else {
    // License is invalid, expired, or not found - show activation window
    console.log('License invalid:', licenseStatus.message);
    createActivationWindow();
  }
}

function createWindows() {
  // Project list window
  listWindow = new BrowserWindow({
    width: 400,
    height: 1080,
    x: 0,
    y: 0,
    title: 'PROJECT LIST' + windowTitleSuffix,
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  listWindow.loadFile(path.join(__dirname, 'list.html'));

  // Control/Preview window - positioned right next to Project List window
  controlWindow = new BrowserWindow({
    width: 1525,
    height: 1080,
    x: 395,  // Just 5 pixels away from the Project List window (400 width + 5 gap)
    y: 0,
    title: 'CONTROL & PREVIEW' + windowTitleSuffix,
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  controlWindow.loadFile(path.join(__dirname, 'control.html'));

  // Projector window is NOT created here anymore - created on first song load
}

// Send list of Thai-English txt files
ipcMain.handle('get-songs', () => {
  try {
    if (fs.existsSync(SONG_DIR)) {
      return fs.readdirSync(SONG_DIR).filter(f => f.endsWith('.txt') && f !== 'desktop.ini');
    }
    return [];
  } catch (err) {
    console.error('Error reading Thai-English songs:', err);
    return [];
  }
});

// Send list of Thai txt files
const THAI_SONG_DIR = path.join(__dirname, '..', 'Hymns', 'Thai');
ipcMain.handle('get-thai-songs', () => {
  try {
    if (fs.existsSync(THAI_SONG_DIR)) {
      return fs.readdirSync(THAI_SONG_DIR).filter(f => f.endsWith('.txt') && f !== 'desktop.ini');
    }
    return [];
  } catch (err) {
    console.error('Error reading Thai songs:', err);
    return [];
  }
});

// Send list of English txt files
const ENGLISH_SONG_DIR = path.join(__dirname, '..', 'Hymns', 'English');
ipcMain.handle('get-english-songs', () => {
  try {
    if (fs.existsSync(ENGLISH_SONG_DIR)) {
      return fs.readdirSync(ENGLISH_SONG_DIR).filter(f => f.endsWith('.txt') && f !== 'desktop.ini');
    }
    return [];
  } catch (err) {
    console.error('Error reading English songs:', err);
    return [];
  }
});

// Send list of Non-Hymnal txt files (custom folder)
// Note: folder on disk is 'Non_Hymnal' (underscore). Match the actual folder name.
const NON_HYMNAL_DIR = path.join(__dirname, '..', 'Non_Hymnal');
ipcMain.handle('get-non-hymnal-songs', () => {
  try {
    if (fs.existsSync(NON_HYMNAL_DIR)) {
      return fs.readdirSync(NON_HYMNAL_DIR).filter(f => f.endsWith('.txt') && f !== 'desktop.ini');
    }
    return [];
  } catch (err) {
    console.error('Error reading Non-Hymnal songs:', err);
    return [];
  }
});

// Get list of presentations
ipcMain.handle('get-presentations', () => {
  try {
    // Get all folders in Presentations directory
    return fs.readdirSync(PRESENTATIONS_DIR).filter(f => {
      const fullPath = path.join(PRESENTATIONS_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    });
  } catch (err) {
    console.error('Error reading presentations:', err);
    return [];
  }
});

// Load presentation slides (images)
ipcMain.handle('load-presentation', async (event, folderName) => {
  if (!projectorWindow) {
    createProjectorWindow();
  }

  const presentationPath = path.join(PRESENTATIONS_DIR, folderName);
  const slides = [];

  try {
    console.log(`Reading presentation folder: ${presentationPath}`);
    
    // Get all image files, sorted numerically
    const files = fs.readdirSync(presentationPath)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    // Return image paths
    files.forEach(file => {
      const imagePath = path.join(presentationPath, file);
      slides.push({ type: 'image', path: imagePath });
    });

    if (slides.length === 0) {
      slides.push({ type: 'text', content: '⚠️ No slides found in this presentation.' });
    }
  } catch (err) {
    console.error('Failed to read presentation:', err);
    slides.push({ type: 'text', content: `❌ Error reading presentation:\n\n${err.message}` });
  }

  return slides;
});

// Delete presentation
ipcMain.handle('delete-presentation', async (event, folderName) => {
  const presentationPath = path.join(PRESENTATIONS_DIR, folderName);
  
  try {
    console.log(`Deleting presentation: ${presentationPath}`);
    
    // Check if directory exists
    if (!fs.existsSync(presentationPath)) {
      return { success: false, message: `Presentation "${folderName}" not found.` };
    }
    
    // Delete directory and all its contents recursively
    fs.rmSync(presentationPath, { recursive: true, force: true });
    
    console.log(`Successfully deleted presentation: ${folderName}`);
    return { success: true, message: `Successfully deleted "${folderName}".` };
  } catch (err) {
    console.error('Failed to delete presentation:', err);
    return { success: false, message: `Failed to delete presentation: ${err.message}` };
  }
});

// Import PowerPoint file
ipcMain.handle('import-powerpoint', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: 'Import cancelled' };
  }

  const pptPath = result.filePaths[0];
  const pptName = path.basename(pptPath, path.extname(pptPath));
  const outputDir = path.join(PRESENTATIONS_DIR, pptName);

  try {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a temporary PowerShell script file
    const tempScriptPath = path.join(app.getPath('temp'), 'convert-ppt.ps1');
    const psScript = `
$ErrorActionPreference = "Stop"
try {
    Write-Output "Starting PowerPoint conversion..."
    $pptPath = "${pptPath.replace(/\\/g, '\\')}"
    $outputDir = "${outputDir.replace(/\\/g, '\\')}"
    
    Write-Output "Opening PowerPoint application..."
    $ppt = New-Object -ComObject PowerPoint.Application
    # Don't try to set Visible property - some versions don't allow it
    # $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
    
    Write-Output "Opening presentation: $pptPath"
    # Open with minimal windows and no dialogs
    $presentation = $ppt.Presentations.Open($pptPath, $true, $false, $false)
    
    $slideCount = $presentation.Slides.Count
    Write-Output "Found $slideCount slides"
    
    for ($i = 1; $i -le $slideCount; $i++) {
        $outputPath = Join-Path $outputDir "slide_$i.png"
        Write-Output "Exporting slide $i to $outputPath"
        $presentation.Slides.Item($i).Export($outputPath, "PNG", 1920, 1080)
    }
    
    Write-Output "Closing presentation..."
    $presentation.Close()
    $ppt.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    Write-Output "SUCCESS: Converted $slideCount slides"
    exit 0
} catch {
    Write-Error "ERROR: $($_.Exception.Message)"
    Write-Error $_.ScriptStackTrace
    exit 1
}
`;

    // Write script to temp file
    fs.writeFileSync(tempScriptPath, psScript, 'utf8');

    // Execute PowerShell script from file
    return new Promise((resolve) => {
      const command = `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`;
      console.log('Executing PowerShell script...');
      
      exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
        // Clean up temp script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          console.error('Could not delete temp script:', e);
        }

        console.log('PowerShell stdout:', stdout);
        if (stderr) console.error('PowerShell stderr:', stderr);
        
        if (error) {
          console.error('PowerPoint conversion error:', error);
          resolve({ 
            success: false, 
            message: `Failed to convert PowerPoint:\n\n${error.message}\n\n${stderr}\n\nMake sure Microsoft PowerPoint is installed.` 
          });
        } else {
          // Check if files were actually created
          const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
          if (files.length > 0) {
            console.log(`PowerPoint converted successfully: ${files.length} slides`);
            resolve({ 
              success: true, 
              message: `Successfully imported "${pptName}" with ${files.length} slides`,
              folderName: pptName
            });
          } else {
            resolve({
              success: false,
              message: `PowerPoint opened but no slides were exported.\n\nCheck if the file is corrupted or password-protected.`
            });
          }
        }
      });
    });
  } catch (err) {
    console.error('Import error:', err);
    return { success: false, message: `Error: ${err.message}` };
  }
});

// ===== MP3 Audio Handlers =====

// Get list of audio files
ipcMain.handle('get-audio-files', () => {
  try {
    if (fs.existsSync(AUDIO_DIR)) {
      const files = fs.readdirSync(AUDIO_DIR)
        .filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.m4a') || f.endsWith('.ogg'))
        .map(f => ({
          name: f,
          path: path.join(AUDIO_DIR, f)
        }));
      return files;
    }
    return [];
  } catch (err) {
    console.error('Error reading audio files:', err);
    return [];
  }
});

// Import MP3 file
ipcMain.handle('import-mp3', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'ogg'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: 'Import cancelled' };
  }

  try {
    let importedCount = 0;
    for (const audioPath of result.filePaths) {
      const fileName = path.basename(audioPath);
      const destPath = path.join(AUDIO_DIR, fileName);
      
      // Copy file to Audio directory
      fs.copyFileSync(audioPath, destPath);
      importedCount++;
    }

    if (importedCount === 1) {
      return { success: true, message: `Successfully imported 1 audio file!` };
    } else {
      return { success: true, message: `Successfully imported ${importedCount} audio files!` };
    }
  } catch (err) {
    console.error('Import audio error:', err);
    return { success: false, message: `Error importing audio: ${err.message}` };
  }
});

// Delete audio file
ipcMain.handle('delete-audio-file', async (event, fileName) => {
  try {
    const filePath = path.join(AUDIO_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: `"${fileName}" deleted successfully!` };
    } else {
      return { success: false, message: `File "${fileName}" not found.` };
    }
  } catch (err) {
    console.error('Failed to delete audio file:', err);
    return { success: false, message: `Failed to delete audio file: ${err.message}` };
  }
});

// ===== Video Handlers =====

// Get list of video files
ipcMain.handle('get-video-files', () => {
  try {
    if (fs.existsSync(VIDEO_DIR)) {
      const files = fs.readdirSync(VIDEO_DIR)
        .filter(f => {
          const ext = f.toLowerCase();
          return ext.endsWith('.mp4') || ext.endsWith('.mov') || ext.endsWith('.mkv') || 
                 ext.endsWith('.avi') || ext.endsWith('.webm') || ext.endsWith('.flv') || 
                 ext.endsWith('.wmv') || ext.endsWith('.m4v') || ext.endsWith('.mpg') || 
                 ext.endsWith('.mpeg') || ext.endsWith('.3gp');
        })
        .map(f => ({
          name: f,
          path: path.join(VIDEO_DIR, f)
        }));
      return files;
    }
    return [];
  } catch (err) {
    console.error('Error reading video files:', err);
    return [];
  }
});

// Import video file
ipcMain.handle('import-video', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', '3gp'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: 'Import cancelled' };
  }

  try {
    let importedCount = 0;
    for (const videoPath of result.filePaths) {
      const fileName = path.basename(videoPath);
      const destPath = path.join(VIDEO_DIR, fileName);
      
      // Copy file to Video directory
      fs.copyFileSync(videoPath, destPath);
      importedCount++;
    }

    if (importedCount === 1) {
      return { success: true, message: `Successfully imported 1 video file!` };
    } else {
      return { success: true, message: `Successfully imported ${importedCount} video files!` };
    }
  } catch (err) {
    console.error('Import video error:', err);
    return { success: false, message: `Error importing video: ${err.message}` };
  }
});

// Delete video file
ipcMain.handle('delete-video-file', async (event, fileName) => {
  try {
    const filePath = path.join(VIDEO_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: `"${fileName}" deleted successfully!` };
    } else {
      return { success: false, message: `File "${fileName}" not found.` };
    }
  } catch (err) {
    console.error('Failed to delete video file:', err);
    return { success: false, message: `Failed to delete video file: ${err.message}` };
  }
});

// ===== Images Handlers =====

// Get list of image files
ipcMain.handle('get-images', () => {
  try {
    if (fs.existsSync(IMAGES_DIR)) {
      const files = fs.readdirSync(IMAGES_DIR)
        .filter(f => {
          const ext = f.toLowerCase();
          return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || 
                 ext.endsWith('.gif') || ext.endsWith('.bmp') || ext.endsWith('.webp') || 
                 ext.endsWith('.svg') || ext.endsWith('.tiff') || ext.endsWith('.tif') || 
                 ext.endsWith('.ico') || ext.endsWith('.heic') || ext.endsWith('.heif');
        })
        .map(f => ({
          name: f,
          path: path.join(IMAGES_DIR, f)
        }));
      return files;
    }
    return [];
  } catch (err) {
    console.error('Error reading image files:', err);
    return [];
  }
});

// Import image files
ipcMain.handle('import-images', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'heic', 'heif'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: 'Import cancelled' };
  }

  try {
    let importedCount = 0;
    for (const imagePath of result.filePaths) {
      const fileName = path.basename(imagePath);
      const destPath = path.join(IMAGES_DIR, fileName);
      
      // Copy file to Images directory
      fs.copyFileSync(imagePath, destPath);
      importedCount++;
    }

    if (importedCount === 1) {
      return { success: true, message: `Successfully imported 1 image!` };
    } else {
      return { success: true, message: `Successfully imported ${importedCount} images!` };
    }
  } catch (err) {
    console.error('Import images error:', err);
    return { success: false, message: `Error importing images: ${err.message}` };
  }
});

// Delete image file
ipcMain.handle('delete-image', async (event, fileName) => {
  try {
    const filePath = path.join(IMAGES_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: `"${fileName}" deleted successfully!` };
    } else {
      return { success: false, message: `File "${fileName}" not found.` };
    }
  } catch (err) {
    console.error('Failed to delete image file:', err);
    return { success: false, message: `Failed to delete image file: ${err.message}` };
  }
});

// Get list of background images
ipcMain.handle('get-backgrounds', () => {
  try {
    if (fs.existsSync(BACKGROUNDS_DIR)) {
      return fs.readdirSync(BACKGROUNDS_DIR).filter(f => 
        f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.gif')
      );
    }
    return [];
  } catch (err) {
    console.error('Error reading backgrounds:', err);
    return [];
  }
});

// Return absolute path for a background filename
ipcMain.handle('get-background-path', (event, filename) => {
  try {
    if (!filename) return '';
    return path.join(BACKGROUNDS_DIR, filename);
  } catch (err) {
    console.error('Error resolving background path:', err);
    return '';
  }
});

// Get service slides
ipcMain.handle('get-service-slides', () => {
  try {
    if (fs.existsSync(SERVICE_SLIDES_FILE)) {
      const data = fs.readFileSync(SERVICE_SLIDES_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    console.error('Error reading service slides:', err);
    return [];
  }
});

// Save service slides
ipcMain.handle('save-service-slides', (event, slides) => {
  try {
    fs.writeFileSync(SERVICE_SLIDES_FILE, JSON.stringify(slides, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving service slides:', err);
    return { success: false, error: err.message };
  }
});

// Set background image on projector
ipcMain.on('set-background', (event, filename) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    const bgPath = filename ? path.join(BACKGROUNDS_DIR, filename) : '';
    projectorWindow.webContents.send('update-background', bgPath);
  } else {
    // Store background to apply when projector window is created
    global.selectedBackground = filename;
  }
});

// Load Thai-English txt song files
ipcMain.handle('load-song', async (event, filename) => {
  // Create projector window on first song load if it doesn't exist
  if (!projectorWindow) {
    createProjectorWindow();
  }

  const filepath = path.join(SONG_DIR, filename);
  const slides = [];

  try {
    console.log(`Reading Thai-English song file: ${filepath}`);
    
    // Read the text file
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Split content by blank lines (double newlines)
    const verses = content.split(/\n\s*\n/).map(v => v.trim()).filter(v => v);
    
    // Add each verse as a slide
    verses.forEach((verse, index) => {
      slides.push(verse);
      console.log(`Thai-English Slide ${index + 1}: ${verse.substring(0, 50)}...`);
    });

    if (slides.length === 0) {
      // No content found
      slides.push('⚠️ No content found in this file.');
    }
  } catch (err) {
    console.error('Failed to read Thai-English song file:', err);
    slides.push(`❌ Error reading file:\n\n${err.message}`);
  }

  return slides;
});

// Load Thai txt song files
ipcMain.handle('load-thai-song', async (event, filename) => {
  // Create projector window on first song load if it doesn't exist
  if (!projectorWindow) {
    createProjectorWindow();
  }

  const filepath = path.join(THAI_SONG_DIR, filename);
  const slides = [];

  try {
    console.log(`Reading Thai song file: ${filepath}`);
    
    // Read the text file
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Split content by blank lines (double newlines)
    const verses = content.split(/\n\s*\n/).map(v => v.trim()).filter(v => v);
    
    // Add each verse as a slide
    verses.forEach((verse, index) => {
      slides.push(verse);
      console.log(`Thai Slide ${index + 1}: ${verse.substring(0, 50)}...`);
    });

    if (slides.length === 0) {
      // No content found
      slides.push('⚠️ No content found in this file.');
    }
  } catch (err) {
    console.error('Failed to read Thai song file:', err);
    slides.push(`❌ Error reading file:\n\n${err.message}`);
  }

  return slides;
});

// Load English txt song files
ipcMain.handle('load-english-song', async (event, filename) => {
  // Create projector window on first song load if it doesn't exist
  if (!projectorWindow) {
    createProjectorWindow();
  }

  const filepath = path.join(ENGLISH_SONG_DIR, filename);
  const slides = [];

  try {
    console.log(`Reading English song file: ${filepath}`);
    
    // Read the text file
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Split content by blank lines (double newlines)
    const verses = content.split(/\n\s*\n/).map(v => v.trim()).filter(v => v);
    
    // Add each verse as a slide
    verses.forEach((verse, index) => {
      slides.push(verse);
      console.log(`English Slide ${index + 1}: ${verse.substring(0, 50)}...`);
    });

    if (slides.length === 0) {
      // No content found
      slides.push('⚠️ No content found in this file.');
    }
  } catch (err) {
    console.error('Failed to read English song file:', err);
    slides.push(`❌ Error reading file:\n\n${err.message}`);
  }

  return slides;
});

// Load Non-Hymnal txt song files
ipcMain.handle('load-non-hymnal-song', async (event, filename) => {
  // Create projector window on first song load if it doesn't exist
  if (!projectorWindow) {
    createProjectorWindow();
  }

  const filepath = path.join(NON_HYMNAL_DIR, filename);
  const slides = [];

  try {
    console.log(`Reading Non-Hymnal file: ${filepath}`);
    const content = fs.readFileSync(filepath, 'utf8');
    const verses = content.split(/\n\s*\n/).map(v => v.trim()).filter(v => v);
    verses.forEach((verse, index) => {
      slides.push(verse);
      console.log(`Non-Hymnal Slide ${index + 1}: ${verse.substring(0, 50)}...`);
    });

    if (slides.length === 0) {
      slides.push('⚠️ No content found in this file.');
    }
  } catch (err) {
    console.error('Failed to read Non-Hymnal file:', err);
    slides.push(`❌ Error reading file:\n\n${err.message}`);
  }

  return slides;
});

// Show slide on both control and projector windows
ipcMain.on('show-slide', (event, data) => {
  // Handle different slide formats
  let slideType = 'text';
  let text = '';
  let imagePath = '';
  let elements = null;
  let slideIndex = 0;
  let totalSlides = 1;
  
  if (typeof data === 'string') {
    text = data;
  } else if (typeof data === 'object' && data !== null) {
    slideType = data.type || 'text';
    if (slideType === 'image') {
      imagePath = data.path || '';
    } else if (slideType === 'visual') {
      elements = data.elements || [];
    } else {
      text = data.text || '';
    }
    slideIndex = data.slideIndex || 0;
    totalSlides = data.totalSlides || 1;
  }
  
  const preview = slideType === 'image' ? `[Image: ${imagePath}]` : 
                  slideType === 'visual' ? `[Visual Slide with ${elements ? elements.length : 0} elements]` :
                  (text ? text.substring(0, 100) : '[empty]');
  console.log('Received show-slide event:', preview, 'Type:', slideType, 'Index:', slideIndex);
  console.log('Projector window exists:', !!projectorWindow, 'Destroyed:', projectorWindow ? projectorWindow.isDestroyed() : 'N/A');
  
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    try {
      console.log('Sending to projector window...');
      if (slideType === 'image') {
        const payload = { type: 'image', path: imagePath, slideIndex, totalSlides };
        console.log('Sending image payload:', payload);
        projectorWindow.webContents.send('display-song', payload);
      } else if (slideType === 'visual') {
        const payload = { type: 'visual', elements, slideIndex, totalSlides };
        console.log('Sending visual payload:', payload);
        projectorWindow.webContents.send('display-song', payload);
      } else {
        const payload = { type: 'text', text, slideIndex, totalSlides };
        console.log('Sending text payload:', payload);
        projectorWindow.webContents.send('display-song', payload);
        
        // Also ensure font is applied
        if (global.selectedFont) {
          console.log('Re-applying stored font:', global.selectedFont);
          setTimeout(() => {
            projectorWindow.webContents.send('update-font', global.selectedFont);
          }, 100);
        }
      }
      console.log('Message sent to projector successfully');
    } catch (err) {
      console.error('Error sending to projector:', err);
    }
  } else {
    console.error('Projector window not available! Creating new one...');
    createProjectorWindow();
  }
  if (controlWindow && !controlWindow.isDestroyed()) {
    if (slideType === 'image') {
      controlWindow.webContents.send('display-preview', `[Image Slide ${slideIndex + 1}]`);
    } else if (slideType === 'visual') {
      controlWindow.webContents.send('display-preview', `[Visual Slide]`);
    } else {
      controlWindow.webContents.send('display-preview', text);
    }
  }
});

// Forward song-loaded event from list to control window
ipcMain.on('song-loaded', (event, data) => {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('song-loaded', data);
    // Hide image zoom controls when non-image content is loaded
    controlWindow.webContents.send('image-displayed', false);
  }
});

// Display video on projector window
ipcMain.on('display-video', (event, data) => {
  if (!projectorWindow) {
    createProjectorWindow();
  }
  
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('display-video', data);
    projectorWindow.show();
  }
});

// Display image on projector window
ipcMain.on('display-image', (event, data) => {
  if (!projectorWindow) {
    createProjectorWindow();
  }
  
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('display-song', data);
    projectorWindow.show();
  }
  
  // Notify control window that an image is being displayed
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('image-displayed', true);
  }
});

// Control video playback on projector window
ipcMain.on('control-video', (event, action) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('control-video', action);
  }
});

// Open projector window manually
ipcMain.on('open-projector', () => {
  if (!projectorWindow) {
    createProjectorWindow();
  } else {
    projectorWindow.show();
    // Notify control window that projector is open
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projector-state', true);
    }
  }
});

// Close projector window manually
ipcMain.on('close-projector', () => {
  console.log('Received close-projector request');
  if (projectorWindow) {
    console.log('Closing projector window...');
    projectorWindow.close();
  } else {
    console.log('Projector window already closed');
  }
});

// Hide projector window
ipcMain.on('hide-projector', () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.hide();
    // Notify control window that projector is hidden
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projector-visibility', true);
    }
  }
});

// Show projector window
ipcMain.on('show-projector', () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.show();
    // Notify control window that projector is visible
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projector-visibility', false);
    }
  }
});

// Adjust font size on Display2
ipcMain.on('adjust-font-size', (event, action) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('adjust-font-size', action);
  }
});

// Adjust image zoom on Display2
ipcMain.on('adjust-image-zoom', (event, action) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('adjust-image-zoom', action);
  }
});

// Open visual editor in control window
ipcMain.on('open-visual-editor', (event, data) => {
  console.log('Opening visual editor for service:', data.service);
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('open-visual-editor', data);
  }
});

// Save visual slide from control window to list window
ipcMain.on('save-visual-slide', (event, slideData) => {
  console.log('Saving visual slide:', slideData);
  if (listWindow && !listWindow.isDestroyed()) {
    listWindow.webContents.send('save-visual-slide', slideData);
  }
});

// Get available system fonts
ipcMain.handle('get-system-fonts', async () => {
  try {
    const { execSync } = require('child_process');
    let installedFonts = [];
    
    try {
      // Use PowerShell to get all installed fonts from Windows Registry
      const psCommand = `
        $fonts = @()
        $fonts += Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' | 
                  Get-Member -MemberType NoteProperty | 
                  Select-Object -ExpandProperty Name
        $fonts += Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' -ErrorAction SilentlyContinue | 
                  Get-Member -MemberType NoteProperty | 
                  Select-Object -ExpandProperty Name
        $fonts | ForEach-Object { 
          $name = $_ -replace ' \\(TrueType\\)', '' -replace ' \\(OpenType\\)', '' -replace ' \\(Type 1\\)', ''
          # Extract base font name before first variant keyword
          if ($name -match '^(.+?)\\s+(Bold|Italic|Regular|Light|Medium|SemiBold|Semibold|Black|Heavy|Thin|ExtraBold|ExtraLight|Condensed|Extended|Narrow|Wide|Oblique|Demi)') {
            $matches[1]
          } else {
            $name
          }
        } | Sort-Object -Unique
      `;
      
      const result = execSync(`powershell -Command "${psCommand}"`, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });
      
      // Parse the result and clean up font names
      installedFonts = result
        .split('\n')
        .map(font => font.trim())
        .filter(font => font && !font.startsWith('PS') && font.length > 1 && !font.includes('='))
        .filter((font, index, self) => self.indexOf(font) === index) // Remove duplicates
        .sort((a, b) => a.localeCompare(b));
      
      if (installedFonts.length > 0) {
        console.log(`Found ${installedFonts.length} installed fonts`);
        // Log first 10 fonts for debugging
        console.log('Sample fonts:', installedFonts.slice(0, 10).join(', '));
        return installedFonts;
      }
    } catch (err) {
      console.error('Error reading fonts from registry:', err);
    }
    
    // Fallback to comprehensive list if registry reading fails
    const commonFonts = [
      // Standard Windows fonts
      'Arial',
      'Arial Black',
      'Arial Narrow',
      'Arial Rounded MT Bold',
      'Bahnschrift',
      'Calibri',
      'Calibri Light',
      'Cambria',
      'Cambria Math',
      'Candara',
      'Comic Sans MS',
      'Consolas',
      'Constantia',
      'Corbel',
      'Courier New',
      'Ebrima',
      'Franklin Gothic Medium',
      'Gabriola',
      'Gadugi',
      'Georgia',
      'HoloLens MDL2 Assets',
      'Impact',
      'Ink Free',
      'Javanese Text',
      'Leelawadee UI',
      'Lucida Console',
      'Lucida Sans Unicode',
      'Malgun Gothic',
      'Microsoft Himalaya',
      'Microsoft JhengHei',
      'Microsoft New Tai Lue',
      'Microsoft PhagsPa',
      'Microsoft Sans Serif',
      'Microsoft Tai Le',
      'Microsoft YaHei',
      'Microsoft Yi Baiti',
      'MingLiU-ExtB',
      'Mongolian Baiti',
      'MS Gothic',
      'MS PGothic',
      'MS UI Gothic',
      'MV Boli',
      'Myanmar Text',
      'Nirmala UI',
      'Palatino Linotype',
      'Segoe MDL2 Assets',
      'Segoe Print',
      'Segoe Script',
      'Segoe UI',
      'Segoe UI Black',
      'Segoe UI Emoji',
      'Segoe UI Historic',
      'Segoe UI Light',
      'Segoe UI Semibold',
      'Segoe UI Semilight',
      'Segoe UI Symbol',
      'SimSun',
      'Sitka Banner',
      'Sitka Display',
      'Sitka Heading',
      'Sitka Small',
      'Sitka Subheading',
      'Sitka Text',
      'Sylfaen',
      'Symbol',
      'Tahoma',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      'Webdings',
      'Wingdings',
      'Yu Gothic',
      
      // Microsoft Office fonts (often included with Office installation)
      'Abadi',
      'Abadi MT Condensed Light',
      'Advent Sans Logo',
      'Agency FB',
      'Aharoni',
      'Aldhabi',
      'Algerian',
      'Andalus',
      'Aparajita',
      'Arabic Typesetting',
      'Arial',
      'Arial Rounded MT Bold',
      'Arial Unicode MS',
      'Baskerville Old Face',
      'Batang',
      'BatangChe',
      'Bauhaus 93',
      'Bell MT',
      'Berlin Sans FB',
      'Berlin Sans FB Demi',
      'Bernard MT Condensed',
      'Blackadder ITC',
      'Bodoni MT',
      'Bodoni MT Black',
      'Bodoni MT Condensed',
      'Bodoni MT Poster Compressed',
      'Book Antiqua',
      'Bookman Old Style',
      'Bookshelf Symbol 7',
      'Bradley Hand ITC',
      'Britannic Bold',
      'Broadway',
      'Brush Script MT',
      'Californian FB',
      'Calisto MT',
      'Castellar',
      'Centaur',
      'Century',
      'Century Gothic',
      'Century Schoolbook',
      'Chiller',
      'Colonna MT',
      'Cooper Black',
      'Copperplate Gothic Bold',
      'Copperplate Gothic Light',
      'Curlz MT',
      'DaunPenh',
      'David',
      'DFKai-SB',
      'Dotum',
      'DotumChe',
      'Edwardian Script ITC',
      'Elephant',
      'Engravers MT',
      'Eras Bold ITC',
      'Eras Demi ITC',
      'Eras Light ITC',
      'Eras Medium ITC',
      'Estrangelo Edessa',
      'FangSong',
      'Felix Titling',
      'Footlight MT Light',
      'Forte',
      'FrankRuehl',
      'Franklin Gothic Book',
      'Franklin Gothic Demi',
      'Franklin Gothic Demi Cond',
      'Franklin Gothic Heavy',
      'Franklin Gothic Medium Cond',
      'Freestyle Script',
      'French Script MT',
      'Gabriola',
      'Garamond',
      'Gautami',
      'Georgia',
      'Gigi',
      'Gill Sans MT',
      'Gill Sans MT Condensed',
      'Gill Sans MT Ext Condensed Bold',
      'Gill Sans Ultra Bold',
      'Gill Sans Ultra Bold Condensed',
      'Gisha',
      'Gloucester MT Extra Condensated',
      'Goudy Old Style',
      'Goudy Stout',
      'Gulim',
      'GulimChe',
      'Gungsuh',
      'GungsuhChe',
      'Haettenschweiler',
      'Harlow Solid Italic',
      'Harrington',
      'High Tower Text',
      'Impact',
      'Imprint MT Shadow',
      'Informal Roman',
      'Iskoola Pota',
      'Jokerman',
      'Juice ITC',
      'KaiTi',
      'Kalinga',
      'Kartika',
      'Khmer UI',
      'Kokila',
      'Kristen ITC',
      'Kunstler Script',
      'Lao UI',
      'Latha',
      'Leelawadee',
      'Levenim MT',
      'LiSu',
      'Lucida Bright',
      'Lucida Calligraphy',
      'Lucida Fax',
      'Lucida Handwriting',
      'Lucida Sans',
      'Lucida Sans Typewriter',
      'Magneto',
      'Maiandra GD',
      'Malgun Gothic',
      'Mangal',
      'Marlett',
      'Matura MT Script Capitals',
      'Meiryo',
      'Meiryo UI',
      'Microsoft Uighur',
      'Mincho',
      'Miriam',
      'Miriam Fixed',
      'Mistral',
      'Modern No. 20',
      'Mongolian Baiti',
      'Monotype Corsiva',
      'MoolBoran',
      'MS Gothic',
      'MS Mincho',
      'MS Outlook',
      'MS PMincho',
      'MS Reference Sans Serif',
      'MS Reference Specialty',
      'MT Extra',
      'MV Boli',
      'Narkisim',
      'Niagara Engraved',
      'Niagara Solid',
      'Nyala',
      'OCR A Extended',
      'Old English Text MT',
      'Onyx',
      'Palace Script MT',
      'Papyrus',
      'Parchment',
      'Perpetua',
      'Perpetua Titling MT',
      'Plantagenet Cherokee',
      'Playbill',
      'PMingLiU',
      'PMingLiU-ExtB',
      'Poor Richard',
      'Pristina',
      'Raavi',
      'Rage Italic',
      'Ravie',
      'Rockwell',
      'Rockwell Condensed',
      'Rockwell Extra Bold',
      'Rod',
      'Sakkal Majalla',
      'Script MT Bold',
      'Segoe Script',
      'Segoe UI Symbol',
      'Shonar Bangla',
      'Showcard Gothic',
      'Shruti',
      'SimHei',
      'Simplified Arabic',
      'Simplified Arabic Fixed',
      'SimSun',
      'SimSun-ExtB',
      'Snap ITC',
      'Stencil',
      'Sylfaen',
      'Tahoma',
      'Tempus Sans ITC',
      'Traditional Arabic',
      'Trebuchet MS',
      'Tunga',
      'Tw Cen MT',
      'Tw Cen MT Condensed',
      'Tw Cen MT Condensed Extra Bold',
      'Utsaah',
      'Vani',
      'Verdana',
      'Vijaya',
      'Viner Hand ITC',
      'Vivaldi',
      'Vladimir Script',
      'Vrinda',
      'Webdings',
      'Wide Latin',
      'Wingdings',
      'Wingdings 2',
      'Wingdings 3',
      'YouYuan',
      
      // Thai fonts (Windows + Office)
      'Angsana New',
      'AngsanaUPC',
      'Browallia New',
      'BrowalliaUPC',
      'Cordia New',
      'CordiaUPC',
      'DilleniaUPC',
      'EucrosiaUPC',
      'FreesiaUPC',
      'IrisUPC',
      'JasmineUPC',
      'KodchiangUPC',
      'Leelawadee',
      'LilyUPC',
      'Sakkal Majalla',
      
      // Additional common fonts
      'MS Sans Serif',
      'MS Serif',
      'Small Fonts'
    ];
    
    // Sort alphabetically for easier selection
    return commonFonts.sort((a, b) => a.localeCompare(b));
  } catch (err) {
    console.error('Error getting system fonts:', err);
    return ['Arial', 'Times New Roman', 'Verdana', 'Tahoma'];
  }
});

// Set font on Display2
ipcMain.on('set-font', (event, fontFamily) => {
  console.log('=== MAIN PROCESS: SET FONT ===');
  console.log('Received font:', fontFamily);
  console.log('Projector window exists:', !!projectorWindow);
  console.log('Projector window destroyed:', projectorWindow ? projectorWindow.isDestroyed() : 'N/A');
  
  // Store font globally first
  global.selectedFont = fontFamily;
  console.log('Font stored globally:', global.selectedFont);
  
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    console.log('Sending update-font to projector window');
    
    // Use executeJavaScript to directly update the font (more reliable)
    const __safeFont = JSON.stringify(fontFamily);
    projectorWindow.webContents.executeJavaScript(`(function(){
      const f = ${__safeFont};
      try {
        if (typeof currentFontFamily !== 'undefined') {
          console.log('Direct JS execution - setting font to:', f);
          currentFontFamily = f;

          // Update initial text if visible
          const initialText = document.getElementById('initial-text');
          if (initialText) {
            initialText.style.fontFamily = '"' + f + '", Arial, sans-serif';
          }

          // Re-render current slide if exists
          if (typeof currentSlideData !== 'undefined' && currentSlideData !== null) {
            renderSlideWithFontSize(currentSlideData);
          }

          console.log('Font applied via direct execution');
        }
      } catch (e) {
        console.error('Direct JS font update failed:', e);
      }
    })();`).then(() => {
      console.log('Font update executed successfully');
    }).catch(err => {
      console.error('Error executing font update:', err);
    });
    
    // Also send the IPC message as backup
    projectorWindow.webContents.send('update-font', fontFamily);
    console.log('Font update sent via IPC as well');
  } else {
    console.log('Projector window not available yet');
  }
  
  console.log('==============================');
});

// Ensure all user data directories exist (for portable .exe compatibility)
function ensureUserDirectories() {
  const userDirs = [PRESENTATIONS_DIR, AUDIO_DIR, VIDEO_DIR, IMAGES_DIR];
  userDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created user directory:', dir);
      } catch (err) {
        console.error('Failed to create directory:', dir, err);
      }
    }
  });
}

app.whenReady().then(() => {
  // Initialize user directories before anything else
  ensureUserDirectories();
  
  // Set app user model ID for Windows (helps with taskbar icon)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.churchhymnal.app.PUREPRESENTER');
  }
  
  // Initialize auto-updater
  autoUpdater = new AutoUpdater();
  
  require('electron-reload')(__dirname);
  
  // Create custom menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Relaunch Program',
          click: () => {
            app.relaunch();
            app.quit();
          }
        },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              const currentZoom = browserWindow.webContents.getZoomLevel();
              browserWindow.webContents.setZoomLevel(currentZoom + 0.5);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              const currentZoom = browserWindow.webContents.getZoomLevel();
              browserWindow.webContents.setZoomLevel(currentZoom - 0.5);
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.webContents.setZoomLevel(0);
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => {
            // Reload all windows
            if (listWindow && !listWindow.isDestroyed()) {
              listWindow.webContents.reload();
            }
            if (controlWindow && !controlWindow.isDestroyed()) {
              controlWindow.webContents.reload();
            }
            if (projectorWindow && !projectorWindow.isDestroyed()) {
              projectorWindow.webContents.reload();
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: 'Subscription',
      submenu: [
        {
          label: 'View License Information',
          click: () => {
            const licenseData = license.getLicenseData();
            const licenseStatus = license.checkLicense();
            
            if (licenseData && licenseStatus.isValid) {
              const customer = licenseData.customerInfo || 'Not Specified';
              const licenseKey = licenseData.licenseKey || 'Unknown';
              const activatedDate = licenseData.activatedDate ? new Date(licenseData.activatedDate).toLocaleString() : 'Unknown';
              const expiryDate = licenseStatus.expiryDate ? licenseStatus.expiryDate.toLocaleDateString() : 'Unknown';
              const daysRemaining = licenseStatus.daysRemaining || 0;
              
              let statusMessage = '';
              if (licenseStatus.status === 'ACTIVE') {
                statusMessage = '✅ ACTIVE';
              } else if (licenseStatus.status === 'EXPIRING_SOON') {
                statusMessage = '⚠️ EXPIRING SOON';
              }
              
              dialog.showMessageBox({
                type: 'info',
                title: 'Subscription Information',
                message: 'LICENSE INFORMATION',
                detail: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER: ${customer.toUpperCase()}

LICENSE KEY: ${licenseKey}

STATUS: ${statusMessage}

ACTIVATED: ${activatedDate}

VALID UNTIL: ${expiryDate}

DAYS REMAINING: ${daysRemaining} days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPLICATION OWNER:
SONGNAM SARAPHAI

For license renewal or support:
Email: songnam@apiu.edu
Phone: 061-580-2547`,
                buttons: ['OK']
              });
            } else {
              dialog.showMessageBox({
                type: 'warning',
                title: 'Subscription Information',
                message: 'NO VALID LICENSE',
                detail: 'No valid license found.\n\nPlease contact the administrator to activate your subscription.\n\nSONGNAM SARAPHAI\nEmail: songnam@apiu.edu\nPhone: 061-580-2547',
                buttons: ['OK']
              });
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Deactivate License',
          click: () => {
            const result = dialog.showMessageBoxSync({
              type: 'warning',
              title: 'Deactivate License',
              message: 'Are you sure you want to deactivate your license?',
              detail: 'This will remove the license from this device.\n\nYou will need to re-enter the license key to use the application again.',
              buttons: ['Cancel', 'Deactivate'],
              defaultId: 0,
              cancelId: 0
            });
            
            if (result === 1) {
              license.deleteLicense();
              dialog.showMessageBox({
                type: 'info',
                title: 'License Deactivated',
                message: 'License has been deactivated successfully.',
                detail: 'The application will now close.\n\nPlease restart and activate with a valid license key.',
                buttons: ['OK']
              }).then(() => {
                app.quit();
              });
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'PURE PRESENTER - Complete Documentation',
              message: 'How to Use PURE PRESENTER (v1.0.3)',
              detail: `OVERVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PURE PRESENTER is a professional multi-window presentation tool specially designed for worship services and religious gatherings. The three main windows are:

• Project List (left) — Browse and select hymns, presentations, and service slides
• Control & Preview (center) — Preview slides, access Visual Editor, control navigation
• Display2 (projector) — Full-screen output for second monitor or projector

VERSION HISTORY:
• v1.0.3 — Fixed auto-update installation error (current version)
• v1.0.2 — Fixed Windows icon display in Search and taskbar
• v1.0.1 — Initial stable release with all core features

KEY FEATURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) HYMN LIBRARIES
• Built-in folders: Service, Thai, Thai-English, English, Non-Hymnal
• Click any hymn to load its verses as slides
• Fast search boxes to locate hymns quickly
• Resume from last position: App remembers your position when switching between content
• Hundreds of hymns pre-loaded and ready to use
• Support for custom hymns in Non-Hymnal folder

2) SERVICE SLIDES (CUSTOM VISUAL SLIDES)
• Create, edit, reorder, and delete custom service slides
• Professional Visual Editor with WYSIWYG editing
• Advanced features:
  - Text elements with inner editable area
  - 8 resizer handles (corners + sides) for manual resizing
  - Pixel-accurate dragging with immediate placement
  - Grid overlay with adjustable snap-to-grid (default: 20px)
  - Pointer-aware live snapping (cursor stays anchored)
  - Auto-fit text boxes (like PowerPoint) - auto-size to content
  - Undo/Redo with full state restore
  - EXACT positioning match between editor and projector
  - Drag to reorder slides in service list

3) PROJECTOR (DISPLAY2) BEHAVIOR
• Automatically opens on first slide/song display
• Intelligent display detection: uses second monitor if available
• Respects saved dimensions and font sizes for consistent text wrapping
• Supports multiple content types:
  - Text slides (hymns, service slides)
  - Image slides (PowerPoint exports)
  - Video playback
  - Single images
• Font size controls for hymnal slides
• Toggle visibility: Alt+X (open/close), Alt+U (show/hide)

4) KEYBOARD SHORTCUTS & WIRELESS CLICKER SUPPORT
Navigation (Next/Previous slide):
• Arrow Right, Arrow Down, Spacebar, PageDown, Enter — Next slide
• Arrow Left, Arrow Up, PageUp — Previous slide
• N key — Next slide
• P key — Previous slide
• ✅ Fully compatible with wireless presentation clickers
• ✅ Works with both horizontal and vertical arrow clicker types

Font Size Control (Hymnal slides only):
• Plus (+) or Equals (=) — Increase font size
• Minus (-) or Underscore (_) — Decrease font size
• Ctrl+0 — Reset font size to default

Projector Control:
• Alt+X — Toggle projector window (open/close)
• Alt+U — Toggle projector visibility (show/hide)

Application Controls:
• F5 — Refresh all windows
• CmdOrCtrl+Shift+I — Toggle Developer Tools
• CmdOrCtrl++ — Zoom in
• CmdOrCtrl+- — Zoom out
• CmdOrCtrl+0 — Reset zoom

5) POWERPOINT IMPORT
• Import .pptx and .ppt files directly
• Automatic slide-by-slide export as high-quality PNG images
• Requires Microsoft PowerPoint installed on your computer
• Imported presentations stored in Presentations folder
• Navigate imported presentations with keyboard shortcuts
• Delete presentations when no longer needed

6) MEDIA MANAGEMENT

AUDIO FILES:
• Supported formats: MP3, WAV, M4A, OGG
• Import single or multiple audio files at once
• Play audio during services
• Delete audio files from library

VIDEO FILES:
• Supported formats: MP4, MOV, MKV, AVI, WebM, FLV, WMV, M4V, MPG, MPEG, 3GP
• Import single or multiple videos
• Full playback controls (play, pause, stop, restart)
• Display videos on projector screen
• Delete videos when done

IMAGE FILES:
• Supported formats: JPG, JPEG, PNG, GIF, BMP, WebP, SVG, TIFF, TIF, ICO, HEIC, HEIF
• Import multiple images at once
• Use images in service slides or standalone display
• Zoom controls for image display on projector
• Delete images from library

7) BACKGROUND MANAGEMENT
• Separate background controls for Hymnal Slides and Service Slides
• Apply different backgrounds to different content types
• All backgrounds stored in backgrounds/ folder
• Preview backgrounds in Visual Editor
• Easy switching between backgrounds during service
• Supports JPG, PNG, GIF formats

8) LICENSE & SUBSCRIPTION SYSTEM
• Secure license activation via built-in activation window
• View full subscription details: Subscription → View License Information
• License information includes:
  - Customer name
  - License key
  - Activation date
  - Expiration date
  - Days remaining
  - Current status (Active/Expiring Soon)
• License expiration warnings (shows alert when expiring soon)
• Deactivate license: Subscription → Deactivate License
• Blacklist support for revoked/invalid licenses
• License stored securely in user data folder

9) AUTO-UPDATE SYSTEM (Fixed in v1.0.3!)
• ✅ Automatic update checking on app startup (5 seconds after launch)
• ✅ Manual update check: Help → Check for Updates
• ✅ One-click download and installation (now working properly!)
• ✅ Release notes displayed before updating
• ✅ Seamless update process - app closes and installer launches automatically
• ✅ No need to manually download from GitHub
• ✅ Always stay up-to-date with latest features and bug fixes
• Checks GitHub releases for new versions
• Downloads installer to temp folder
• Fallback error messages show installer location if needed

10) WINDOWS INTEGRATION (Fixed in v1.0.2!)
• ✅ Proper icon display in Windows Search
• ✅ Correct icon in taskbar and Start Menu
• ✅ Desktop and Start Menu shortcuts with custom icon
• ✅ App User Model ID for better Windows identification
• ✅ Legal trademarks and metadata in executable
• No more default Electron icon!

11) USABILITY & NAVIGATION
• Click thumbnails in Control window to jump to any slide
• Previous/Next buttons for sequential navigation
• Folders can be expanded/collapsed in Project List
• Drag to reorder service slides
• Session memory: Returns to last slide position when switching content
• No slide skipping: Smooth keyboard navigation
• Search functionality in all hymn folders
• Quick access to all media types from Project List

12) FILE ORGANIZATION
The app uses TWO types of directories:

READ-ONLY (Bundled with app):
• Hymns/ — Pre-loaded hymn text files (Thai, English, Thai-English, Non-Hymnal)
• backgrounds/ — Background images for slides
• assets/ — Application icon and resources

WRITABLE (User's AppData folder):
• Presentations/ — Imported PowerPoint presentations (as PNG folders)
• Audio/ — Imported audio files
• Video/ — Imported video files
• Images/ — Imported image files
• service-slides.json — Your custom service slides

This separation ensures the app works in both installed and portable modes.

TIPS & BEST PRACTICES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Visual Editor stores positions/sizes in relative percentages for proper scaling across different displays
• Font sizes saved in viewport units (vw) for consistent projector rendering
• Text placement in editor exactly matches Display2 output
• Wireless clickers work with both arrow up/down and left/right configurations
• Text boxes are immediately movable after creation
• Font size adjustments (+/-) work only on hymnal slides, not service/visual slides
• Position memory persists during session but resets on app restart
• Keep app updated using Help → Check for Updates for latest fixes
• Use dual monitors for best experience (one for control, one for projection)
• Test presentations before services to ensure smooth operation

TROUBLESHOOTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If Display2 doesn't open: Use Alt+X to toggle projector window
• If updates fail: Download installer manually from GitHub releases
• If PowerPoint import fails: Ensure Microsoft PowerPoint is installed
• If license activation fails: Check license key and internet connection
• If fonts look different: Use system fonts available on all computers
• If app is slow: Close unused windows, restart application
• For any issues: File → Relaunch Program to restart fresh

SYSTEM REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Operating System: Windows 10/11 (64-bit)
• RAM: 4GB minimum (8GB recommended)
• Storage: 500MB free space
• Display: Dual monitor setup recommended for presentations
• Internet: Required for license activation and updates
• Optional: Microsoft PowerPoint (for .pptx import feature)

SUPPORT & CONTACT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For license support, technical assistance, or feature requests:

Developer: Songnam Saraphai
Email: songnam@apiu.edu
Phone: 061-580-2547

Response time: Usually within 24 hours
Available for: License issues, bug reports, feature requests, training

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PURE PRESENTER v1.0.3 - Professional Worship Presentation Software
Copyright © 2025 Songnam Saraphai. All rights reserved.

This documentation covers all features available in the current release. For the latest updates and release notes, visit Help → Check for Updates.`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            if (autoUpdater) {
              autoUpdater.checkForUpdates(false);
            } else {
              dialog.showMessageBox({
                type: 'error',
                title: 'Update Check Failed',
                message: 'Auto-updater not initialized',
                buttons: ['OK']
              });
            }
          }
        },
        {
          label: 'Contact',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'Contact Information',
              message: 'Contact Information',
              detail: 'Name: Songnam Saraphai\n\nEmail: songnam@apiu.edu\n\nPhone: 061-580-2547',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  // Check license before starting
  checkLicenseAndStart();
});

// License activation IPC handlers
ipcMain.on('license-activated', () => {
  // Close activation window and start main app
  if (activationWindow) {
    activationWindow.close();
    activationWindow = null;
  }
  
  // Create main windows
  createWindows();
  
  // Show success message
  setTimeout(() => {
    dialog.showMessageBox({
      type: 'info',
      title: 'License Activated',
      message: 'AIU CHURCH PRESENTER has been activated successfully!',
      detail: 'Thank you for activating your license.',
      buttons: ['OK']
    });
  }, 500);
});

ipcMain.on('license-cancelled', () => {
  // User cancelled activation - quit app
  if (activationWindow) {
    activationWindow.close();
    activationWindow = null;
  }
  app.quit();
});
