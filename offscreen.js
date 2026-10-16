let playing = 0;
let music = null;
let musicId = null;

const closeIfIdle = () => {
  if (playing <= 0 && !music) chrome.runtime.sendMessage({ type: 'rk-sound-done' }).catch(() => {});
};

const finish = () => {
  playing -= 1;
  if (playing <= 0) {
    playing = 0;
    closeIfIdle();
  }
};

const chime = async () => {
  const context = new AudioContext();
  await context.resume().catch(() => {});
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
  if (context.state !== 'running') {
    context.close();
    finish();
    return;
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

const stopMusic = () => {
  if (!music) return;
  music.pause();
  music.removeAttribute('src');
  music = null;
  musicId = null;
  closeIfIdle();
};

const setMusic = message => {
  if (typeof message.id !== 'string') {
    stopMusic();
    return;
  }
  const volume = Number.isFinite(message.volume) ? Math.min(Math.max(message.volume, 0), 1) : 0.4;
  if (music && musicId === message.id) {
    music.volume = volume;
    return;
  }
  if (typeof message.src !== 'string' || !message.src.startsWith('https://')) return;
  if (music) {
    music.pause();
    music.removeAttribute('src');
  }
  const audio = new Audio(message.src);
  const fail = () => {
    if (music === audio) stopMusic();
  };
  music = audio;
  musicId = message.id;
  audio.loop = true;
  audio.volume = volume;
  audio.addEventListener('error', fail, { once: true });
  audio.play().catch(fail);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !message) return false;
  if (message.type === 'rk-music') {
    setMusic(message);
    return false;
  }
  if (message.type === 'rk-music-state') {
    sendResponse({ id: musicId });
    return false;
  }
  if (message.type !== 'rk-play') return false;
  playing += 1;
  if (typeof message.src === 'string' && message.src.startsWith('https://')) clip(message.src);
  else chime();
  return false;
});
