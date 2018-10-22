FROM mhart/alpine-node:10

# MAINTAINER Alex Step <alex.step@dao.casino>

RUN apk add --no-cache make gcc g++ python git bash && \
    npm i -g yarn && \
    yarn global add lerna && \
    npm i -g nodemon typescript

RUN export PLATFORM_ID=DC_CloudPlatform

COPY packages/bankroller-core /dc-monorepo/packages/bankroller-core
COPY packages/dc-configs /dc-monorepo/packages/dc-configs
COPY packages/dc-core /dc-monorepo/packages/dc-core
COPY packages/dc-ethereum-utils /dc-monorepo/packages/dc-ethereum-utils
COPY packages/dc-logging /dc-monorepo/packages/dc-logging
COPY packages/dc-messaging /dc-monorepo/packages/dc-messaging

WORKDIR /dc-monorepo

COPY package.json /dc-monorepo
COPY yarn.lock /dc-monorepo

RUN yarn install --production --pure-lockfile --non-interactive --cache-folder ./ycache; rm -rf ./ycache

WORKDIR /dc-monorepo/packages/bankroller-core

ENV DC_NETWORK=ropsten

ENTRYPOINT sh run.sh ${DC_NETWORK} lib/index.js
