### Env files
One for authorities `.env.authority` and one for client `.env.client`.

To generate new .env files for 2 authorities (or more) run: 

`yarn start:generate 2`

### Run 2 authorities:
`docker build -t authority-image:latest .`

`docker compose up`

### Run a client:
`yarn install`

`start:client`

Remember to init user (that will get amount 10 as default)