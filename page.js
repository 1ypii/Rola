(() => {
  const isId = value => Number.isSafeInteger(value) && value > 0;
  const isJobId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const launcher = () => {
    const roblox = window.Roblox;
    return roblox && roblox.GameLauncher ? roblox.GameLauncher : null;
  };

  const avatarTypeUrl = /^https:\/\/avatar\.roblox\.com\/v1\/avatar\/set-player-avatar-type/i;
  const wearingUrl = /^https:\/\/avatar\.roblox\.com\/v\d+\/avatar\/set-wearing-assets/i;
  const keepR6 = () => document.documentElement.dataset.rkKeepR6 === 'on';

  const keepBody = (url, body) => {
    if (!keepR6() || typeof url !== 'string' || !avatarTypeUrl.test(url) || typeof body !== 'string') return body;
    try {
      const data = JSON.parse(body);
      if (data && data.playerAvatarType === 'R15') {
        document.dispatchEvent(new CustomEvent('rk:avatar-kept'));
        return JSON.stringify({ ...data, playerAvatarType: 'R6' });
      }
    } catch {}
    return body;
  };

  const wearingDone = url => {
    if (keepR6() && typeof url === 'string' && wearingUrl.test(url)) document.dispatchEvent(new CustomEvent('rk:avatar-wearing'));
  };

  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input && input.url;
    if (init && init.body !== undefined) init = { ...init, body: keepBody(url, init.body) };
    const result = nativeFetch.call(this, input, init);
    if (typeof url === 'string' && wearingUrl.test(url)) result.then(() => wearingDone(url), () => {});
    return result;
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.rkUrl = String(url);
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const url = this.rkUrl;
    if (typeof url === 'string' && wearingUrl.test(url)) this.addEventListener('loadend', () => wearingDone(url), { once: true });
    return nativeSend.call(this, keepBody(url, body));
  };

  document.addEventListener('rk:launch', event => {
    let detail;
    try {
      detail = JSON.parse(event.detail);
    } catch {
      return;
    }
    if (!detail || typeof detail !== 'object') return;

    const gameLauncher = launcher();

    if (detail.kind === 'server' && isId(detail.placeId) && isJobId(detail.jobId)) {
      if (gameLauncher && typeof gameLauncher.joinGameInstance === 'function') {
        gameLauncher.joinGameInstance(detail.placeId, detail.jobId);
      } else {
        location.href = `roblox://placeId=${detail.placeId}&gameInstanceId=${detail.jobId}`;
      }
      return;
    }

    if (detail.kind === 'place' && isId(detail.placeId)) {
      if (gameLauncher && typeof gameLauncher.joinMultiplayerGame === 'function') {
        gameLauncher.joinMultiplayerGame(detail.placeId, true);
      } else {
        location.href = `roblox://placeId=${detail.placeId}`;
      }
      return;
    }

    if (detail.kind === 'follow' && isId(detail.userId)) {
      if (gameLauncher && typeof gameLauncher.followPlayerIntoGame === 'function') {
        gameLauncher.followPlayerIntoGame(detail.userId);
      } else {
        location.href = `roblox://userId=${detail.userId}`;
      }
      return;
    }

    if (detail.kind === 'studio' && isId(detail.placeId) && isId(detail.universeId)) {
      if (gameLauncher && typeof gameLauncher.editGameInStudio === 'function') {
        gameLauncher.editGameInStudio(detail.placeId, detail.universeId);
      }
    }
  });
})();
