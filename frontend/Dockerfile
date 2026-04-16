# ── Stage 1: Build the React app ──────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first (layer cache-friendly)
COPY package*.json ./
RUN npm ci

# Copy source and build for production
COPY . .

# VITE_API_URL is injected at build time by Docker --build-arg
# In CI/CD, this is set to the Elastic Beanstalk or EC2 public URL
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


# ── Stage 2: Serve the built dist/ with nginx ──────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx placeholder
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# nginx config: port 3000, SPA-friendly routing, aggressive static asset caching
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # SPA routing — return index.html for any unknown paths\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Cache hashed assets forever\n\
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # Security hardening\n\
    server_tokens off;\n\
    add_header X-Content-Type-Options "nosniff";\n\
    add_header X-Frame-Options "SAMEORIGIN";\n\
    add_header X-XSS-Protection "1; mode=block";\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
