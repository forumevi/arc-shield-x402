FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
