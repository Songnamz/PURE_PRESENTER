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
  
  ; Try to pin to Taskbar (Windows 10/11) - may require user permission
  nsExec::ExecToLog 'powershell -WindowStyle Hidden -Command "$$s=New-Object -ComObject Shell.Application;$$f=$$s.Namespace('''$INSTDIR''');$$i=$$f.ParseName('''PURE PRESENTER.exe''');$$i.InvokeVerb('''taskbarpin''')"'
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
!macroend
