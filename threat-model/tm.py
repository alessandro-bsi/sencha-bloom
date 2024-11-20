from pytm import TM, Boundary, Server, Datastore, Actor, Dataflow

tm = TM("Sencha Bloom")

# Trust Boundaries
docker_network = Boundary("Docker Network")
user_boundary = Boundary("User Boundary")
blockchain_boundary = Boundary("Blockchain Boundary")

# Actors
user = Actor("User", inBoundary=user_boundary)

# Servers and Services
ganache = Server("Ganache Blockchain", inBoundary=blockchain_boundary)
react_app = Server("React Application (Express)", inBoundary=docker_network)
nginx_proxy = Server("Nginx Proxy", inBoundary=docker_network)
mongo_db = Datastore("MongoDB", inBoundary=docker_network, sensitive=True)
ipfs_node = Server("IPFS Node", inBoundary=docker_network)
secrets_service = Server("Secrets Service", inBoundary=docker_network, sensitive=True)

# Server Attributes
react_app.protocol = "HTTPS"
nginx_proxy.protocol = "HTTPS"
mongo_db.encrypted_at_rest = True
ipfs_node.encrypted_at_rest = False

# Dataflows
# User Interaction through React App
Dataflow(user, nginx_proxy, "User accesses React app", protocol="HTTPS")
Dataflow(nginx_proxy, react_app, "Nginx proxies requests to React app", protocol="HTTPS")
Dataflow(nginx_proxy, secrets_service, "Nginx proxies requests to Secrets Service", protocol="HTTPS")
Dataflow(nginx_proxy, ipfs_node, "Nginx proxies requests to IPFS Gateway", protocol="HTTPS")
Dataflow(nginx_proxy, ganache, "Nginx proxies requests to Ganache Blockchain", protocol="HTTPS")

# React App as a Middle Layer
Dataflow(react_app, secrets_service, "React app communicates with Secrets Service", protocol="HTTP")

# Verification and Secrets Services to Datastore
Dataflow(secrets_service, mongo_db, "Secrets service stores shared-secret data", protocol="MongoDB")

# Blockchain Interactions
Dataflow(secrets_service, ganache, "Secrets service interacts with blockchain", protocol="HTTP")

# Outputs the model
tm.process()
