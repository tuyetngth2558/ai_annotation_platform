# Web (React + Vite) — dev image.
# Context build: src/frontend/web
FROM node:20-alpine

WORKDIR /app

# Cài deps trước để tận dụng cache
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173
# --host để Vite lắng nghe ngoài container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
