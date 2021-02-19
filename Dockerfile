# For the building env
FROM node:current-slim as builder

ARG PAT
ENV PAT=${PAT}
RUN export PAT=$PAT
RUN echo $PAT

RUN mkdir -p /app
WORKDIR /app

COPY ./.npmrc ./
COPY ./package*.json ./
RUN npm install
RUN rm ./.npmrc

RUN npm run test:ci

COPY . ./
RUN npm run build:prod

# For building the prod container with the transpalied js
FROM node:current-slim

WORKDIR /usr/src/app

COPY --from=builder /app/node_modules/ /usr/src/app/node_modules/
COPY --from=builder /app/dist/ /usr/src/app/dist/
COPY --from=builder /app/package*.json /usr/src/app/

EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]