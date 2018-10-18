FROM mhart/alpine-node:8

# MAINTAINER Alex Step <alex.step@dao.casino>

RUN apk add --no-cache make gcc g++ python git bash && \
    npm i -g yarn && \
    npm i -g ganache-cli@6.1.8 && \
    npm i -g truffle@beta && \
    yarn global add lerna && \
    npm i -g nodemon babel-cli typescript

COPY ./ /bankroller
WORKDIR /bankroller

RUN npm install ts-node

ENV DC_NETWORK=ropsten

ENTRYPOINT sh run.sh ${DC_NETWORK} src/index.ts
