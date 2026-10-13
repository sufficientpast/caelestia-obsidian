import { App, PluginSettingTab, Setting, Platform, Notice } from 'obsidian';
import type ExternalStyleWatcher from './main';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

export interface ExternalStyleSettings {
	customPath: string;
	themePreset: string;
}

export const DEFAULT_SETTINGS: ExternalStyleSettings = {
	customPath: '.local/state/caelestia/theme/obsidian.css',
	themePreset: 'preset-1',
};

export const PRESET_FILES: Record<string, string> = {
	'preset-1': 'presets/preset-1.css',
	'preset-2': 'presets/preset-2.css',
	'preset-3': 'presets/preset-3.css',
};

const execAsync = promisify(exec);

export default class ExternalStyleSettingTab extends PluginSettingTab {
	plugin: ExternalStyleWatcher;

	constructor(app: App, plugin: ExternalStyleWatcher) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async absoluteOverwriteFile(
		srcRelativePath: string,
		destRelativePath: string,
	): Promise<boolean> {
		if (!Platform.isDesktopApp) return false;

		try {
			const home = process.env.HOME || os.homedir();

			const adapter = this.app.vault.adapter;
			const vaultBasePath =
				'getBasePath' in adapter &&
				typeof (adapter as Record<string, unknown>).getBasePath ===
					'function'
					? (adapter as { getBasePath: () => string }).getBasePath()
					: '';

			const fullSrcPath = path.join(
				vaultBasePath,
				this.plugin.manifest.dir ?? '',
				srcRelativePath,
			);

			const fullDestPath = destRelativePath.startsWith('/')
				? destRelativePath
				: path.join(home, destRelativePath);

			const destDir = path.dirname(fullDestPath);
			await fs.promises.mkdir(destDir, { recursive: true });

			await fs.promises.copyFile(fullSrcPath, fullDestPath);
			await this.createThemeFromTemplate();
			return true;
		} catch (err) {
			console.error('Failed to copy preset file:', err);
			return false;
		}
	}

	async createThemeFromTemplate(): Promise<void> {
		if (process.platform !== 'linux') return;

		try {
			const { stdout } = await execAsync(
				'/usr/bin/caelestia scheme set -n dynamic',
			);
			new Notice(`Output: ${stdout}`);
		} catch (error) {
			console.error('Command failed:', error);
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Caelestia').setHeading();

		let pathSetting: Setting;

		new Setting(containerEl)
			.setName('Theme preset')
			.setDesc(
				'Select a preset or choose custom to use your own CSS file path.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('preset-1', 'Preset 1')
					.addOption('preset-2', 'Preset 2')
					.addOption('preset-3', 'Preset 3')
					.addOption('custom', 'Custom path')
					.setValue(this.plugin.settings.themePreset)
					.onChange(async (value) => {
						this.plugin.settings.themePreset = value;
						await this.plugin.saveSettings();

						if (value !== 'custom') {
							const presetFile =
								PRESET_FILES[value] ??
								PRESET_FILES['preset-1'] ??
								'';
							await this.absoluteOverwriteFile(
								presetFile,
								'.config/caelestia/templates/obsidian.css',
							);
						}

						pathSetting.setDisabled(value !== 'custom');
					}),
			);

		pathSetting = new Setting(containerEl)
			.setName('Custom CSS file path')
			.setDesc('Absolute path or relative path from your home directory.')
			.setDisabled(this.plugin.settings.themePreset !== 'custom')
			.addText((text) =>
				text
					.setPlaceholder('.local/state/caelestia/theme/obsidian.css')
					.setValue(this.plugin.settings.customPath)
					.onChange(async (value) => {
						this.plugin.settings.customPath = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName('About & credits').setHeading();

		new Setting(containerEl)
			.setName('GitHub repository')
			.setDesc('Report issues, feature request and uh pr in GitHub repo.')
			.addButton((btn) =>
				btn
					.setButtonText('GitHub')
					.setCta()
					.onClick(() => {
						window.open(
							'https://github.com/sufficientpast/caelestia-obsidian',
							'_blank',
						);
					}),
			);

		const thankYouEl = containerEl.createDiv({
			cls: 'style-watcher-thankyou',
		});
		thankYouEl.createEl('p', {
			text: 'Bwaaaaaaaaahhhh </3',
		});
	}
}
