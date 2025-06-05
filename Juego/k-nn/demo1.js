// Global game variables
var w = 800;
var h = 400;
var jugador; // El personaje principal
var fondo;   // El fondo del juego

var balaHorizontal, balaHorizontalD = false, nave; // La bala horizontal, estado de disparo de la bala horizontal, y la nave enemiga
var balaVertical, balaVerticalD = false; // La bala vertical, estado de disparo de la bala vertical

var salto; // Tecla para saltar
var izquierda; // Tecla para moverse a la izquierda
var izquierdaPresionada = false; // Flag para rastrear si la tecla izquierda está actualmente presionada
var derecha; // Tecla para moverse a la derecha
var derechaPresionada = false; // Flag para rastrear si la tecla derecha está actualmente presionada
var menu;    // Menú de pausa
var pausaL;  // Texto de pausa

// Inicializamos a 0 para evitar 'undefined' en render() antes del primer disparo
var velocidadBalaHorizontal = 0; // Velocidad horizontal de la bala horizontal
var velocidadBalaVertical = 0;   // Velocidad vertical de la bala vertical
var despBalaHorizontal;      // Desplazamiento horizontal de la bala horizontal respecto al jugador
var despBalaVertical;        // Desplazamiento vertical de la bala vertical respecto al jugador
var estatusAire;     // Estado: 1 si el jugador está en el aire, 0 si no
var estatuSuelo;     // Estado: 1 si el jugador está en el suelo, 0 si no

var modoAuto = false; // true para modo automático (IA), false para modo manual
var eCompleto = false; // Variable no utilizada en esta implementación, pero mantenida del código original

// Array para almacenar los datos de entrenamiento
// Cada entrada será un objeto: { input: [despBalaHorizontal, velocidadBalaHorizontal, despBalaVertical, velocidadBalaVertical], output: [didJump, didMoveLeft, didMoveRight] }
var datosEntrenamiento = [];

// Variable para rastrear si hubo una colisión en el fotograma actual
var collisionThisFrame = false;

// Define los rangos para cada característica para la normalización (Min-Max Scaling)
// Estos rangos deben cubrir los valores posibles en tu juego para una normalización efectiva.
// Se han ajustado para ser más robustos y incluir el 0 para velocidades.
const featureRanges = {
    // despBalaHorizontal: jugador.x - balaHorizontal.x
    despBalaHorizontal: { min: -750, max: 100 },
    // velocidadBalaHorizontal: Es un valor negativo ya que la bala se mueve de derecha a izquierda.
    velocidadBalaHorizontal: { min: -400, max: 0 },
    // despBalaVertical: jugador.y - balaVertical.y
    despBalaVertical: { min: -100, max: 400 },
    // velocidadBalaVertical: Es un valor positivo ya que la bala se mueve de arriba a abajo.
    velocidadBalaVertical: { min: 0, max: 400 }
};

/**
 * Normaliza un valor a un rango entre 0 y 1.
 * @param {number} value El valor original.
 * @param {number} min El valor mínimo posible para esta característica.
 * @param {number} max El valor máximo posible para esta característica.
 * @returns {number} El valor normalizado.
 */
function normalize(value, min, max) {
    if (max === min) return 0; // Evitar división por cero
    return (value - min) / (max - min);
}


// Inicialización del juego Phaser
var juego = new Phaser.Game(w, h, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });

/**
 * Precarga de los recursos del juego (imágenes, spritesheets).
 */
function preload() {
    juego.load.image('fondo', 'assets/game/fondo.png');
    juego.load.spritesheet('mono', 'assets/sprites/altair.png', 32, 48);
    juego.load.image('nave', 'assets/game/ufo.png');
    juego.load.image('bala', 'assets/sprites/purple_ball.png');
    juego.load.image('menu', 'assets/game/menu.png');
}

/**
 * Configuración inicial del juego: creación de objetos, físicas, etc.
 */
