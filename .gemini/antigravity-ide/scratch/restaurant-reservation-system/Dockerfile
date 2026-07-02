# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependency declarations
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source files and build
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Serve Backend & Static Frontend ---
FROM node:20-alpine AS runner
WORKDIR /app

# Set node environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --only=production

# Copy backend source
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Cloud Run uses PORT env, defaulting here to 8080)
EXPOSE 8080

# Run backend server
CMD ["node", "backend/server.js"]
