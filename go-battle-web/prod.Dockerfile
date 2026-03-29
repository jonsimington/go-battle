FROM node:lts

COPY ./go-battle-web /usr/src/app/go-battle-web

WORKDIR /usr/src/app/go-battle-web

RUN npm install

# Build-time env vars for Vite (baked into the bundle at build time)
ARG VITE_API_URL
ARG VITE_CERVEAU_URL
ARG VITE_VIS_URL
ARG VITE_CERVEAU_WS_SERVER
ARG VITE_CERVEAU_WS_PORT=443

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CERVEAU_URL=$VITE_CERVEAU_URL
ENV VITE_VIS_URL=$VITE_VIS_URL
ENV VITE_CERVEAU_WS_SERVER=$VITE_CERVEAU_WS_SERVER
ENV VITE_CERVEAU_WS_PORT=$VITE_CERVEAU_WS_PORT

# Build for production.
RUN npm run build

# Install `serve` to run the application.
RUN npm install -g serve

EXPOSE 3000

CMD serve -s dist -l 3001
