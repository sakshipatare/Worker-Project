FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .

# Pass build arguments or environment vars if needed for VITE
RUN npm run build

# Production server
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
