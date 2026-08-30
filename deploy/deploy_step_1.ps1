<#
  EBT Music Manager
  (C) Copyright 2026, Eric Bergman-Terrell

  This file is part of EBT Music Manager.

    EBT Music Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    EBT Music Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with EBT Music Manager.  If not, see <http://www.gnu.org/licenses/>.
#>

Push-Location

c:

cd "C:\Users\erict\Documents\software development\ebt-music-manager"

$windows_setup_path = ".\setup\Output\EBT Music Manager Setup.exe"

if (Test-Path "$windows_setup_path")
{
    Remove-Item -Path "$windows_setup_path" -Force
}

Get-ChildItem -Path "C:\Users\erict\Documents\software development\ebt-music-manager-build" -Directory | Remove-Item -Recurse -Force
Remove-Item -Path "C:\Users\erict\Documents\software development\ebt-music-manager-build\*.zip" -Force

npm run build

Write-Host "Now run Inno Setup Compiler (load ebt-music-manager/setup.iss). Build/Compile."

Pop-Location
