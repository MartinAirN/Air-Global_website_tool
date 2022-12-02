# Air-Global website tool
Node.js website generator and hoster for a Photography website.

Using (See examples/):
1. A `config.json` with your sites content and folder structure.
2. A `Air-Global.sitestructure` file containing the names of `div`s and other classes.
3. Image folders and photos.


Run using docker-compose:
```
version: "3.4"

services:
  airglobal_nodejs:
    container_name: airglobal_nodejs
    image: nikolaik/python-nodejs
    restart: always
    user: "pn"
    working_dir: /home/pn/app
    environment:
      - NODE_ENV=production
    volumes:
      - airglobal_nodejs_data:/home/pn/app
    command: sh -c "npm install && npm start"
    ports:
      - 8081:8081
```