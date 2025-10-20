// Helper script to delete license file from this device
const fs = require('fs');
const path = require('path');
const os = require('os');

const LICENSE_FILE = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'AIU-CHURCH-PRESENTER',
  'license.dat'
);

function deleteLicenseFile() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      fs.unlinkSync(LICENSE_FILE);
      return { success: true, message: 'License file deleted successfully' };
    } else {
      return { success: false, message: 'No license file found to delete' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Output JSON for PowerShell to parse
const result = deleteLicenseFile();
console.log(JSON.stringify(result));
