let playing = 0;

const finish = () => {
  playing -= 1;
  if (playing <= 0) {
    playing = 0;
    chrome.runtime.sendMessage({ type: 'rk-sound-done' }).catch(() => {});
  }
};

const chime = () => {
  const context = new AudioContext();
  const now = context.currentTime;
  const notes = [[880, 0], [1318.51, 0.11]];
  let last = null;
  for (const [frequency, offset] of notes) {
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.16, now + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.8);
    tone.connect(gain).connect(context.destination);
    tone.start(now + offset);
    tone.stop(now + offset + 0.85);
    last = tone;
  }
  last.addEventListener('ended', () => {
    context.close();
    finish();
  }, { once: true });
};

const clip = src => {
  const audio = new Audio(src);
  let done = false;
  const end = fallback => {
    if (done) return;
    done = true;
    audio.removeAttribute('src');
    if (fallback) chime();
    else finish();
  };
  audio.volume = 0.8;
  audio.addEventListener('ended', () => end(false), { once: true });
  audio.addEventListener('error', () => end(true), { once: true });
  audio.play().catch(() => end(true));
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== chrome.runtime.id || !message || message.type !== 'rk-play') return false;
  playing += 1;
  if (typeof message.src === 'string' && message.src.startsWith('https://')) clip(message.src);
  else chime();
  return false;
});
