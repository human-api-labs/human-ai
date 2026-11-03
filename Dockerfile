FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY llms.txt openapi.yaml robots.txt sitemap.xml ard.json agent.json server.json ./
COPY .well-known ./.well-known
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "src/server.js"]
