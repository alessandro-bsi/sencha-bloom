
$choco=(Get-Command -Name choco.exe -ErrorAction SilentlyContinue)

If(-not (Test-Path -Path $choco)){
    # Install Chocolatey
    Write-Host "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

    # Refresh environment variables to include Chocolatey
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
}

# Install Node.js using Chocolatey
Write-Host "Installing Node.js..."
choco install nodejs.install

Write-Host "Installing Ganache CLI..."
npm install -g ganache-cli
npm install -g windows-build-tools

Write-Host "Installing Ganache Desktop..."
Invoke-WebRequest "https://github.com/trufflesuite/ganache-ui/releases/download/v2.7.1/Ganache-2.7.1-win-x64.appx" -O "Ganache-2.7.1-win-x64.appx"

Write-Host "Installation complete!"

# Enable WSL feature
Write-Host "Enabling Windows Subsystem for Linux..."
wsl --install -d Ubuntu

# Wait for WSL installation to complete and Ubuntu to initialize
Start-Sleep -Seconds 30