function create() {
    // Iniciar el sistema de físicas Arcade
    juego.physics.startSystem(Phaser.Physics.ARCADE);
    // Establecer la gravedad vertical
    juego.physics.arcade.gravity.y = 800;
    juego.time.desiredFps = 30;

    // Crear el fondo que se desplaza
    fondo = juego.add.tileSprite(0, 0, w, h, 'fondo');
    // Crear la nave enemiga
    nave = juego.add.sprite(w - 100, h - 70, 'nave');
    // Crear la bala horizontal
    balaHorizontal = juego.add.sprite(w - 100, h, 'bala');

    // Crear el jugador
    jugador = juego.add.sprite(50, h, 'mono');

    // Create the vertical bullet at the player's initial X position
    balaVertical = juego.add.sprite(jugador.position.x, 0, 'bala');

    // Habilitar físicas para el jugador
    juego.physics.enable(jugador);
    // Asegurar que el jugador no salga de los límites del mundo
    jugador.body.collideWorldBounds = true;
    // Añadir la animación de correr al jugador
    var corre = jugador.animations.add('corre', [8, 9, 10, 11]);
    // Reproducir la animación de correr
    jugador.animations.play('corre', 10, true);

    // Habilitar físicas para la bala horizontal
    juego.physics.enable(balaHorizontal);
    // Asegurar que la bala horizontal no salga de los límites del mundo (o que su lógica de reinicio lo maneje)
    balaHorizontal.body.collideWorldBounds = true;

    // Habilitar físicas para la bala vertical
    juego.physics.enable(balaVertical);
    // IMPORTANTE: Permitir que la bala vertical salga por la parte inferior del mundo
    // para que podamos detectarla y reiniciarla correctamente. Si está en 'true',
    // se quedará "pegada" en el borde inferior.
    balaVertical.body.collideWorldBounds = false;

    // Crear el texto de "Pausa"
    pausaL = juego.add.text(w - 100, 20, 'Pausa', { font: '20px Arial', fill: '#fff' });
    // Habilitar la interacción con el texto de pausa
    pausaL.inputEnabled = true;
    // Asignar la función pausa al hacer clic en el texto
    pausaL.events.onInputUp.add(pausa, self);
    // Asignar la función mPausa al hacer clic en cualquier parte de la pantalla
    juego.input.onDown.add(mPausa, self);

    // Asignar la tecla ESPACIO para saltar
    salto = juego.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    // Asignar la tecla FLECHA IZQUIERDA para moverse a la izquierda
    izquierda = juego.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    // Asignar la tecla FLECHA DERECHA para moverse a la derecha
    derecha = juego.input.keyboard.addKey(Phaser.Keyboard.RIGHT);

    // Escuchar eventos de presionar/soltar teclas para el movimiento izquierda/derecha
    izquierda.onDown.add(() => { izquierdaPresionada = true; });
    izquierda.onUp.add(() => { izquierdaPresionada = false; });
    derecha.onDown.add(() => { derechaPresionada = true; });
    derecha.onUp.add(() => { derechaPresionada = false; });
}

/**
 * Función de "árbol de decisión" (implementación de K-Nearest Neighbor).
 * Decide si el jugador debe saltar o moverse basándose en los datos de entrenamiento.
 * @param {number} currentDespBalaHorizontal Desplazamiento actual de la bala horizontal.
 * @param {number} currentVelocidadBalaHorizontal Velocidad actual de la bala horizontal.
 * @param {number} currentDespBalaVertical Desplazamiento actual de la bala vertical.
 * @param {number} currentVelocidadBalaVertical Velocidad actual de la bala vertical.
 * @returns {Array<boolean>} Un array que indica [debeSaltar, debeMoverIzquierda, debeMoverDerecha].
 */
