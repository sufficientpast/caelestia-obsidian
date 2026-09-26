import { App, Platform, Plugin, Modal, Notice } from 'obsidian';
import ExternalStyleSettingTab, {
	ExternalStyleSettings,
	DEFAULT_SETTINGS,
} from './settings';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class MyCenteredModal extends Modal {
	private settingsTab: ExternalStyleSettingTab;

	constructor(app: App, settingsTab: ExternalStyleSettingTab) {
		super(app);
		this.settingsTab = settingsTab;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Obsidian theme installer(?)' });
		contentEl.createEl('p', {
			text: 'This will install theme template in appropiate folder and change wallpaper randomly once.',
		});

		const button = contentEl.createEl('button', { text: 'Confirm' });
		button.addEventListener('click', () => {
			void (async () => {
				await this.settingsTab.absoluteOverwriteFile(
					'presets/preset-1.css',
					'.config/caelestia/templates/obsidian.css',
				);

				exec('/usr/bin/caelestia scheme set -n dynamic', (err) => {
					new Notice(err ? 'Failed to apply scheme' : 'Done!');
				});
			})();

			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export default class ExternalStyleWatcher extends Plugin {
	settings!: ExternalStyleSettings;
	settingsTab!: ExternalStyleSettingTab;

	private styleId = 'dynamic-external-style';
	private customPath!: string;
	private watchDir!: string;
	private watchFile!: string;
	private watcher: fs.FSWatcher | null = null;
	private _fileMissing = false;
	private _debounce: NodeJS.Timeout | number | undefined;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.settingsTab = new ExternalStyleSettingTab(this.app, this);
		this.addSettingTab(this.settingsTab);

		this.addRibbonIcon('dice', 'Print to console', async () => {
			await this.settingsTab.absoluteOverwriteFile(
				'presets/preset-1.css',
				'.config/caelestia/templates/obsidian.css',
			);
		});

		if (!Platform.isDesktop) {
			console.warn(
				'External Style Watcher is only supported on Desktop.',
			);
			return;
		}

		// paths and start watcher
		this.setupPaths();
		this.refreshStyle();
		this.startWatching();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as ExternalStyleWatcher,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Change normalize path to absolute path
	setupPaths() {
		if (!path || !os) return;
		const home = process.env.HOME || os.homedir();
		const configuredPath = this.settings.customPath;

		this.customPath = configuredPath.startsWith('/')
			? configuredPath
			: path.join(home, configuredPath);

		this.watchDir = path.dirname(this.customPath);
		this.watchFile = path.basename(this.customPath);
	}

	//basically uh reintialize wtcher when preset is changed from settings
	reinitializeWatcher() {
		if (!Platform.isDesktopApp) return;
		this.restartWatching();
		this.setupPaths();
		this.refreshStyle();
		this.startWatching();
	}

	startWatching(): void {
		if (!fs.existsSync(this.watchDir)) {
			console.warn(
				`External Style Watcher: watch directory not found: ${this.watchDir}`,
			);
			return;
		}
		try {
			this.watcher = fs.watch(this.watchDir, (eventType, filename) => {
				if (!filename || filename === this.watchFile) {
					window.clearTimeout(this._debounce as number);
					this._debounce = window.setTimeout(
						() => this.refreshStyle(),
						150,
					);
				}
			});

			this.watcher.on('error', (e) => {
				console.error(
					'External Style Watcher: watcher errored, restarting…',
					e,
				);
				this.restartWatching();
			});
		} catch (e) {
			console.error('Failed to watch theme directory:', e);
		}
	}

	private watchTimer: number | null = null;

	restartWatching(): void {
		if (this.watchTimer !== null) {
			window.clearTimeout(this.watchTimer);
			this.watchTimer = null;
		}

		if (this.watcher) {
			try {
				this.watcher.close();
			} catch {
				//watcher cleanup error
			}
			this.watcher = null;
		}

		this.watchTimer = window.setTimeout(() => {
			this.watchTimer = null;
			this.startWatching();
		}, 500);
	}

	warnMissingFile(): void {
		const notice = new Notice('Theme file not found!, set it up?', 10000);

		const buttonContainer = notice.messageEl.createDiv({
			cls: 'notice-button-container',
		});

		buttonContainer.createEl(
			'button',
			{
				text: 'Confirm',
			},
			(btn) => {
				btn.addEventListener('click', () => {
					// Perform your action here
					new MyCenteredModal(this.app, this.settingsTab).open();

					// Manually dismiss the notice
					notice.hide();
				});
			},
		);

		buttonContainer.createEl(
			'button',
			{
				text: 'Cancel',
			},
			(btn) => {
				btn.addEventListener('click', () => {
					notice.hide();
				});
			},
		);
	}

	refreshStyle(): void {
		if (!fs.existsSync(this.customPath)) {
			if (!this._fileMissing) this.warnMissingFile();
			this._fileMissing = true;
			return;
		}
		this._fileMissing = false;

		try {
			const cssContent = fs.readFileSync(this.customPath, 'utf8');

			let styleEl = document.getElementById(
				this.styleId,
			) as HTMLStyleElement | null;
			if (!styleEl) {
				const doc = document.head.ownerDocument;
				styleEl = doc.createElement('style');
				styleEl.id = this.styleId;
				document.head.appendChild(styleEl);
			}

			styleEl.textContent = cssContent;
			//console.log('External Style Updated!'); for testing only
		} catch (e) {
			console.error(
				'Failed to read external style file:',
				this.customPath,
				e,
			);
		}
	}

	onunload(): void {
		window.clearTimeout(this._debounce as number);
		if (this.watcher) this.watcher.close();
		const styleEl = document.getElementById(this.styleId);
		if (styleEl) styleEl.remove();
	}
}
