# Installs the Super Prototyping app and opens it; the app links the skills and installs sp,
# refkit and artgen on launch. Safe to run again. Windows; install.sh is macOS's.
# See ../references/install.md.
$ErrorActionPreference = "Stop"
$exe = "$env:LOCALAPPDATA\Programs\super-prototyping-desktop\Super Prototyping.exe"
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { irm https://astral.sh/uv/install.ps1 | iex }
if (-not (Test-Path $exe)) {
  $assets = (irm https://api.github.com/repos/ReScienceLab/super-prototyping/releases/latest).assets
  $setup = "$env:TEMP\super-prototyping-setup.exe"
  iwr ($assets | ? name -like "*.exe" | select -First 1).browser_download_url -OutFile $setup
  Start-Process $setup /S -Wait
}
Start-Process $exe
