const { app, dialog, shell } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

class AutoUpdater {
  constructor() {
    this.updateCheckUrl = 'https://api.github.com/repos/Songnamz/PURE_PRESENTER/releases/latest';
    this.currentVersion = app.getVersion();
    this.updateAvailable = false;
    this.latestVersion = null;
    this.downloadUrl = null;
    this.releaseNotes = null;
  }

  // Check for updates from GitHub releases
  async checkForUpdates(silent = false) {
    return new Promise((resolve, reject) => {
      console.log('Checking for updates...');
      console.log('Current version:', this.currentVersion);

      const options = {
        headers: {
          'User-Agent': 'PURE-PRESENTER'
        }
      };

      https.get(this.updateCheckUrl, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            
            // Check if there's a valid release
            if (!release || !release.tag_name) {
              console.log('No releases found on GitHub yet.');
              
              if (!silent) {
                dialog.showMessageBox({
                  type: 'info',
                  title: 'No Updates Available',
                  message: 'You are running the latest version!',
                  detail: `Current version: ${this.currentVersion}\n\nNo releases have been published on GitHub yet.`,
                  buttons: ['OK']
                });
              }
              
              resolve({
                available: false,
                version: this.currentVersion,
                noReleases: true
              });
              return;
            }
            
            this.latestVersion = release.tag_name.replace('v', '');
            this.releaseNotes = release.body || 'No release notes available.';

            console.log('Latest version:', this.latestVersion);

            // Find the installer asset
            const installerAsset = release.assets.find(asset => 
              asset.name.includes('Setup') && asset.name.endsWith('.exe')
            );

            if (installerAsset) {
              this.downloadUrl = installerAsset.browser_download_url;
            }

            // Compare versions
            if (this.isNewerVersion(this.latestVersion, this.currentVersion)) {
              this.updateAvailable = true;
              console.log('Update available!');
              
              if (!silent) {
                this.promptUpdate();
              }
              
              resolve({
                available: true,
                version: this.latestVersion,
                notes: this.releaseNotes,
                downloadUrl: this.downloadUrl
              });
            } else {
              this.updateAvailable = false;
              console.log('Already up to date.');
              
              if (!silent) {
                dialog.showMessageBox({
                  type: 'info',
                  title: 'No Updates Available',
                  message: 'You are running the latest version!',
                  detail: `Current version: ${this.currentVersion}`,
                  buttons: ['OK']
                });
              }
              
              resolve({
                available: false,
                version: this.currentVersion
              });
            }
          } catch (err) {
            console.error('Error parsing update info:', err);
            
            if (!silent) {
              dialog.showMessageBox({
                type: 'error',
                title: 'Update Check Failed',
                message: 'Failed to check for updates',
                detail: err.message,
                buttons: ['OK']
              });
            }
            
            reject(err);
          }
        });
      }).on('error', (err) => {
        console.error('Error checking for updates:', err);
        
        if (!silent) {
          dialog.showMessageBox({
            type: 'error',
            title: 'Update Check Failed',
            message: 'Could not connect to update server',
            detail: 'Please check your internet connection.',
            buttons: ['OK']
          });
        }
        
        reject(err);
      });
    });
  }

  // Compare version numbers
  isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    return false;
  }

  // Prompt user to update
  promptUpdate() {
    const response = dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update Available',
      message: `PURE PRESENTER ${this.latestVersion} is available!`,
      detail: `You are currently running version ${this.currentVersion}.\n\nRelease Notes:\n${this.releaseNotes}\n\nWould you like to download and install the update?`,
      buttons: ['Download & Install', 'View on GitHub', 'Later'],
      defaultId: 0,
      cancelId: 2
    });

    if (response === 0) {
      // Download & Install
      this.downloadAndInstall();
    } else if (response === 1) {
      // View on GitHub
      shell.openExternal('https://github.com/Songnamz/PURE_PRESENTER/releases/latest');
    }
  }

  // Download and install update
  async downloadAndInstall() {
    if (!this.downloadUrl) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Download Failed',
        message: 'No download URL available',
        buttons: ['OK']
      });
      return;
    }

    const tempDir = app.getPath('temp');
    const installerPath = path.join(tempDir, `PURE-PRESENTER-Setup-${this.latestVersion}.exe`);

    dialog.showMessageBox({
      type: 'info',
      title: 'Downloading Update',
      message: 'Downloading update...',
      detail: 'The installer will launch automatically when download completes.',
      buttons: ['OK']
    });

    console.log('Downloading update from:', this.downloadUrl);
    console.log('Saving to:', installerPath);

    const file = fs.createWriteStream(installerPath);

    https.get(this.downloadUrl, {
      headers: {
        'User-Agent': 'PURE-PRESENTER'
      }
    }, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('Download complete!');

        // Launch installer
        const installResponse = dialog.showMessageBoxSync({
          type: 'info',
          title: 'Update Ready',
          message: 'Update downloaded successfully!',
          detail: 'The installer will now launch. PURE PRESENTER will close automatically.',
          buttons: ['Install Now', 'Cancel'],
          defaultId: 0
        });

        if (installResponse === 0) {
          // Launch installer and quit app
          execFile(installerPath, [], (error) => {
            if (error) {
              console.error('Error launching installer:', error);
              dialog.showMessageBox({
                type: 'error',
                title: 'Installation Failed',
                message: 'Failed to launch installer',
                detail: error.message,
                buttons: ['OK']
              });
            }
          });

          // Quit the app after launching installer
          setTimeout(() => {
            app.quit();
          }, 1000);
        }
      });
    }).on('error', (err) => {
      fs.unlink(installerPath, () => {}); // Delete incomplete file
      console.error('Download error:', err);
      
      dialog.showMessageBox({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download update',
        detail: err.message,
        buttons: ['OK']
      });
    });
  }

  // Check for updates on startup (silent)
  checkOnStartup() {
    // Wait 5 seconds after app starts, then check silently
    setTimeout(() => {
      this.checkForUpdates(true).catch(err => {
        console.error('Startup update check failed:', err);
      });
    }, 5000);
  }
}

module.exports = AutoUpdater;
