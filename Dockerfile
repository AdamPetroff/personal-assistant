# syntax = docker/dockerfile:1

# Use Debian bullseye which has OpenSSL 3.0.x
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-bullseye-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 openssl

# Install node modules
COPY package.json ./
RUN npm install --include=dev

# Copy application code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 80
CMD [ "npm", "run", "start" ]
