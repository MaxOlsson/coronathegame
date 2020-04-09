((window) => {
  const canvas = document.getElementById('canvas');
  const overlay = document.querySelector('.overlay');
  const scoreboardBanner = document.querySelector('.banner');
  const scoreboard = document.querySelector('.scoreboard');
  const startBanner = document.querySelector('.start-banner__wrapper');
  const pauseBanner = document.querySelector('.pause-banner');
  const gameoverBanner = document.querySelector('.game-banner');
  const nextlevelBanner = document.querySelector('.nextlevel-banner');
  const soundcontrol = document.querySelector('.sound-control');
  const pausecontrol = document.querySelector('.pause-control');

  const levelWinAudio = new Audio('./assets/sounds/level-win.mp3');
  const onbuginfectAudio = new Audio('./assets/sounds/on-bug-infect.mp3');
  const onbugexplodeAudio = new Audio('./assets/sounds/on-bug-explode.mp3');
  const backgroundAudio = new Audio('./assets/sounds/background-music.mp3');
  backgroundAudio.loop = true;

  const bugAlive = new Image();
  bugAlive.src = './assets/bug/bug-alive.png';

  const bugInfected = new Image();
  bugInfected.src = './assets/bug/bug-infected.png';

  const bugDead = new Image();
  bugDead.src = './assets/bug/bug-dead.png';

  const bugSelected = new Image();
  bugSelected.src = './assets/bug/bug-selected.png';
  
  let muted = false;
  let pause = false;
  let initLevel = false;
  let gameOver = false;
  let blockedInput = false;

  let coords;
  let currentLevelWon = false;
  let currentLevel = 1;
  let levelTries = 0;
  let totalScore = 0;
  let gameloopTimestamp = null;
  let startExplosionRadius = 10;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const maxTries = isMobile ? 1 : 2;
  const winLimit = isMobile ? 1.0 : 0.9;
  const startCoordRadius = 10;
  const explosionRadius = isMobile ? 180 : 120;
  const explosionVelocity = isMobile ? 2.4 : 1.8;
  const timeToDeath = 2200;
  const coordSize = isMobile ? 80 : 50;
  const totalCoords = isMobile ? 30 : 50;

  const backdrops = [
    './assets/backdrops/cornerstore-night.jpg',
    './assets/backdrops/chinese-lanterns.jpg',
    './assets/backdrops/chinese-stairs.jpg',
    './assets/backdrops/great-wall-of-china.jpg',
    './assets/backdrops/overlook-night.jpg',
    './assets/backdrops/shanghai-skyline.jpg',
    './assets/backdrops/sergels-torg.jpg',
  ].sort(() => Math.random() - 0.5); // pseudo shuffle
  
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight - 150;

  let backdrop = backdrops[currentLevel % backdrops.length];
  document.body.style.backgroundImage = `url(${backdrop})`;
  
  const gameloop = now => {
    if (gameOver) {
      return;
    }

    if (!initLevel && !currentLevelWon) {
      coords = generateCoords(canvas);
      backdrop = backdrops[currentLevel % backdrops.length];
      document.body.style.backgroundImage = `url(${backdrop})`;
      initLevel = true;
      blockedInput = false;
    }

    if (!pause) {
      ///// clear for redrawing
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      drawClickExplosion(context, coords);

      ///// draw and update new coords
      drawCoords(context, coords);
      
      //// evaluate level win
      evaluateLevelWin(coords);

      //// update scoreboard
      updateScoreboard(now);
    }
    window.requestAnimationFrame(gameloop);
  };
  
  const generateCoords = canvas => {
    const coords = [];

    for (let i = 0; i < totalCoords; i++) {
      let randomX = Math.floor(Math.random() * Math.floor(canvas.width - coordSize));
      let randomY = Math.floor(Math.random() * Math.floor(canvas.height - coordSize));

      randomX = randomX > coordSize + canvas.width ? randomX - coordSize : randomX < coordSize ? randomX + coordSize: randomX;
      randomY = randomY > coordSize + canvas.height ? randomY - coordSize : randomY < coordSize ? randomY + coordSize : randomY;

      const velocityX = isMobile ? Math.random() + 1.5 : Math.random() + 0.5;
      const velocityY = isMobile ? Math.random() + 1.5 : Math.random() + 0.5;

      coords.push({
        id: i,
        img: bugAlive,
        x: randomX,
        y: randomY,
        size: coordSize,
        alive: true,
        dead: false, // when all animations etc are done
        infected: false,
        radius: startCoordRadius,
        velocityX: Math.random() > .5 ? velocityX : -velocityX,
        velocityY: Math.random() > .5 ? velocityY : -velocityY,
      });
    }
    return coords;
  }

  const evaluateLevelWin = coords => {
    const isExploding = coords.filter(c => !c.dead).some(c => c.radius > startCoordRadius && c.radius < explosionRadius);
    const isInfected = coords.some(c => c.infected && !c.dead);

    if (isExploding || isInfected) {
      return;
    }

    const dead = coords.filter(c => c.dead).length;
    const deadLimit = coords.length * winLimit;

    if (dead >= deadLimit) {
      window.loadNextLevel();
    } else if (levelTries >= maxTries && !currentLevelWon) {
      window.endGame(coords);
    }
  }
  
  const drawCoords = (context, coords) => {
    for (let i = coords.length - 1; i >= 0; i--) {
      const coord = coords[i];
      if (!coord.alive) {
        drawExplosion(context, coords, coord);
      }
  
      if (coord.alive) {
        walk(coord);
      }
  
      if (coord.infected && coord.alive) {
        drawInfected(context, coord);
      }
  
      if (coord.alive && !coord.infected) {
        drawAlive(context, coord);
      }

    }
  }

  const walk = coord => {
    const xBump = coord.x + coord.velocityX > canvas.width - coord.size || coord.x + coord.size + coord.velocityX < coord.size;
    const yBump = coord.y + coord.velocityY > canvas.height - coord.size || coord.y + coord.size + coord.velocityY < coord.size

    if (xBump) {
        coord.velocityX = -coord.velocityX;
    }
    if (yBump) {
        coord.velocityY = -coord.velocityY;
    }
    
    coord.x += coord.velocityX;
    coord.y += coord.velocityY;
    
  }
  
  const drawAlive = (context, coord,) => {
    context.drawImage(coord.img, coord.x, coord.y, coord.size, coord.size);
  }

  const drawInfected = (context, coord) => {

    if (Date.now() > coord.timestamp) {
      coord.alive = false;
      return;
    }

    const flash = Math.round((Date.now() - gameloopTimestamp )/ 100)
    coord.img = flash % 2 === 0 ? bugAlive : bugInfected;

    context.drawImage(coord.img, coord.x, coord.y, coord.size, coord.size);
  }
  
  const drawDead = (context, coord) => {
    if (!coord.dead) {
      coord.dead = true;
      coord.infected = false;
      coord.alive = false;
      coord.img = bugDead;

      if (!currentLevelWon) {
        totalScore += 10;
      }
    }
  }

  const drawExplosion = (context, coords, coord) => {
    if (coord.radius <= explosionRadius) {
      coord.radius += explosionVelocity;
      context.beginPath();
      context.arc(coord.x + (~~coord.size / 2), coord.y + (~~coord.size / 2), coord.radius, 0, 2 * Math.PI);
      context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      context.lineWidth = 60;
      context.stroke();
      context.closePath();
      calculateExplosionHit(coords, coord);
      if (!muted) {
        onbugexplodeAudio.play();
      }
    } else if (coord.radius >= explosionRadius) {
      drawDead(context, coord);
    }
  }
  
  const drawClickExplosion = (context, coords) => {
    if (playerX && playerY) {
      if (startExplosionRadius <= explosionRadius) {
        startExplosionRadius += explosionVelocity;
        context.beginPath();
        context.arc(playerX, playerY, startExplosionRadius, 0, 2 * Math.PI);
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 60;
        context.stroke();
        context.closePath();
        calculateExplosionHitAny(coords);
        // if (!muted) {
        //   onbugexplodeAudio.play();
        // }
      } else {
        startExplosionRadius = 10;
        playerX = null;
        playerY = null;

        if (levelTries < maxTries) {
          levelTries++;
        }
      }
    }
  }

  const calculateExplosionHit = (coords, coord) => {
    const cSize = ~~(coord.size / 2);
    coords.forEach(c => {
        const distX = Math.abs(coord.x - c.x - cSize);
        const distY = Math.abs(coord.y - c.y - cSize);
  
        if (distX > (cSize + coord.radius)) {
            return false;
        }
        if (distY > (cSize + coord.radius)) {
            return false;
        }
  
        if (distX <= cSize) {
            return true;
        }
        if (distY <= cSize) {
            return true;
        }
  
        const dx = distX - cSize;
        const dy = distY - cSize;
  
        const isHit = ((dx * dx) + (dy * dy) <= (coord.radius * coord.radius));
        if (isHit && c.alive && !c.infected) {
          onHit(c);
        }
      });
  }

  const calculateExplosionHitAny = coords => {
    const cSize = ~~(coordSize / 2);
    coords.forEach(c => {
      const distX = Math.abs(playerX - c.x - cSize);
      const distY = Math.abs(playerY - c.y - cSize);

      if (distX > (cSize + startExplosionRadius)) {
          return false;
      }
      if (distY > (cSize + startExplosionRadius)) {
          return false;
      }

      if (distX <= cSize) {
          return true;
      }
      if (distY <= cSize) {
          return true;
      }

      const dx = distX - cSize;
      const dy = distY - cSize;

      const isHit = ((dx * dx) + (dy * dy) <= (startExplosionRadius * startExplosionRadius));
      if (isHit && c.alive && !c.infected) {
        onHit(c);
      }
    });
  }
  
  const onHit = coord => {
    blockedInput = true;
    coord.infected = true;
    coord.timestamp = Date.now() + timeToDeath;
    if (!muted) {
      onbuginfectAudio.play();
    }
  }
  
  let playerX = null;
  let playerY = null;
  canvas.addEventListener('click', event => {
    blockedInput = coords.some(c => c.infected);

    if (!initLevel || gameOver || pause || blockedInput) {
      return;
    }

    const mouseX = event.clientX - canvas.offsetLeft;
    const mouseY = event.clientY - canvas.offsetTop;
    playerX = mouseX;
    playerY = mouseY;
  });
  
  canvas.addEventListener('mousemove', (event) => {
    if (!initLevel || gameOver || pause) {
      return;
    }
    const mouseX = event.clientX - canvas.offsetLeft;
    const mouseY = event.clientY - canvas.offsetTop;
  
    coords.forEach(coord => {
      const { x, y, size } = coord;
      const hitX = mouseX >= x && mouseX <= (x + size);
      const hitY = mouseY >= y && mouseY <= (y + size);
  
      coord.hit = hitX && hitY;
    });
  });

  updateScoreboard = now => {
    if (now - gameloopTimestamp >= 1000 && totalScore > 0 && !currentLevelWon) {
      gameloopTimestamp = now;
      totalScore--;
  }
    const dead = coords.filter(c => c.dead).length;
    scoreboard.innerHTML = `covids ${dead}/${coords.length * winLimit} - score ${totalScore} - tries ${levelTries}/${maxTries}`;
  };

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - scoreboardBanner.getBoundingClientRect().height;
  }, false);

  window.loadNextLevel = () => {
    overlay.style.display = 'flex';
    overlay.classList.add('fadein');
    nextlevelBanner.style.display = 'flex';

    if (!muted && !currentLevelWon) {
      totalScore += 100;
      levelWinAudio.play();

      if (coords.filter(c => c.dead).length === totalCoords) {
        totalScore += 150; // bonus for clearing all
      }
    }

    currentLevelWon = true;
  }

  window.startNextLevel = () => {
    gameOver = false;
    pause = false;
    initLevel = false;
    blockedInput = false;

    initLevel = false;
    currentLevelWon = false;
    currentLevel++;

    levelTries = 0;
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'none';
    overlay.classList.remove('fadein');
    nextlevelBanner.style.display = 'none';
  }

  window.endGame = () => {
    backgroundAudio.pause();

    pause = true;
    gameOver = true;
    initLevel = false;

    overlay.style.display = 'flex';
    gameoverBanner.style.display = 'flex';
    overlay.classList.add('gameover');

    startBanner.style.display = 'none';
    nextlevelBanner.style.display = 'none';
    pauseBanner.style.display = 'none';
  }

  window.pauseGame = () => {
    if (pause) {
      if (!muted) {
        backgroundAudio.play();
      }
      overlay.style.display = 'none';
      pauseBanner.style.display = 'none';
      startBanner.style.display = 'none';
      gameoverBanner.style.display = 'none';
      nextlevelBanner.style.display = 'none';
      pausecontrol.classList.remove('resume-button');
      pausecontrol.classList.add('pause-button');

    } else {
      backgroundAudio.pause();
      overlay.style.display = 'flex';
      pauseBanner.style.display = 'flex'
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      startBanner.style.display = 'none';
      gameoverBanner.style.display = 'none';
      nextlevelBanner.style.display = 'none';
      pausecontrol.classList.add('resume-button');
      pausecontrol.classList.remove('pause-button');
    }
    return pause = !pause
  };

  window.startGame = () =>  {
    if (!muted) {
      backgroundAudio.play();
    }

    gameOver = false;
    pause = false;
    initLevel = false;
    blockedInput = false;
    currentLevel = 1;
    levelTries = 0;
    totalScore = 0;

    scoreboardBanner.style.display = 'flex';
    overlay.classList.add('overlay-started');

    overlay.style.display = 'none';
    startBanner.style.display = 'none';
    gameoverBanner.style.display = 'none';
    nextlevelBanner.style.display = 'none';

    window.requestAnimationFrame(gameloop);
  };

  window.mute = () => {
    if (muted) {
      backgroundAudio.play();
      soundcontrol.classList.remove('banner__muted');
      soundcontrol.classList.add('banner__mute');
    } else {
      onbugexplodeAudio.pause();
      onbuginfectAudio.pause()
      backgroundAudio.pause();
      soundcontrol.classList.add('banner__muted');
      soundcontrol.classList.remove('banner__mute');
    }
    return muted = !muted;
  };

})(window);

