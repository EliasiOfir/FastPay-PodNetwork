# Use Node.js LTS as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and yarn.lock for installing dependencies
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose a port dynamically via environment variables
# Note: Expose port 3000 as a fallback for development
EXPOSE 3000

# Command to run the application and pass the PORT dynamically
CMD ["sh", "-c", "yarn start --port $PORT"]