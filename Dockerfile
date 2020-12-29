FROM node:12.20.0-alpine3.10  as builder
COPY ./ /app
WORKDIR /app 
RUN npm install
RUN npm run --prefix /app build 

FROM nginx:1.15.12
COPY --from=builder /app/dist /usr/share/nginx/html
WORKDIR /usr/share/nginx/html
EXPOSE 80
