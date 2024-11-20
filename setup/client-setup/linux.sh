#!/bin/bash

# Bash Script to Install CA and Modify Hosts (Static)

# Check if the user is root (or running with sudo)
if [[ "$EUID" -ne 0 ]]; then
   echo "This script must be run as root. Please run with sudo."
   exit 1
fi

# Static configuration for IP and domain names
HOSTS_ENTRIES=(
    "127.0.0.1 ganache.ssi.local"
    "127.0.0.1 react-app.ssi.local"
    "127.0.0.1 ipfs.ssi.local"
    "127.0.0.1 mongodb.ssi.local"
)

# Path to CA certificate (adjust if PEM is required)
CA_CERT_PATH="data/nginx/certs/ca_cert.der"
CERT_FORMAT="DER"  # Can be "PEM" if necessary

# Install CA certificate
if [ "$CERT_FORMAT" == "PEM" ]; then
    cp "$CA_CERT_PATH" /usr/local/share/ca-certificates/ca_cert.crt
elif [ "$CERT_FORMAT" == "DER" ]; then
    openssl x509 -inform DER -in "$CA_CERT_PATH" -out /usr/local/share/ca-certificates/ca_cert.crt
else
    echo "Invalid certificate format. Use 'PEM' or 'DER'."
    exit 1
fi

# Update CA store
update-ca-certificates
echo "CA certificate installed successfully."

# Update /etc/hosts file
HOSTS_FILE="/etc/hosts"

for entry in "${HOSTS_ENTRIES[@]}"; do
    IP=$(echo "$entry" | cut -d' ' -f1)
    DOMAIN=$(echo "$entry" | cut -d' ' -f2)

    if ! grep -q "$DOMAIN" "$HOSTS_FILE"; then
        echo "$entry" >> "$HOSTS_FILE"
        echo "Added entry to hosts file: $entry"
    else
        echo "Entry for $DOMAIN already exists."
    fi
done
