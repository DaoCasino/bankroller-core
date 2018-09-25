FROM mhart/alpine-node:8

# MAINTAINER Alex Step <alex.step@dao.casino>

RUN apk add --no-cache make gcc g++ python git bash && \
    npm i -g yarn nodemon babel-cli

RUN mkdir /bankroller
WORKDIR /bankroller

RUN git clone https://github.com/DaoCasino/bankroller-core . && \
    git checkout develop && \
    git pull

RUN npm i

CMD ["sh", "run_ropsten_env.sh"]
