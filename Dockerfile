FROM mhart/alpine-node:10

# MAINTAINER Alex Step <alex.step@dao.casino>

RUN apk add --no-cache make gcc g++ python git bash
RUN yarn global add nodemon babel-cli --ignore-engines --ignore-optional --ignore-platform --link-duplicates

COPY ./ /bankroller
WORKDIR /bankroller

RUN npm i
# RUN yarn --ignore-engines --ignore-optional --ignore-platform --link-duplicates

ENTRYPOINT ["sh","/bankroller/run_ropsten_env.sh"] 
