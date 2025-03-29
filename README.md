# V.O.

## development

Install the dependencies:

```shell
deno install
```

First, run the development server:

```shell
deno task dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result

## formatting

formatting on save is enabled in vscode

to disable it edit the [vscode settings file](./.vscode/settings.json) and set the "editor.formatOnSave" option to false

> [!NOTE]  
> formatting configuration is done in [deno configuration file](./deno.jsonc)

## linting

to start the linting process:

```shell
deno lint
```

> [!NOTE]  
> the linting configuration is done in [deno configuration file](./deno.jsonc)
