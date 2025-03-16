# Use a custom version of Node.js
FROM node:23.6.1-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock files to install dependencies
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application files
COPY . .

# Expose the default application port
EXPOSE 3000
EXPOSE 3001
EXPOSE 3002
EXPOSE 3002
EXPOSE 3003
EXPOSE 3004



# Default command to start the application
CMD ["yarn", "start:authority"]