function decisionTree(currentDespBalaHorizontal, currentVelocidadBalaHorizontal, currentDespBalaVertical, currentVelocidadBalaVertical) {
    if (datosEntrenamiento.length === 0) {
        return [false, false, false];
    }

    const K = 5; // <--- Puedes ajustar este valor para el K-NN (debe ser impar para evitar empates)
    let neighbors = []; // Array para almacenar [distance, action]

    // Normalizar las características de entrada actuales
    const normalizedCurrentDespBalaHorizontal = normalize(currentDespBalaHorizontal, featureRanges.despBalaHorizontal.min, featureRanges.despBalaHorizontal.max);
    const normalizedCurrentVelocidadBalaHorizontal = normalize(currentVelocidadBalaHorizontal, featureRanges.velocidadBalaHorizontal.min, featureRanges.velocidadBalaHorizontal.max);
    const normalizedCurrentDespBalaVertical = normalize(currentDespBalaVertical, featureRanges.despBalaVertical.min, featureRanges.despBalaVertical.max);
    const normalizedCurrentVelocidadBalaVertical = normalize(currentVelocidadBalaVertical, featureRanges.velocidadBalaVertical.min, featureRanges.velocidadBalaVertical.max);

    for (let i = 0; i < datosEntrenamiento.length; i++) {
        const data = datosEntrenamiento[i];
        // Los datos de entrada almacenados ya deberían estar normalizados
        const recordedNormalizedDespBalaHorizontal = data.input[0];
        const recordedNormalizedVelocidadBalaHorizontal = data.input[1];
        const recordedNormalizedDespBalaVertical = data.input[2];
        const recordedNormalizedVelocidadBalaVertical = data.input[3];
        const recordedActions = data.output; // [didJump, didMoveLeft, didMoveRight]

        // Calcular la distancia euclidiana entre el estado actual y el estado registrado
        const distance = Math.sqrt(
            Math.pow(normalizedCurrentDespBalaHorizontal - recordedNormalizedDespBalaHorizontal, 2) +
            Math.pow(normalizedCurrentVelocidadBalaHorizontal - recordedNormalizedVelocidadBalaHorizontal, 2) +
            Math.pow(normalizedCurrentDespBalaVertical - recordedNormalizedDespBalaVertical, 2) +
            Math.pow(normalizedCurrentVelocidadBalaVertical - recordedNormalizedVelocidadBalaVertical, 2)
        );

        neighbors.push({ distance: distance, actions: recordedActions });
    }

    // Ordenar por distancia y tomar los K más cercanos
    neighbors.sort((a, b) => a.distance - b.distance);
    const kNearest = neighbors.slice(0, K);

    // Votar sobre las acciones
    let voteJump = 0;
    let voteLeft = 0;
    let voteRight = 0;

    for (let i = 0; i < kNearest.length; i++) {
        if (kNearest[i].actions[0]) voteJump++;
        if (kNearest[i].actions[1]) voteLeft++;
        if (kNearest[i].actions[2]) voteRight++;
    }

    // Tomar la decisión por mayoría simple
    // Un umbral de K/2 asegura que si hay K votos, se necesite más de la mitad para una decisión.
    const threshold = K / 2;
    const finalJump = voteJump > threshold;
    const finalLeft = voteLeft > threshold;
    const finalRight = voteRight > threshold;

    return [finalJump, finalLeft, finalRight];
}

/**
 * Pone el juego en pausa y muestra el menú.
 */
function pausa() {
    juego.paused = true;
    menu = juego.add.sprite(w / 2, h / 2, 'menu');
    menu.anchor.setTo(0.5, 0.5);
}

/**
 * Maneja los clics del ratón cuando el juego está en pausa (interacción con el menú).
 * @param {Phaser.Pointer} event El evento del puntero.
 */
