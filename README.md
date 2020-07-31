# TLDR
[![CircleCi](https://circleci.com/gh/techaid-tech/techaid-dashboard.svg?style=svg)](https://circleci.com/gh/techaid-tech/techaid-dashboard.svg?style=svg)

This repo is the source for the UI provided at https://lambeth-techaid.ju.ma/

```bash
# Ensure you have installed nodejs and NPM locally
# Install Node Version Manager / Install Node Version >= 12
# Install angular-cli
npm install -g @angular/cli
nvm install 14
nvm use 14
# You will need to have the api running locally on localhost 
ng serve 
```

# Upgrade Angular CLI
## Upgrade NPM
    Download updated package from https://registry.npmjs.org/npm/-/npm-${version}.tgz
    Unpack and copy to the original npm location. 
    run npm -v to verify its updated

## Upgrade Angular CLI
View update site to ensure the steps match the ones outlined below https://update.angular.io/

```bash
    npm uninstall -g angular-cli
    npm cache verify
    # In your current directory with node_modules
    rm -rf node_modules
    npm uninstall --save-dev angular-cli
    npm install --save-dev @angular/cli@latest
    npm install
    # Use ng update to show possible app updates
    ng update 
    ng update --all --force 
    # Verify update
    ng update
    # Update this readme
```
## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
