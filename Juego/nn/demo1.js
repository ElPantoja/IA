window.onload = function () {
  var w = 800;
  var h = 400;
  var jugador;
  var fondo;

  var balaHorizontal, balaHorizontalD = false, nave;
  var balaVertical, balaVerticalD = false;

  var salto, izquierda, derecha;
  var izquierdaPresionada = false;
  var derechaPresionada = false;

  var datosEntrenamiento = [];
  var modoAuto = false;
  var redNeuronal = new brain.NeuralNetwork();

  var juego = new Phaser.Game(w, h, Phaser.AUTO, '', { preload: preload, create: create, update: update });

  function preload() {
    juego.load.image('fondo', 'assets/game/fondo.jpg');
    juego.load.spritesheet('mono', 'assets/sprites/altair.png', 32, 48);
    juego.load.image('nave', 'assets/game/ufo.png');
    juego.load.image('bala', 'assets/sprites/purple_ball.png');
    juego.load.image('menu', 'assets/game/menu.png');
  }

  function create() {
    juego.physics.startSystem(Phaser.Physics.ARCADE);

    fondo = juego.add.sprite(0, 0, 'fondo');

    jugador = juego.add.sprite(50, h - 100, 'mono');
    juego.physics.arcade.enable(jugador);
    jugador.body.gravity.y = 500;
    jugador.body.collideWorldBounds = true;
    jugador.animations.add('caminar', [8, 9], 10, true);

    nave = juego.add.sprite(w - 100, 50, 'nave');

    balaHorizontal = juego.add.sprite(nave.x, nave.y, 'bala');
    juego.physics.arcade.enable(balaHorizontal);
    balaHorizontal.visible = false;

    balaVertical = juego.add.sprite(400, 0, 'bala');
    juego.physics.arcade.enable(balaVertical);
    balaVertical.visible = false;

    salto = juego.input.keyboard.addKey(Phaser.Keyboard.UP);
    izquierda = juego.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    derecha = juego.input.keyboard.addKey(Phaser.Keyboard.RIGHT);

    // Toggle auto/manual con tecla A
    var teclaAuto = juego.input.keyboard.addKey(Phaser.Keyboard.A);
    teclaAuto.onDown.add(() => {
      modoAuto = !modoAuto;
      if (modoAuto) {
        entrenarIA();
      }
    });

    // Disparo automático
    setInterval(() => {
      if (!balaHorizontal.visible) {
        dispararHorizontal();
      } else if (!balaVertical.visible) {
        dispararVertical();
      }
    }, 2000);
  }

  function update() {
    juego.physics.arcade.collide(jugador, balaHorizontal, colision, null, this);
    juego.physics.arcade.collide(jugador, balaVertical, colision, null, this);

    jugador.body.velocity.x = 0;

    if (!modoAuto) {
      if (izquierda.isDown) {
        jugador.body.velocity.x = -150;
        jugador.animations.play('caminar');
        izquierdaPresionada = true;
        derechaPresionada = false;
      } else if (derecha.isDown) {
        jugador.body.velocity.x = 150;
        jugador.animations.play('caminar');
        derechaPresionada = true;
        izquierdaPresionada = false;
      } else {
        jugador.animations.stop();
        jugador.frame = 1;
        izquierdaPresionada = false;
        derechaPresionada = false;
      }

      if (salto.isDown && jugador.body.touching.down) {
        jugador.body.velocity.y = -250;
      }

      if (balaHorizontal.visible || balaVertical.visible) {
        datosEntrenamiento.push({
          input: {
            jugadorX: normalizar(jugador.x, 0, w),
            jugadorY: normalizar(jugador.y, 0, h),
            balaHX: normalizar(balaHorizontal.x, 0, w),
            balaHY: normalizar(balaHorizontal.y, 0, h),
            balaVX: normalizar(balaVertical.x, 0, w),
            balaVY: normalizar(balaVertical.y, 0, h)
          },
          output: {
            izquierda: izquierdaPresionada ? 1 : 0,
            derecha: derechaPresionada ? 1 : 0,
            salto: salto.isDown ? 1 : 0
          }
        });
      }
    } else {
      let output = redNeuronal.run({
        jugadorX: normalizar(jugador.x, 0, w),
        jugadorY: normalizar(jugador.y, 0, h),
        balaHX: normalizar(balaHorizontal.x, 0, w),
        balaHY: normalizar(balaHorizontal.y, 0, h),
        balaVX: normalizar(balaVertical.x, 0, w),
        balaVY: normalizar(balaVertical.y, 0, h)
      });

      if (output.izquierda > 0.5) {
        jugador.body.velocity.x = -150;
        jugador.animations.play('caminar');
      } else if (output.derecha > 0.5) {
        jugador.body.velocity.x = 150;
        jugador.animations.play('caminar');
      } else {
        jugador.animations.stop();
        jugador.frame = 1;
      }

      if (output.salto > 0.5 && jugador.body.touching.down) {
        jugador.body.velocity.y = -250;
      }
    }

    if (balaHorizontal.visible) {
      balaHorizontal.x -= 5;
      if (balaHorizontal.x < -20) {
        balaHorizontal.visible = false;
        balaHorizontal.x = nave.x;
        balaHorizontal.y = nave.y;
      }
    }

    if (balaVertical.visible) {
      balaVertical.y += 5;
      if (balaVertical.y > h + 20) {
        balaVertical.visible = false;
        balaVertical.x = 400;
        balaVertical.y = 0;
      }
    }
  }

  function dispararHorizontal() {
    balaHorizontal.visible = true;
    balaHorizontal.x = nave.x;
    balaHorizontal.y = nave.y;
  }

  function dispararVertical() {
    balaVertical.visible = true;
    balaVertical.x = jugador.x + Math.random() * 200 - 100;
    balaVertical.y = 0;
  }

  function colision() {
    jugador.x = 50;
    jugador.y = h - 100;
  }

  function entrenarIA() {
    if (datosEntrenamiento.length > 0) {
      redNeuronal.train(datosEntrenamiento, {
        iterations: 2000,
        errorThresh: 0.005,
        log: true
      });
      console.log("IA entrenada");
    } else {
      console.log("No hay suficientes datos para entrenar");
    }
  }

  function normalizar(valor, min, max) {
    return (valor - min) / (max - min);
  }
};