function mPausa(event) {
    if (juego.paused) {
        // Calcular las coordenadas del menú
        var menu_x1 = w / 2 - 270 / 2, menu_x2 = w / 2 + 270 / 2,
            menu_y1 = h / 2 - 180 / 2, menu_y2 = h / 2 + 180 / 2;

        // Obtener las coordenadas del clic del ratón
        var mouse_x = event.x,
            mouse_y = event.y;

        // Comprobar si el clic fue dentro del área del menú
        if (mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2) {
            // Si el clic fue en la parte superior del menú (Entrenamiento)
            if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 && mouse_y <= menu_y1 + 90) {
                eCompleto = false; // Reiniciar estado de entrenamiento (no utilizado directamente aquí)
                datosEntrenamiento = []; // Borrar todos los datos de entrenamiento
                modoAuto = false; // Cambiar a modo manual
                console.log("Modo: Entrenamiento (datos borrados)");
            }
            // Si el clic fue en la parte inferior del menú (Modo Auto)
            else if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 + 90 && mouse_y <= menu_y2) {
                modoAuto = true; // Cambiar a modo automático
                console.log("Modo: Automático");
            }

            // Destruir el menú y reanudar el juego
            menu.destroy();
            resetVariables();
            juego.paused = false;
        }
    }
}

/**
 * Reinicia las variables y posiciones de los objetos del juego.
 */
function resetVariables() {
    jugador.body.velocity.x = 0;
    jugador.body.velocity.y = 0;

    balaHorizontal.body.velocity.x = 0;
    balaHorizontal.position.x = w - 100;
    balaHorizontalD = false; // La bala horizontal no ha sido disparada

    balaVertical.body.velocity.y = 0;
    balaVertical.position.y = 0;
    balaVertical.position.x = jugador.position.x; // Reset to player's current X
    balaVerticalD = false; // La bala vertical no ha sido disparada

    jugador.position.x = 50;
}

/**
 * Hace que el jugador salte.
 */
function saltar() {
    jugador.body.velocity.y = -270; // Aplica una velocidad vertical negativa para saltar
}

/**
 * Hace que el jugador se mueva a la izquierda.
 */
function moverIzquierda() {
    jugador.body.velocity.x = -150; // Aplica una velocidad horizontal negativa para moverse a la izquierda
}

/**
 * Hace que el jugador se mueva a la derecha.
 */
function moverDerecha() {
    jugador.body.velocity.x = 150; // Aplica una velocidad horizontal positiva para moverse a la derecha
}

/**
 * Lanza las balas si no están activas.
 * Esta es una implementación que asegura que las balas se lancen periódicamente.
 */
function disparo() {
    // Si la bala horizontal no está activa, lánzala desde la derecha.
    if (!balaHorizontalD) {
        velocidadBalaHorizontal = velocidadRandom(75, 200) * -1; // Velocidad negativa para ir a la izquierda
        balaHorizontal.body.velocity.x = velocidadBalaHorizontal;
        balaHorizontal.position.y = h - 48; // A la altura del suelo del jugador
        balaHorizontal.position.x = w - 100; // Desde la derecha de la pantalla
        balaHorizontalD = true;
    }

    // Si la bala vertical no está activa, lánzala desde arriba en la posición X del jugador.
    if (!balaVerticalD) {
        velocidadBalaVertical = velocidadRandom(75, 200); // Velocidad positiva para ir hacia abajo
        balaVertical.body.velocity.y = velocidadBalaVertical;
        balaVertical.position.x = jugador.position.x; // En la X del jugador
        balaVertical.position.y = 0; // Desde la parte superior de la pantalla
        balaVerticalD = true;
    }
}


/**
 * Bucle principal de actualización del juego.
 * Se ejecuta en cada fotograma.
 */
