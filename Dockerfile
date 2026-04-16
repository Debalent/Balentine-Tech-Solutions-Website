# ── Stage 1: no build step needed for plain HTML/CSS/JS ───────────────────────
# If you later add a React build, add a build stage here first.

FROM nginx:1.27-alpine

# Remove the default nginx placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy the entire frontend source into the nginx serving directory
COPY index.html   /usr/share/nginx/html/
COPY styles.css   /usr/share/nginx/html/
COPY script.js    /usr/share/nginx/html/
COPY assets/      /usr/share/nginx/html/assets/

# Custom nginx config: serve on port 3000, route all 404s back to index.html
# so client-side navigation (if added) works correctly
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Serve static files; fall back to index.html for SPA routing\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Cache static assets aggressively\n\
    location ~* \\.(css|js|jpg|jpeg|png|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # Disable nginx version in error pages\n\
    server_tokens off;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
