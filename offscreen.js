let playing = 0;
let music = null;
let musicId = null;
let context = null;
let idleTimer = 0;
const clips = new Map();

const closeIfIdle = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (playing <= 0 && !music) chrome.runtime.sendMessage({ type: 'rk-sound-done' }).catch(() => {});
  }, 30000);
};

const audioContext = async () => {
  if (!context) context = new AudioContext({ latencyHint: 'interactive' });
  if (context.state === 'suspended') await context.resume().catch(() => {});
  return context;
};

const finish = () => {
  playing -= 1;
  if (playing <= 0) {
    playing = 0;
    closeIfIdle();
  }
};

const chime = async () => {
  const context = await audioContext();
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
    finish();
    return;
  }
  last.addEventListener('ended', finish, { once: true });
};

const audioType = bytes => {
  const head = String.fromCharCode(...bytes);
  if (head === 'OggS') return 'audio/ogg';
  if (head === 'RIFF') return 'audio/wav';
  if (head === 'fLaC') return 'audio/flac';
  return 'audio/mpeg';
};

const loadAudio = async src => {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`audio request failed ${response.status}`);
  const buffer = await response.arrayBuffer();
  return URL.createObjectURL(new Blob([buffer], { type: audioType(new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength))) }));
};

const release = audio => {
  if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
  audio.removeAttribute('src');
};

const audibleRange = buffer => {
  const threshold = 0.01;
  let first = buffer.length;
  let last = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    let start = 0;
    while (start < first && Math.abs(samples[start]) < threshold) start += 1;
    first = Math.min(first, start);
    let end = samples.length - 1;
    while (end > last && Math.abs(samples[end]) < threshold) end -= 1;
    last = Math.max(last, end);
  }
  if (first >= last) return { offset: 0, duration: buffer.duration };
  const offset = Math.max(0, first / buffer.sampleRate - 0.005);
  return { offset, duration: Math.min(buffer.duration - offset, (last - first) / buffer.sampleRate + 0.05) };
};

const clip = async src => {
  try {
    const context = await audioContext();
    let entry = clips.get(src);
    if (!entry) {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`audio request failed ${response.status}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      entry = { buffer, ...audibleRange(buffer) };
      clips.set(src, entry);
      if (clips.size > 10) clips.delete(clips.keys().next().value);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = 0.8;
    source.buffer = entry.buffer;
    source.connect(gain).connect(context.destination);
    source.addEventListener('ended', () => {
      gain.disconnect();
      finish();
    }, { once: true });
    source.start(0, entry.offset, entry.duration);
  } catch {
    chime();
  }
};

const stopMusic = () => {
  if (!music) return;
  music.pause();
  release(music);
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
    release(music);
  }
  const audio = new Audio();
  const fail = () => {
    if (music === audio) stopMusic();
  };
  music = audio;
  musicId = message.id;
  audio.loop = true;
  audio.volume = volume;
  audio.addEventListener('error', fail, { once: true });
  loadAudio(message.src).then(url => {
    if (music !== audio) {
      URL.revokeObjectURL(url);
      return null;
    }
    audio.src = url;
    return audio.play();
  }).catch(fail);
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
  clearTimeout(idleTimer);
  playing += 1;
  if (typeof message.src === 'string' && message.src.startsWith('https://')) clip(message.src);
  else chime();
  return false;
});
