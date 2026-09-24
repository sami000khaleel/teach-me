FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Install frontend dependencies (cached layer)
COPY browser/package*.json ./
RUN npm install

# Copy frontend source and build
COPY browser/ .
RUN npm run build

# ---------------------------------------------------------------------
# Stage 2 — Backend runtime + static frontend
# ---------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

# Native build deps (for optional native modules)
RUN apk add --no-cache python3 make g++

# Install backend dependencies (cached layer)
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY server/ .

# Copy built frontend from stage 1 into the backend's /dist
COPY --from=frontend-builder /frontend/dist ./dist

# Create runtime directories
RUN mkdir -p images lectures snapshots uploads

# Expose HTTP port
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]