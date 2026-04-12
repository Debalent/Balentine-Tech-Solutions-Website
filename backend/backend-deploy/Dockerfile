# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY . .

# Set default port
ENV PORT=3001

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]
