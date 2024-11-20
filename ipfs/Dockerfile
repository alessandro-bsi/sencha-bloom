# Use the official IPFS image from Docker Hub
FROM ipfs/kubo:latest

# Expose the IPFS daemon ports
EXPOSE 4001 5001 8080

# Initialize IPFS repository and start the IPFS daemon
ENTRYPOINT ["sh", "-c", "if [ ! -f /data/ipfs/config ]; then ipfs init; ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001; ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/9001;  fi && ipfs daemon --migrate=true"]
