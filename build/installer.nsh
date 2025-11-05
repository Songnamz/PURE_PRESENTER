!macro customInstall
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
  ; Remove Desktop Shortcut
  Delete "$DESKTOP\PURE PRESENTER.lnk"
  
  ; Remove Start Menu Shortcuts
  Delete "$SMPROGRAMS\PURE PRESENTER\PURE PRESENTER.lnk"
  Delete "$SMPROGRAMS\PURE PRESENTER\Uninstall PURE PRESENTER.lnk"
  RMDir "$SMPROGRAMS\PURE PRESENTER"
  
  ; Unpin from Taskbar
  nsExec::ExecToLog 'powershell -WindowStyle Hidden -Command "$$s=New-Object -ComObject Shell.Application;$$f=$$s.Namespace('''$INSTDIR''');$$i=$$f.ParseName('''PURE PRESENTER.exe''');$$i.InvokeVerb('''taskbarunpin''')"'
!macroend