function update() {
    // Restablecer el flag de colisión al inicio de cada fotograma
    collisionThisFrame = false;

    // Desplazar el fondo para simular movimiento
    fondo.tilePosition.x -= 1;

    // Detectar colisión entre la bala horizontal y el jugador
    juego.physics.arcade.collide(balaHorizontal, jugador, colisionH, null, this);
    // Detectar colisión entre la bala vertical y el jugador
    juego.physics.arcade.collide(balaVertical, jugador, colisionH, null, this);

    // Determinar el estado del jugador (en el suelo o en el aire)
    estatuSuelo = 1;
    estatusAire = 0;
    if (!jugador.body.onFloor()) {
        estatuSuelo = 0;
        estatusAire = 1;
    }

    // Reiniciar la velocidad horizontal del jugador antes de verificar la entrada
    // para evitar el movimiento continuo después de soltar la tecla
    jugador.body.velocity.x = 0;

    // Calcular el desplazamiento y la velocidad de las balas respecto al jugador
    // Asegurarse de que el valor sea un número antes de asignar
    despBalaHorizontal = Math.floor(jugador.position.x - balaHorizontal.position.x);
    velocidadBalaHorizontal = balaHorizontal.body.velocity.x; // Obtener la velocidad real de la bala

    despBalaVertical = Math.floor(jugador.position.y - balaVertical.position.y);
    velocidadBalaVertical = balaVertical.body.velocity.y; // Obtener la velocidad real de la bala


    // Lógica para el modo manual
    if (modoAuto == false) {
        let didJump = false;
        let didMoveLeft = false;
        let didMoveRight = false;

        // Si la tecla de salto está presionada y el jugador está en el suelo, saltar
        if (salto.isDown && jugador.body.onFloor()) {
            saltar();
            didJump = true;
        }
        // Si la tecla izquierda está presionada
        if (izquierdaPresionada) {
            moverIzquierda();
            didMoveLeft = true;
        }
        // Si la tecla derecha está presionada
        if (derechaPresionada) {
            moverDerecha();
            didMoveRight = true;
        }

        // Recolectar datos de entrenamiento:
        // 1. Si hay alguna bala activa Y NO hubo colisión en este fotograma.
        // 2. O si NO hay balas activas, para enseñar al AI a no hacer nada si no hay amenaza.
        if ((balaHorizontalD || balaVerticalD || (!balaHorizontalD && !balaVerticalD)) && !collisionThisFrame) {
            // Normalizar las características ANTES de guardarlas en datosEntrenamiento
            // Usamos || 0 para asegurarnos de que sean números válidos si por alguna razón fueran undefined/null
            const normalizedDespBalaHorizontal = normalize(despBalaHorizontal || 0, featureRanges.despBalaHorizontal.min, featureRanges.despBalaHorizontal.max);
            const normalizedVelocidadBalaHorizontal = normalize(velocidadBalaHorizontal || 0, featureRanges.velocidadBalaHorizontal.min, featureRanges.velocidadBalaHorizontal.max);
            const normalizedDespBalaVertical = normalize(despBalaVertical || 0, featureRanges.despBalaVertical.min, featureRanges.despBalaVertical.max);
            const normalizedVelocidadBalaVertical = normalize(velocidadBalaVertical || 0, featureRanges.velocidadBalaVertical.min, featureRanges.velocidadBalaVertical.max);

            datosEntrenamiento.push({
                'input': [normalizedDespBalaHorizontal, normalizedVelocidadBalaHorizontal, normalizedDespBalaVertical, normalizedVelocidadBalaVertical],
                'output': [didJump, didMoveLeft, didMoveRight]
            });
        }
    }

    // Lógica para el modo automático
    if (modoAuto == true) {
        // Asegúrate de pasar valores numéricos al decisionTree
        let actions = decisionTree(
            despBalaHorizontal || 0,
            velocidadBalaHorizontal || 0,
            despBalaVertical || 0,
            velocidadBalaVertical || 0
        );
        if (actions[0] && jugador.body.onFloor()) { // Debe saltar
            saltar();
        }
        if (actions[1]) { // Debe moverse a la izquierda
            moverIzquierda();
        }
        if (actions[2]) { // Debe moverse a la derecha
            moverDerecha();
        }
    }

    // Reiniciar las balas si salen de la pantalla
    // La bala horizontal puede ir de derecha a izquierda o viceversa si colide y rebota
    if (balaHorizontal.position.x <= 0 || balaHorizontal.position.x >= w) {
        balaHorizontalD = false;
        balaHorizontal.body.velocity.x = 0;
        balaHorizontal.position.x = w - 100; // Reiniciar en el borde derecho
    }

    // La bala vertical siempre va de arriba a abajo
    if (balaVertical.position.y >= h) {
        balaVerticalD = false;
        balaVertical.body.velocity.y = 0;
        balaVertical.position.y = 0; // Reiniciar en el borde superior
        balaVertical.position.x = jugador.position.x; // En la X del jugador
    }

    // Asegurarse de que las balas se lancen si no están activas
    if (!balaHorizontalD || !balaVerticalD) { // Llama a disparo si alguna no está activa
        disparo();
    }
}

