// requestAnimationFrame shim
window.requestAnimFrame = function() {
  return window.requestAnimationFrame       ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame    ||
         window.oRequestAnimationFrame      ||
         window.msRequestAnimationFrame     ||
         function(cb) {
           window.setTimeout(cb, 1000 / 60)
         }
}()

function radians(deg) {
  return deg * Math.PI / 180
}

// Mixin for movable entities which have: x, y, d(egrees), speed
var asMovable = function() {
  function moveForward() {
    this.x = this.x + Math.cos(this.d * (Math.PI / 180)) * this.speed
    this.y = this.y + Math.sin(this.d * (Math.PI / 180)) * this.speed
  }

  function moveTowards(x, y) {
    var dx = x - this.x
      , dy = y - this.y
      , hyp = Math.sqrt(dx * dx + dy * dy)
    this.x += this.speed * dx / hyp
    this.y += this.speed * dy / hyp
    this.d = Math.atan2(dy, dx) * 180 / Math.PI
  }

  return function(proto) {
    proto.moveForward = moveForward
    proto.moveTowards = moveTowards
    return proto
  }
}()

function Player(kwargs) {
  this.x = kwargs.x
  this.y = kwargs.y
  this.d = kwargs.d || 0
  this.size = 10
  this.speed = this.walkSpeed = 2
  this.runSpeed = 3
  this.moving = false
  this.running = false
  // XXX
  this.stepFrame = 0
  this.shootFrame = Math.floor(Math.random() * 5000)
}

asMovable(Player.prototype)

function Zombie(kwargs) {
  this.x = kwargs.x
  this.y = kwargs.y
  this.d = kwargs.d || 0
  this.size = kwargs.size || 10
  this.speed = kwargs.speed || Math.max(0.5, Math.random() * 1.5)
  this.los = kwargs.los || 50 + Math.floor(Math.random() * 50)
  this.fov = kwargs.fov || 25 + Math.floor(Math.random() * 15)
  this.canSeePlayer = false
  // XXX
  this.moanFrame = Math.floor(Math.random() * 5000)
}

asMovable(Zombie.prototype)

function Sound(kwargs) {
  this.x = kwargs.x
  this.y = kwargs.y
  this.radius = kwargs.radius || 50
  this.text = kwargs.text || 'BANG!'
  this.progress = 0
}

var WIDTH = 512
  , HEIGHT = 372

var canvas, context, keys = {}
var player, zombies, sounds

function init(debug) {
  canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT

  context = canvas.getContext('2d')

  document.body.appendChild(canvas)

  player = new Player({x: 10, y: 10, d: 0})

  zombies = [
    new Zombie({x: 100, y: 100, d: 225})
  , new Zombie({x: 150, y: 150, d: 225})
  , new Zombie({x: 200, y: 200, d: 225})
  , new Zombie({x: 250, y: 250, d: 225})
  , new Zombie({x: 300, y: 300, d: 225})
  ]

  sounds = []

  for (var keyCode in KEY_NAMES) {
    if (KEY_NAMES.hasOwnProperty(keyCode)) {
      keys[KEY_NAMES[keyCode]] = false
    }
  }

  window.onkeydown = function(e) {
    keys[KEY_NAMES[e.keyCode]] = true
  }

  window.onkeyup = function(e) {
    keys[KEY_NAMES[e.keyCode]] = false
  }

  if (debug) {
    var gui = new dat.GUI()
    playerGUI(gui.addFolder('Player'), player)
    zombieGUI(gui.addFolder('Zombie 1'), zombies[0])
  }
}

var KEY_NAMES = {
  32: 'run'   // Spacebar
, 37: 'left'  // Arrow keys
, 38: 'up'
, 39: 'right'
, 40: 'down'
, 65: 'left'  // WASD
, 87: 'up'
, 68: 'right'
, 83: 'down'
}

function playerGUI(gui, p) {
  // gui.add(p, 'x').listen()
  // gui.add(p, 'y').listen()
  // gui.add(p, 'speed').listen()
  // gui.add(p, 'running').listen()
  gui.add(p, 'd').listen()
  gui.add(p, 'size').min(5).max(50).step(1).listen()
  gui.add(p, 'walkSpeed').min(0.5).max(10).step(0.5).listen()
  gui.add(p, 'runSpeed').min(0.5).max(10).step(0.5).listen()
  gui.open()
}

function zombieGUI(gui, z) {
  // gui.add(z, 'x').listen()
  // gui.add(z, 'y').listen()
  gui.add(z, 'd').listen()
  gui.add(z, 'size').min(5).max(50).step(1).listen()
  gui.add(z, 'speed').min(0.5).max(10).step(0.5).listen()
  gui.add(z, 'los').min(10).max(200).step(5).listen()
  gui.add(z, 'fov').min(1).max(90).step(1).listen()
  gui.open()
}

var paused = false

function pause() {
  paused = !paused
  if (!paused) {
    gameLoop()
  }
}

function gameLoop() {
  if (!paused) {
    requestAnimFrame(gameLoop)
  }
  update()
  draw()
}

