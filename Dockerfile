FROM nginx:1.15.12
WORKDIR /usr/share/nginx/html
COPY ./dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/server.conf
