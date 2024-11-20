# PowerShell Script to Install CA and Modify Hosts (Static)

# Check if the user has administrator privileges
$IsElevated = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsElevated) {
    Write-Host "This script requires Administrator privileges. Please run PowerShell as Administrator."
    exit 1
}

# Static configuration for IP and domain names
$hostsEntries = @(
    @{ip="127.0.0.1"; domain="ganache.ssi.local"},
    @{ip="127.0.0.1"; domain="react-app.ssi.local"},
    @{ip="127.0.0.1"; domain="ipfs.ssi.local"},
    @{ip="127.0.0.1"; domain="mongodb.ssi.local"}
)

# Path to the CA certificate (assuming DER format, modify if PEM)
$caCertPath = "data/nginx/certs/ca_certificate.pem"
$certFormat = "DER"  # Adjust to "PEM" if necessary

# Install CA certificate
if ($certFormat -eq "PEM") {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $cert.Import($caCertPath)
} elseif ($certFormat -eq "DER") {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($caCertPath)
} else {
    Write-Host "Invalid certificate format. Use 'PEM' or 'DER'."
    exit 1
}

# Add the certificate to the trusted root store
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "LocalMachine"
$store.Open("ReadWrite")
$store.Add($cert)
$store.Close()

Write-Host "CA certificate installed successfully."

# Update hosts file
$hostsPath = "C:\Windows\System32\Drivers\etc\hosts"

foreach ($entry in $hostsEntries) {
    $ipAddress = $entry.ip
    $domainName = $entry.domain
    $hostEntry = "$ipAddress`t$domainName"

    if (-not (Select-String -Pattern $domainName -Path $hostsPath)) {
        Add-Content -Path $hostsPath -Value $hostEntry
        Write-Host "Added entry to hosts file: $hostEntry"
    } else {
        Write-Host "Entry for $domainName already exists."
    }
}