function update() {
  // Move player and set direction
  player.moving = keys.up || keys.down || keys.left || keys.right
  player.running = keys.run
  player.speed = keys.run ? player.runSpeed : player.walkSpeed
  if (keys.up) {
    player.y -= player.speed
    if (keys.left) {
      player.x -= player.speed
      player.d = 225
    }
    else if (keys.right) {
      player.x += player.speed
      player.d = 315
    }
    else {
      player.d = 270
    }
  }
  else if (keys.down) {
    player.y += player.speed
    if (keys.left) {
      player.x -= player.speed
      player.d = 135
    }
    else if (keys.right) {
      player.x += player.speed
      player.d = 45
    }
    else {
      player.d = 90
    }
  }
  else if (keys.left) {
    player.x -= player.speed
    player.d = 180
  }
  else if (keys.right) {
    player.x += player.speed
    player.d = 0
  }

  // Make walking noises
  if (player.moving) {
    player.stepFrame += (player.running ? 2 : 1)
    if (player.stepFrame >= (player.running ? 50 : 30)) {
      sounds.push(new Sound({
        x: player.x
      , y: player.y
      , radius: player.running ? 60 : 20
      , text: player.running ? 'clomp' : 'step'
      }))
      player.stepFrame = player.stepFrame % (player.running ? 50 : 30)
    }
  }

  // XXX Take a shot every so often
  player.shootFrame--
  if (player.shootFrame == 0) {
    sounds.push(new Sound({x: player.x, y: player.y, radius: 800, text: 'BLAM!'}))
    player.shootFrame = Math.floor(Math.random() * 5000)
  }
  // Prevent player from exiting the canvas
  if (player.x < 0) {
    player.x = 0
  }
  else if (player.x > WIDTH) {
    player.x = WIDTH
  }
  if (player.y < 0) {
    player.y = 0
  }
  else if (player.y > HEIGHT) {
    player.y = HEIGHT
  }

  // Move zombies
  for (var i = 0, l = zombies.length; i < l; i++) {
    var zombie = zombies[i]
    // Always move towards the player so we can test stuff
    zombie.moveTowards(player.x, player.y)
    // Can it see the player?
    var coneVec = new Vec2(Math.cos(radians(zombie.d)),
                           Math.sin(radians(zombie.d)))
      , toTarget = new Vec2(player.x - zombie.x, player.y - zombie.y)
      , deltaAngle = Vec2.dot(coneVec, toTarget.clone().normalise())
    zombie.canSeePlayer = (deltaAngle >= Math.cos(radians(zombie.fov / 2)) &&
                           toTarget.magnitude() <= zombie.los)
    // XXX Moan every so often
    zombie.moanFrame--
    if (zombie.moanFrame == 0) {
      sounds.push(new Sound({x: zombie.x, y: zombie.y, radius: 80, text: 'UURRRGH'}))
      zombie.moanFrame = Math.floor(Math.random() * 5000)
    }
  }

  // Propogate or remove sounds
  for (var i = sounds.length - 1; i >= 0; i--) {
    var sound = sounds[i]
    if (sound.progress >= 100) {
      sounds.splice(i, 1)
    }
    else {
      sound.progress += 4
    }
  }
}

function draw() {
  context.lineWidth = 1

  // Blank background
  context.fillStyle = 'white'
  context.beginPath()
  context.rect(0, 0, WIDTH, HEIGHT)
  context.fill()
  context.stroke()

  // Draw zombies
  // Line of sight cones
  context.strokeStyle = 'silver'
  for (var i = 0, l = zombies.length; i < l; i++) {
    var zombie = zombies[i]
    // Is the player within the zombie's cone?
    context.fillStyle = zombie.canSeePlayer ? 'pink' : 'lightgray'
    // Draw cone
    context.beginPath()
    context.moveTo(zombie.x, zombie.y)
    var coneX1 = zombie.x + Math.cos((zombie.d - zombie.fov) * (Math.PI / 180)) * zombie.los
      , coneY1 = zombie.y + Math.sin((zombie.d - zombie.fov) * (Math.PI / 180)) * zombie.los
      // , coneX2 = zombie.x + Math.cos((zombie.d + zombie.fov) * (Math.PI / 180)) * zombie.los
      // , coneY2 = zombie.y + Math.sin((zombie.d + zombie.fov) * (Math.PI / 180)) * zombie.los
    context.lineTo(coneX1, coneY1)
    context.arc(zombie.x, zombie.y, zombie.los, (zombie.d - zombie.fov) * (Math.PI / 180), (zombie.d + zombie.fov) * (Math.PI / 180), false)
    context.lineTo(zombie.x, zombie.y)
    context.fill()
    context.stroke()
  }
  // Bodies
  context.fillStyle = 'darkred'
  context.strokeStyle = 'black'
  for (var i = 0, l = zombies.length; i < l; i++) {
    var zombie = zombies[i]
    // Body
    context.fillStyle = 'darkred'
    context.beginPath()
    context.arc(zombie.x, zombie.y, zombie.size / 2, 0, 2 * Math.PI, false)
    context.fill()
    // Direction indicator
    context.beginPath()
    context.moveTo(zombie.x, zombie.y)
    context.lineTo(zombie.x + zombie.size * Math.cos(zombie.d * (Math.PI / 180)),
                   zombie.y + zombie.size * Math.sin(zombie.d * (Math.PI / 180)))
    context.stroke()
  }

  // Draw sound & propogation circle
  context.strokeStyle = 'steelblue'
  context.fillStyle = 'black'
  for (var i = 0, l = sounds.length; i < l; i++) {
    var sound = sounds[i]
    context.beginPath()
    context.arc(sound.x, sound.y, sound.radius * sound.progress / 100, 0, 2 * Math.PI, false)
    context.stroke()
    context.fillText(sound.text, sound.x, sound.y)
  }

  // Draw player
  context.fillStyle = 'green'
  context.beginPath()
  context.arc(player.x, player.y, player.size / 2, 0, 2 * Math.PI, false)
  context.fill()
  context.beginPath()
  context.moveTo(player.x, player.y)
  context.lineTo(player.x + player.size * Math.cos(player.d * (Math.PI / 180)),
                 player.y + player.size * Math.sin(player.d * (Math.PI / 180)))
  context.stroke()
}

init(true)
gameLoop()
