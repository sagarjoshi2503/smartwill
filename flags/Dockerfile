FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY flags.ts server.ts ./

EXPOSE 8020

CMD ["npx", "tsx", "server.ts"]
