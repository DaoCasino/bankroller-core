FROM mhart/alpine-node:8

# MAINTAINER Alex Step <alex.step@dao.casino>

RUN apk add --no-cache make gcc g++ python git bash && \
npm i -g yarn && \
yarn global add nodemon babel-cli --ignore-engines --ignore-optional --ignore-platform --link-duplicates

COPY ./ /bankroller
WORKDIR /bankroller

# RUN npm i
RUN yarn --ignore-engines --ignore-optional --ignore-platform --link-duplicates
