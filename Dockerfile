FROM node:12.20.0-alpine3.10  as builder

ARG CONFIGURATION=prod

COPY ./ /app
WORKDIR /app 
RUN npm install
RUN npm run build-${CONFIGURATION}

FROM nginx:1.19.6-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
WORKDIR /usr/share/nginx/html
EXPOSE 80
COPY ./nginx.conf /etc/nginx/templates/default.conf.template
