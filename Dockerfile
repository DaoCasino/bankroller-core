FROM mhart/alpine-node:10

# MAINTAINER Alex Step <alex.step@dao.casino>

RUN apk add --no-cache make gcc g++ python git bash nano
RUN npm i -g nodemon babel-cli

COPY ./ /bankroller
WORKDIR /bankroller

RUN npm i
# RUN yarn --ignore-engines --ignore-optional --ignore-platform --link-duplicates

ENTRYPOINT ["sh","/bankroller/run_ropsten_env.sh"]
