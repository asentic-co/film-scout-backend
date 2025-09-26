FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 4000
CMD ["npm", "run", "dev"]

# Reset the entrypoint to default
ENTRYPOINT []

# Ensure the shell script is executable
RUN chmod +x data-update.sh