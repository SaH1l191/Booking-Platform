FROM node:20

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install

COPY . .

EXPOSE 3002

CMD ["npm", "run", "dev"]