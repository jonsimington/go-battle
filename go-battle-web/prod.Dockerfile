FROM node:lts

COPY ./go-battle-web /usr/src/app/go-battle-web

WORKDIR /usr/src/app/go-battle-web

RUN npm install

# Build for production.
RUN npm run build --production

# Install `serve` to run the application.
RUN npm install -g serve

EXPOSE 3000

CMD serve -s build -l 3001
