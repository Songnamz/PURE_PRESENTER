const { app, BrowserWindow, ipcMain, screen, Menu, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const officeParser = require('officeparser');
const { exec } = require('child_process');
const license = require('./license');

let projectorWindow, controlWindow, listWindow, activationWindow;
let windowTitleSuffix = '- BY SONGNAM SARAPHAI'; // Global title suffix for all windows
const SONG_DIR = path.join(__dirname, '../Hymns/Thai-English');
const BACKGROUNDS_DIR = path.join(__dirname, '../backgrounds');
const ICON_PATH = path.join(__dirname, '../assets/PURE PRESENTER.ico');
const SERVICE_SLIDES_FILE = path.join(__dirname, '../service-slides.json');
const PRESENTATIONS_DIR = path.join(__dirname, '../Presentations');
const AUDIO_DIR = path.join(__dirname, '../Audio');
const VIDEO_DIR = path.join(__dirname, '../Video');
const IMAGES_DIR = path.join(__dirname, '../Images');

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
    width: 1140,
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
    if (!fs.existsSync(PRESENTATIONS_DIR)) {
      fs.mkdirSync(PRESENTATIONS_DIR, { recursive: true });
    }
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

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

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

// Ensure video directory exists
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

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

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

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
    projectorWindow.webContents.executeJavaScript(`
      if (typeof currentFontFamily !== 'undefined') {
        console.log('Direct JS execution - setting font to: ${fontFamily}');
        currentFontFamily = '${fontFamily}';
        
        // Update initial text if visible
        const initialText = document.getElementById('initial-text');
        if (initialText) {
          initialText.style.fontFamily = '"${fontFamily}", Arial, sans-serif';
        }
        
        // Re-render current slide if exists
        if (typeof currentSlideData !== 'undefined' && currentSlideData !== null) {
          renderSlideWithFontSize(currentSlideData);
        }
        
        console.log('Font applied via direct execution');
      }
    `).then(() => {
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

app.whenReady().then(() => {
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
              title: 'PURE PRESENTER - Documentation',
              message: 'How to Use PURE PRESENTER (PROJECT LIST, CONTROL & DISPLAY2)',
              detail: `OVERVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PURE PRESENTER is a multi-window presentation tool specially tailored for worship services. The three main windows are:
• Project List (left) — pick hymns, presentations, and service slides
• Control & Preview (center) — preview slides, open the Visual Editor, and control navigation
• Display2 (projector) — full-screen output for the second monitor or projector

KEY FEATURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) HYMN LIBRARIES
• Built-in folders: Service, Thai, Thai-English, English
• Click any hymn to load its verses as slides
• Search boxes help locate hymns quickly

2) SERVICE SLIDES (CUSTOM VISUAL SLIDES)
• Create, edit, reorder, and delete service slides
• Visual Editor supports:
  - Text elements with an inner editable area (WYSIWYG)
  - 8 resizer handles (corners + sides) for manual resizing
  - Pixel-accurate dragging while storing sizes/positions as percentages for portability
  - Grid overlay with snap-to-grid (grid step adjustable in code; default 20px)
  - Pointer-aware live snapping so the cursor stays anchored while snapping
  - Auto-fit text boxes (like PowerPoint) which automatically size to content; manual resize disables auto-fit
  - Undo / Redo with state restore that rebuilds resizer handles and maintains editor state

3) PROJECTOR (DISPLAY2) BEHAVIOR
• Automatically opens on first slide/song display (uses the second monitor if available)
• Respects saved width/height and font sizes so text wrapping on Display2 matches the editor
• Supports image slides (e.g., imported PowerPoint slides exported as PNG)

4) POWERPOINT IMPORT
• Import .pptx files; slides are exported as images and stored under Presentations
• Imported presentations appear in the Presentations list and can be displayed or deleted

5) MEDIA MANAGEMENT
• Import and manage Audio and Video files (copy into the app's Audio/Video folders)
• Import image files for backgrounds and slide content

6) LICENSE & SUBSCRIPTION
• License activation / deactivation via the built-in activation window
• Subscription details (customer name, key, status, expiry) are shown under Subscription → View License Information

7) USABILITY & NAVIGATION
• Click thumbnails in Control to jump to any slide
• Previous/Next buttons for sequential navigation
• Folders can be expanded/collapsed; drag to reorder service slides

TIPS & NOTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• The Visual Editor stores positions/sizes in relative percentages (center-anchored) so slides scale correctly across different displays.
• Font sizes are saved in viewport units (vw) for consistent projector rendering.
• If projector rendering appears different, check selected background and font settings in the Control window.
• To reproduce exact editor wrapping on Display2, avoid changing the app window sizes while editing.

SUPPORT & CONTACT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For license support or feature requests, contact:
Name: Songnam Saraphai
Email: songnam@apiu.edu
Phone: 061-580-2547

This documentation summarizes the built-in features as of the current release. For further assistance, open the Visual Editor and test auto-fit, grid, and projector rendering with your presentation content.`,
              buttons: ['OK']
            });
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
