# Use an official Node.js runtime as a parent image
FROM node:alpine AS builder

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm ci --omit=dev # Install only production dependencies.  Optimized for speed.

# Copy the project source code
COPY . .

# Build the TypeScript application
RUN npm run build

# --- Second Stage:  Production Image ---

FROM node:alpine

# Metadata - good practice
LABEL maintainer="Hlofiys <hlofiys@gmail.com>"
LABEL org.opencontainers.image.source="https://github.com/Hlofiys/bsac-chatbot"


# Set working directory in the container
WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/context.txt ./
# Copy other necessary files that were created at build step.
COPY --from=builder /app/node_modules ./node_modules

# Expose the port your app runs on (if applicable)
# Check your application and uncomment to expose port.
EXPOSE 3000 

# Define environment variable
ENV NODE_ENV=production

# Run the app when the container launches
CMD ["npm", "start"]

# Alternative command, more explicit and reliable, especially if 'start' has complex logic:
# CMD ["node", "dist/index.js"]