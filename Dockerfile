FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY server.js ./
COPY public ./public

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
