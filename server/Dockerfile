# Express + Socket.io backend (TypeScript — compiled to dist/ in a build stage).
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
# Upload target (also provided as a volume in compose so files persist).
RUN mkdir -p uploads

EXPOSE 4000
CMD ["npm", "start"]
