// Web Audio API Synthesizer for high-fidelity in-app notification chimes
// Zero dependencies, works offline and without external MP3/WAV assets

export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // If context was suspended due to user gesture policy, try to resume
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic bell chord: Note 1 (E5 - 659.25Hz), Note 2 (A5 - 880Hz), Note 3 (C#6 - 1108.73Hz)
    // First chime (Warm tone)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second chime (Higher bright ping)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.1);
    gain2.gain.setValueAtTime(0.28, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);

    // Third sparkle overtone
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1318.5, now + 0.18); // E6
    gain3.gain.setValueAtTime(0.12, now + 0.18);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.18);
    osc3.stop(now + 0.65);

    // Clean up audio context
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch (e) {
    console.debug('Notification sound playback skipped:', e);
  }
}
