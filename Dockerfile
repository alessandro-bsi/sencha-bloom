# Dockerfile Contract

# Use an official Node runtime as a parent image
FROM node:latest

# Set the working directory
WORKDIR /compiler

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install -g truffle

RUN npm install

# Copy the app source code to the container
COPY . .

# Build the app
RUN truffle compile

# Set the command to start the app
CMD ["truffle", "migrate"]

