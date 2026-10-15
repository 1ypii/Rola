(() => {
  const isId = value => Number.isSafeInteger(value) && value > 0;
  const isJobId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const launcher = () => {
    const roblox = window.Roblox;
    return roblox && roblox.GameLauncher ? roblox.GameLauncher : null;
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
