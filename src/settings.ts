import {
	App,
	PluginSettingTab,
	Setting,
	Platform,
	TextComponent,
	Notice,
} from 'obsidian';
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

//TODO: adopting the declarative API
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

			// 1. Resolve source preset file path relative to plugin folder
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

			// 2. Resolve destination path relative to user's home directory
			const fullDestPath = destRelativePath.startsWith('/')
				? destRelativePath
				: path.join(home, destRelativePath);

			// 3. Ensure destination parent directory exists
			const destDir = path.dirname(fullDestPath);
			await fs.promises.mkdir(destDir, { recursive: true });

			// 4. Overwrite/Create the destination file
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

		new Setting(containerEl)
			.setName('Caelestia Obsidian plugin')
			.setHeading();

		let pathInputComponent: TextComponent | undefined;
		let pathSettingEl: HTMLElement;

		const updatePathDisabledState = (presetValue: string) => {
			const isDisabled = presetValue !== 'custom';

			if (pathInputComponent) {
				pathInputComponent.setDisabled(isDisabled);
			}

			if (pathSettingEl) {
				pathSettingEl.toggleClass('is-disabled', isDisabled);
				pathSettingEl.style.opacity = isDisabled ? '0.5' : '1.0';
				pathSettingEl.style.pointerEvents = isDisabled
					? 'none'
					: 'auto';
			}
		};

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
					.onChange((value) => {
						void (async () => {
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

							updatePathDisabledState(value);
						})();
					}),
			);

		const pathSetting = new Setting(containerEl)
			.setName('Custom CSS file path')
			.setDesc('Absolute path or relative path from your home directory.')
			.addText((text) => {
				pathInputComponent = text;
				text.setPlaceholder('.local/state/caelestia/theme/obsidian.css')
					.setValue(this.plugin.settings.customPath)
					.onChange(async (value) => {
						this.plugin.settings.customPath = value.trim();
						await this.plugin.saveSettings();
					});
			});

		pathSettingEl = pathSetting.settingEl;
		updatePathDisabledState(this.plugin.settings.themePreset);

		new Setting(containerEl).setName('About & credits').setHeading();

		new Setting(containerEl)
			.setName('GitHub repository')
			.setDesc('Check out the source code, report issues, or contribute.')
			.addButton((btn) =>
				btn
					.setButtonText('GitHub')
					.setCta()
					.onClick(() => {
						window.open(
							'https://github.com/your-username/your-repo-name',
							'_blank',
						);
					}),
			);

		const thankYouEl = containerEl.createDiv({
			cls: 'style-watcher-thankyou',
		});
		thankYouEl.createEl('p', {
			text: 'BWAAAAAAAAAHHHH </3',
		});
	}
}
