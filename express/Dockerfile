# Stage 1: Install and build the client
FROM node:latest AS client-builder
WORKDIR /app/client

# Copy client files and install dependencies
COPY client/package.json client/package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the client code and build it
COPY client/ .
RUN npm run build

# Stage 2: Install server dependencies and copy client build
FROM node:latest AS server
WORKDIR /app

# Copy server files and install server dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy server code and client build from the previous stage
COPY . .
COPY --from=client-builder /app/client/build ./client/build

# Expose server port and start the server
EXPOSE 5000
CMD ["node", "server.js"]
