FROM node:lts

COPY ./go-battle-web .

WORKDIR /usr/src/app/go-battle-web

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
