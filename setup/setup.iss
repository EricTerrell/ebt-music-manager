; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "EBT Music Manager"
#define MyAppVersion "1.0.57"
#define MyAppPublisher "Eric Bergman-Terrell"
#define MyAppURL "https://www.ericbt.com/"
#define MyAppExeName "ebt-music-manager.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{F26E4374-9943-49C3-8B61-100711170ACC}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest
OutputBaseFilename=EBT Music Manager Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern    
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\chrome_100_percent.pak"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\chrome_200_percent.pak"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\d3dcompiler_47.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\ebt-music-manager.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\ffmpeg.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\icudtl.dat"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\libEGL.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\libGLESv2.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\LICENSES.chromium.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\resources.pak"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\snapshot_blob.bin"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\v8_context_snapshot.bin"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\version"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\vk_swiftshader.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\vk_swiftshader_icd.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\vulkan-1.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\locales\*"; DestDir: "{app}\locales"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "C:\Users\erict\Documents\software development\ebt-music-manager-build\ebt-music-manager-win32-x64\resources\*"; DestDir: "{app}\resources"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\icon.ico"; 
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

