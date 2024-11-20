#!/usr/bin/env bash

# Check location
if [ ! -f "truffle-config.js" ]; then
  echo "Please Execute from project root"
  exit 1
fi

# Parse command line for the RPC server flag
RPC_SERVER=""
while getopts ":s:" opt; do
  case $opt in
    s) RPC_SERVER="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done

# Update the system
sudo apt-get update

# Check if NPM is installed, install if it's not
if ! command -v npm &> /dev/null
then
    echo "(!) NPM not installed. Installing NPM..."
    curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
else
    echo "(+) NPM is already installed."
fi

# Check if Truffle is installed, install if it's not
if ! command -v truffle &> /dev/null
then
    echo "(!) Truffle not installed. Installing Truffle globally..."
    sudo npm install -g truffle
else
    echo "(+) Truffle is already installed."
fi

# Ask the user for the RPC server if not provided in command line
if [ -z "$RPC_SERVER" ]; then
  echo "Please enter the RPC server address (e.g., 127.0.0.1):"
  read -r RPC_SERVER

  # Validate if RPC_SERVER is not empty
  if [ -z "$RPC_SERVER" ]; then
    echo "RPC server address is required. Exiting."
    exit 1
  fi
fi

# Replace RPC server in truffle-config.js
sed -i "s/172.27.96.1/$RPC_SERVER/g" "truffle-config.js"
# Replace RPC server in autogen.js
sed -i "s/172.27.96.1/$RPC_SERVER/g" "client/src/common/autogen.js"

# Truffle compile contracts
truffle compile

# Truffle deploy contracts
truffle migrate

if [ ! -d "client" ]; then
  echo "(-) Client directory not found"
  exit 1
fi

# Enter client directory
pushd "client"

# Install dependencies
npm install

# Start Application
npm start

# Exit directory
popd

