export class NotificationSound {
	private static instance: NotificationSound;
	private audioContext: AudioContext | null = null;
	private enabled: boolean = true;

	private constructor() {
		if (typeof window !== 'undefined') {
			this.audioContext = new (window.AudioContext ||
				(window as unknown as Window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
		}
	}

	static getInstance(): NotificationSound {
		if (!NotificationSound.instance) {
			NotificationSound.instance = new NotificationSound();
		}
		return NotificationSound.instance;
	}

	play() {
		if (!this.enabled || !this.audioContext) return;

		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);

		oscillator.frequency.value = 800;
		oscillator.type = 'sine';

		gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
		gainNode.gain.linearRampToValueAtTime(
			0.1,
			this.audioContext.currentTime + 0.1
		);
		gainNode.gain.linearRampToValueAtTime(
			0,
			this.audioContext.currentTime + 0.3
		);

		oscillator.start(this.audioContext.currentTime);
		oscillator.stop(this.audioContext.currentTime + 0.3);
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}
}
