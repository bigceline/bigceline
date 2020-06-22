FROM node:14.4.0

RUN mkdir /bigceline
COPY ./assets /bigceline/assets
COPY ./src /bigceline/src

WORKDIR /bigceline/src
RUN npm install 
