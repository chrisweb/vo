# vo

## development

install dependencies:

```shell
npm i
```

start dev server:

```shell
npm run dev
```

the project is currently a prototype so some dependencies are set to "canary" or "beta", so to update the package-lock.json it is recommended to run the update command (for example using install will not update canary version in the lock file):

```shell
npm update
```

### scripts

`npm run dev`: launch dev server (with turbopack)  
`npm run build`: production build  
`npm run build-debug`: production build with verbose output  
`npm run start`: start production server  
`npm run lint`: custom linting script  
`npm run lint-nocache`: linting without cache  
`npm run lint-debug`: linting with verbose output  
`npm run lint-fix`: linting with automatic fixing  
`npm run info`: next.js tool to get info about the project  
`npm run next-lint`: backup of the original next.js lint command (use "lint" instead)