# Red Neuronal para Identificación de Emociones con MediaPipe (Aplicación a Imagen)

## Tipo de Red Neuronal

* **Perceptrón Multicapa (MLP)** o red neuronal **feedforward**.

## Partes de la Red Neuronal

1.  **Capa de Entrada**:
    * Recibe los valores de los landmarks de MediaPipe.
    * En la imagen estos serian los valores (x, y, z) de puntos como 260, 467, 342, 280, 50, 187, 427, 117, 343, etc.
2.  **Capas Ocultas**:
    * Capas intermedias para calculos complejos y deteccion de patrones.
    * Con una o dos capas ocultas esta bien.
3.  **Capa de Salida**:
    * Entrega la emocion detectada.
    * El numero de neuronas depende de la catidad de emociones a dectectar. 

## Patrones a Utilizar

* Combinaciones de valores de landmarks correspondientes a expresiones faciales:
    * Cejas levantadas y ojos abiertos seria la sorpresa.
    * Cejas fruncidas y labios apretados seria el enojo.
    * comisuras de los labios levantadas seria la Felicidad.

## Función de Activación

* **ReLU (Rectified Linear Unit)** en capas ocultas.
* **Softmax** en la capa de salida para obtener probabilidades de cada emocion.

## Número Máximo de Entradas

* 468 landmarks \* 3 valores (x, y, z) = 1404 entradas.
* En la imagen se tomarian los valores (x, y, z) de cada uno de los puntos numerados visibles.

## Valores de Salida Esperados

* Probabilidades de cada emocion:
    * Ejemplo: Feliz: 0.9, Triste: 0.1, Enojado: 0.05.

## Aplicación a la Imagen

* **Datos de Entrada**:
    * Se extraen las coordenadas (x, y, z) de cada landmark numerado en la imagen (260, 467, 342, etc.).
    * Estos valores (x, y, z) se introducen en la capa de entrada de la red neuronal.
* **Proceso**:
    * La red procesa estos datos a traves de las capas ocultas.
    * La capa de salida proporciona las probabilidades de cada emocion.
    * Se selecciona la emocion con la probabilidad mas alta.

## Enfoque en los Números de la Imagen

* Los numeros en la imagen (260, 467, 342, etc.) son los identificadores de los landmarks.
* Para cada uno de estos numeros, se extraen sus coordenadas (x, y, z) para usarlas como datos de entrada.


## Números Específicos de la Imagen y Datos de Entrada

* **Identificación de Landmarks**:
    * La imagen muestra numeros como 260, 467, 342, 363, etc., que son los identificadores unicos de los landmarks faciales.
    * Cada uno de estos números corresponde a un punto específico en la malla facial detectada por MediaPipe.
* **Extracción de Coordenadas**:
    * Para cada landmark identificado por su numero, se extraen las coordenadas tridimensionales (x, y, z).
    * Ejemplo:
        * Landmark 260: (x=valor_x_260, y=valor_y_260, z=valor_z_260)
        * Landmark 467: (x=valor_x_467, y=valor_y_467, z=valor_z_467)
        * Y asi sucesivamente para todos los landmarks visibles en la imagen.
* **Datos de Entrada para la Red Neuronal**:
    * Los valores (x, y, z) obtenidos para cada landmark se concatenan para formar un vector de entrada.
    * Este vector de entrada representa la configuracion espacial de la cara en la imagen.
    * El numero total de entradas sera 468 landmarks x 3 coordenadas = 1404 valores.
* **Importancia de los Landmarks**:
    * La posicion relativa de estos puntos (landmarks) y sus coordenadas (x, y, z) contienen informacion crucial sobre la exprecion de la geta.
    * Por ejemplo:
        * La distancia entre los landmarks de las cejas y los ojos puede indicar sorpresa o asombro.
        * La curvatura de los landmarks alrededor de la boca puede indicar una sonrisa o mueca.
* **Procesamiento por la Red Neuronal**:
    * La red neuronal procesa estos valores de entrada para detectar patrones y correlaciones que se asocian con diferentes emociones.
    * Las capas ocultas de la red aprenden a extraer caracteristicas relevantes de los datos de entrada.
    * La capa de salida genera las probabilidades de cada emocion.

## Valores Máximos del Bias

* Valores pequeños aleatorios. No hay un maximo fijo.

