FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm i

ENV PATH=/app/node_modules/.bin:$PATH

COPY . .

RUN npm run build

FROM nginx:alpine

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /var/www/html/
EXPOSE 80

ENTRYPOINT ["nginx","-g","daemon off;"]