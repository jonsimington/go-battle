FROM node:lts

COPY ./go-battle-web /usr/src/app/go-battle-web

WORKDIR /usr/src/app/go-battle-web

RUN npm install

# Build for production.
RUN npm run build

# Install `serve` to run the application.
RUN npm install -g serve

EXPOSE 3000

CMD serve -s dist -l 3001
