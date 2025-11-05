!macro customHeader
  ; Request Administrator privileges
  RequestExecutionLevel admin
  
  ; Set compression for better security
  SetCompressor /SOLID lzma
  SetCompressorDictSize 64
  
  ; Unicode support for international characters
  Unicode true
!macroend

!macro customInit
  ; Check if already running
  System::Call 'kernel32::CreateMutex(i 0, i 0, t "PurePresenterInstaller") i .r1 ?e'
  Pop $R0
  StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "The installer is already running."
    Abort
  
  ; Check Windows version (require Windows 10 or higher)
  ${If} ${AtLeastWin10}
    ; OK
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "PURE PRESENTER requires Windows 10 or higher."
    Abort
  ${EndIf}
  
  ; Check available disk space (require at least 2 GB)
  ${GetRoot} "$INSTDIR" $R0
  ${DriveSpace} "$R0\" "/D=F /S=M" $R1
  IntCmp $R1 2000 +3 +3 0
    MessageBox MB_OK|MB_ICONSTOP "Insufficient disk space. At least 2 GB is required."
    Abort
!macroend

!macro customInstall
  ; Write installation info to registry for security and uninstall
  WriteRegStr HKLM "Software\PURE PRESENTER" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\PURE PRESENTER" "Version" "${VERSION}"
  WriteRegDWORD HKLM "Software\PURE PRESENTER" "InstallDate" $R0
  
  ; Create Desktop Shortcut (always)
  CreateShortcut "$DESKTOP\PURE PRESENTER.lnk" "$INSTDIR\PURE PRESENTER.exe" "" "$INSTDIR\PURE PRESENTER.exe" 0
  
  ; Create Start Menu Shortcut
  CreateDirectory "$SMPROGRAMS\PURE PRESENTER"
  CreateShortcut "$SMPROGRAMS\PURE PRESENTER\PURE PRESENTER.lnk" "$INSTDIR\PURE PRESENTER.exe" "" "$INSTDIR\PURE PRESENTER.exe" 0
  CreateShortcut "$SMPROGRAMS\PURE PRESENTER\Uninstall PURE PRESENTER.lnk" "$INSTDIR\Uninstall PURE PRESENTER.exe"
  
  ; Set proper file permissions for security
  AccessControl::GrantOnFile "$INSTDIR" "(S-1-5-32-545)" "GenericRead + GenericExecute"
  
  ; Try to pin to Taskbar (Windows 10/11) - may require user permission
  nsExec::ExecToLog 'powershell -WindowStyle Hidden -Command "$$s=New-Object -ComObject Shell.Application;$$f=$$s.Namespace('''$INSTDIR''');$$i=$$f.ParseName('''PURE PRESENTER.exe''');$$i.InvokeVerb('''taskbarpin''')"'
  
  ; Add Windows Defender exclusion (optional, for performance)
  nsExec::ExecToLog 'powershell -WindowStyle Hidden -Command "Add-MpPreference -ExclusionPath '''$INSTDIR\PURE PRESENTER.exe''' -ErrorAction SilentlyContinue"'
!macroend

!macro customUnInstall
  ; Remove registry entries
  DeleteRegKey HKLM "Software\PURE PRESENTER"
  
  ; Remove Desktop Shortcut
  Delete "$DESKTOP\PURE PRESENTER.lnk"
  
  ; Remove Start Menu Shortcuts
  Delete "$SMPROGRAMS\PURE PRESENTER\PURE PRESENTER.lnk"
  Delete "$SMPROGRAMS\PURE PRESENTER\Uninstall PURE PRESENTER.lnk"
  RMDir "$SMPROGRAMS\PURE PRESENTER"
  
  ; Unpin from Taskbar
  nsExec::ExecToLog 'powershell -WindowStyle Hidden -Command "$$s=New-Object -ComObject Shell.Application;$$f=$$s.Namespace('''$INSTDIR''');$$i=$$f.ParseName('''PURE PRESENTER.exe''');$$i.InvokeVerb('''taskbarunpin''')"'
  
  ; Remove Windows Defender exclusion
  nsExec::ExecToLog 'powershell -WindowStyle Hidden -Command "Remove-MpPreference -ExclusionPath '''$INSTDIR\PURE PRESENTER.exe''' -ErrorAction SilentlyContinue"'
!macroend
