# Gamma, by [Teleport](https://goteleport.com)

_**G**ithub **A**ctions **M**onorepo **M**agic **A**utomation_

Gamma is a tool that sets out to solve a few shortcomings when it comes to managing and maintaining multiple GitHub actions.

## What does it do?

- 🚀 No more including the compiled source code in your commits
- 🚀 Automatically build all your actions into individual, publishable repos 
- 🚀 Share schema definitions between actions
- 🚀 Version all actions separately

Gamma allows you to have a monorepo of actions that are then built and deployed into individual repos. Having each action in its own repo allows for the action to be published on the Github Marketplace.

Gamma also goes further when it comes to sharing common `action.yml` attributes between actions. Actions in your monorepo can extend upon other YAML files and bring in their `inputs`, `branding`, etc - reducing code duplication and making things easier to maintain.

## How to use

This assumes you're using `yarn` with workspaces. Each workspace is an action.

Your root `package.json` should look like:

```json
{
  "name": "actions-monorepo",
  "private": true,
  "workspaces": [
    "actions/*"
  ]
}
```

Each action then lives under the `actions/` directory. 

Each action should be able to be built via `yarn build`. We recommend [ncc](https://github.com/vercel/ncc) for building your actions. The compiled source code should end up in a `dist` folder, relative to the action. You should add `dist/` to your `.gitignore`.

`actions/example/package.json`

```json
{
  "name": "example",
  "version": "1.0.0",
  "repository": "https://github.com/mono-actions/example.git",
  "scripts": {
    "build": "ncc build ./src/index.ts -o dist"
  },
  "dependencies": {
    "@actions/core": "^1.10.0"
  },
  "devDependencies": {
    "@types/node": "^18.8.2",
    "@vercel/ncc": "^0.34.0",
    "typescript": "^4.8.4"
  }
}
```

The `repository` field is where the compiled action will deployed to.

`actions/example/action.yml`

This is where Gamma can really shine. You can define your `action.yml` as normal, whilst also extending on other YAML files for common attributes.

```yaml
name: Example Action
description: This is an example action
extend:
  - from: '@/shared/common.yml'
    include:
      - field: inputs
        include:
          - version
      - field: runs
      - field: author
      - field: branding
```

`@/` refers to the root of the directory. `@/shared/common.yml` would resolve to `shared/common.yml`, which can look like this:

`shared/common.yml`

```yaml
author: Gravitational, Inc.
inputs:
  version:
    required: true
    description: 'Specify the version without the preceding "v"'
branding:
  icon: terminal
  color: purple
runs:
  using: node16
  main: dist/index.js
```

Gamma will compile this and publish the final `action.yml` to the correct repository.

`github.com/mono-actions/example/action.yml`

```yaml
name: Example Action
description: This is an example action
author: Gravitational Inc.
inputs:
    version:
        description: Specify the version without the preceding "v"
        required: true
runs:
    using: node16
    main: dist/index.js
branding:
    icon: terminal
    color: purple
```

The built source code will also be committed, so you end up with a publishable Github Action.

## Setup

Gamma itself is a Github Action that you can use in your workflows.

You will need to [create a Github Application](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app) for Gamma to use. This should have write access to all the repos that you are deploying to.

You'll need to install your application in the organisation, and grab the installation number.

Gamma requires the following environment variables. You should set these as secrets in the repo, and pass them through in the workflow configuration.

**NOTE:** You can't prefix secrets with `GITHUB_` - you can use something like `GH_` instead.

`GITHUB_APP_INSTALLATION_ID` 

Once you've installed the app to your organisation, you can find this in the URL

It'll look something like https://github.com/organizations/mono-actions/settings/installations/31502012

You'll want to take `31502012` from the URL.

`GITHUB_APP_ID`

This is the "App ID" in the Github Application's settings.

`GITHUB_APP_PRIVATE_KEY`

When you create your application, you'll be prompted to create a private key. Copy the contents into the secret field.

### Deployment

Once your Github application has been created and the secrets have been set in your monorepo, you can use Gamma in your workflow.

Here's an example configuration for deploying the actions on a commit into `main`.

`.github/workflows/deploy.yml`

```yaml
name: Deploy actions

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Make sure you set this, as Gamma needs the Git history

      - uses: actions/setup-node@v3
        
      - uses: gravitational/setup-gamma@v1

      - run: yarn # Install your dependencies as normal

      - run: yarn test # Test your actions, if you have tests

      - name: Deploy actions
        run: gamma deploy
        env:
          GITHUB_APP_INSTALLATION_ID: ${{ secrets.GH_APP_INSTALLATION_ID }}
          GITHUB_APP_ID: ${{ secrets.GH_APP_ID }}
          GITHUB_APP_PRIVATE_KEY: ${{ secrets.GH_APP_PRIVATE_KEY }}
```

Gamma will check what files have changed from HEAD and the previous commit. For this reason, you should only use squash & merge when merging pull requests.

Once it's detected the changed files, it'll check which actions have file changes and only build and deploy the changes needed.

Gamma mirrors the commit message - if you commit to the monorepo a message such as `"Update the README to add an example"`, it'll commit to the destination repository with the same commit message.

### Testing pull requests

It's also important to check that Gamma can build the action and compile the `action.yml` for pull requests. To do this, you can use the `gamma build` command instead.

`.github/workflows/build.yml`

```yaml
name: Build actions

on:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Make sure you set this, as Gamma needs the Git history

      - uses: actions/setup-node@v3

      - uses: gravitational/setup-gamma@v1

      - run: yarn # Install your dependencies as normal
        
      - run: yarn test # Test your actions, if you have tests

      - name: Build actions
        run: gamma build
```
