# Caelestia Obsidian

A simple obsidian plugin that let's you switch between different dynamic theme that syncs with your [**Caelestia**](https://github.com/caelestia-dots/shell) setup.

> [!CAUTION]
> This project is still under development.

## Installation

Install the latest zip/tar.gz file from [release](https://github.com/sufficientpast/caelestia-obsidian/releases)
and unzip it in your Obsidian Vault's plugin directory.

### For .zip

```sh
bsdtar -xf caelestia-plugin.zip -C /absolute/path/to/vault/.obsidian/plugins/
```

### For .tar.gz

```sh
tar -xzf caelestia-plugin.tar.gz -C /absolute/path/to/vault/.obsidian/plugins/
```

> [!NOTE]
> As of now, there are no plans for this plugin to be in Obsidian's Community plugin list.

## Local Development

- Clone this repo.
- Make sure your NodeJS is at least v18 (`node --version`).
- `npm i` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Credits

- Our pretty members of [Caelestia nexus](https://caelestiashell.com/discord) for giving me a reason and feedback.
- Obsidian team for creating the [sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) and [documentation](https://docs.obsidian.md/Home).
