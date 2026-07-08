# Express + Socket.io backend (plain Node, CommonJS — no build step).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
# Upload target (also provided as a volume in compose so files persist).
RUN mkdir -p uploads

EXPOSE 4000
CMD ["npm", "start"]
