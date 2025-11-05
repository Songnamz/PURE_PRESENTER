# Build as Administrator

To build the portable .exe file, you need to run the build with Administrator privileges.

## How to Build

1. Right-click on `build-portable.ps1`
2. Select "Run with PowerShell"
3. If prompted for Administrator access, click "Yes"
4. Wait for the build to complete

The portable .exe file will be created in the `dist` folder as:
`PURE-PRESENTER-1.0.0-portable.exe`

## Why Administrator Rights?

Windows requires Administrator privileges to create symbolic links, which electron-builder uses during the build process. Without these privileges, the build will fail with symbolic link errors.

## Troubleshooting

If you still see errors:
- Make sure you're running PowerShell as Administrator
- Try running: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- Then run: `npm run build:portable`