/**
 * Función que se ejecuta al colisionar una bala con el jugador.
 * Pone el juego en pausa y elimina el último dato de entrenamiento si estamos en modo manual.
 */
function colisionH() {
    collisionThisFrame = true; // Establecer el flag cuando ocurre una colisión

    // Si estamos en modo manual y hay datos de entrenamiento,
    // eliminamos el último valor para evitar que un dato de colisión contamine el aprendizaje.
    if (modoAuto === false && datosEntrenamiento.length > 0) {
        datosEntrenamiento.pop(); // Elimina el último elemento del array
        console.log("Colisión en modo manual: Último dato de entrenamiento eliminado. Datos restantes:", datosEntrenamiento.length);
    }

    pausa(); // Pausa el juego como siempre
}

/**
 * Genera un número entero aleatorio entre un mínimo y un máximo (inclusive).
 * @param {number} min El valor mínimo.
 * @param {number} max El valor máximo.
 * @returns {number} Un número aleatorio.
 */
function velocidadRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Función de renderizado (para depuración).
 */
function render() {
    juego.debug.text('Modo: ' + (modoAuto ? 'AUTO' : 'MANUAL'), 32, 20);
    juego.debug.text('Datos Entrenamiento: ' + datosEntrenamiento.length, 32, 40);

    // Valores crudos (sin normalizar), usando || 0 para manejar undefined al inicio
    juego.debug.text('D.H (Raw): ' + (despBalaHorizontal || 0), 32, 60);
    juego.debug.text('V.H (Raw): ' + (velocidadBalaHorizontal || 0), 32, 80);
    juego.debug.text('D.V (Raw): ' + (despBalaVertical || 0), 32, 100);
    juego.debug.text('V.V (Raw): ' + (velocidadBalaVertical || 0), 32, 120);

    // Valores normalizados para depuración
    // Asegúrate de que las variables tengan un valor numérico antes de normalizar
    const normalizedDespBalaHorizontal = normalize(despBalaHorizontal || 0, featureRanges.despBalaHorizontal.min, featureRanges.despBalaHorizontal.max);
    const normalizedVelocidadBalaHorizontal = normalize(velocidadBalaHorizontal || 0, featureRanges.velocidadBalaHorizontal.min, featureRanges.velocidadBalaHorizontal.max);
    const normalizedDespBalaVertical = normalize(despBalaVertical || 0, featureRanges.despBalaVertical.min, featureRanges.despBalaVertical.max);
    const normalizedVelocidadBalaVertical = normalize(velocidadBalaVertical || 0, featureRanges.velocidadBalaVertical.min, featureRanges.velocidadBalaVertical.max);

    juego.debug.text('D.H (Norm): ' + normalizedDespBalaHorizontal.toFixed(2), 200, 60);
    juego.debug.text('V.H (Norm): ' + normalizedVelocidadBalaHorizontal.toFixed(2), 200, 80);
    juego.debug.text('D.V (Norm): ' + normalizedDespBalaVertical.toFixed(2), 200, 100);
    juego.debug.text('V.V (Norm): ' + normalizedVelocidadBalaVertical.toFixed(2), 200, 120);

    if (modoAuto && datosEntrenamiento.length > 0) {
        let actions = decisionTree(
            despBalaHorizontal || 0,
            velocidadBalaHorizontal || 0,
            despBalaVertical || 0,
            velocidadBalaVertical || 0
        );
        juego.debug.text('AI Jump: ' + actions[0], 32, 140);
        juego.debug.text('AI Left: ' + actions[1], 32, 160);
        juego.debug.text('AI Right: ' + actions[2], 32, 180);
    }
}