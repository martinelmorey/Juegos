# Rem Enterprises Arcade — UI/UX scorecard de lanzamiento

## Alcance y método

Auditoría de la portada y los 16 juegos sobre:

+ las 34 capturas reales de `tests/artifacts/current` revisadas manualmente a 390 × 844 y 592 × 1280;
+ 17 capturas técnicas adicionales a 320 × 844, usadas para comprobar layout y targets táctiles pero no puntuadas manualmente;
- el HTML, CSS y JavaScript actual de cada superficie;
- una ejecución local de `npm run test:layout`.

Resultado técnico de la corrida: `PASS layout: 51 screenshots, 17 routes, 3 viewports, 0 layout violations`.

La puntuación usa una escala de 1 a 5:

- 1: bloqueado o ausente;
- 2: insuficiente para lanzamiento;
- 3: funcional con deuda visible;
- 4: sólido con ajustes concretos pendientes;
- 5: resuelto para el alcance auditado.

Los hallazgos no califican una pantalla como simplemente linda o fea. Cada uno identifica el elemento, la causa observable en captura o implementación y el resultado verificable esperado. Las capturas muestran el estado preparado por `tests/visual/routes.js`; los estados finales que no aparecen en ese instante se contrastaron con el JavaScript actual.

## Resumen de puntuaciones

| Superficie | Jerarquía | Legibilidad | Controles | Feedback | Identidad | Accesibilidad | Terminación |
|---|---:|---:|---:|---:|---:|---:|---:|
| Portada | 4 | 3 | 4 | 3 | 4 | 3 | 3 |
| Snake | 4 | 4 | 4 | 3 | 4 | 2 | 3 |
| Pong | 4 | 4 | 4 | 3 | 4 | 2 | 3 |
| Breakout | 4 | 4 | 4 | 3 | 4 | 2 | 3 |
| Memory | 4 | 4 | 5 | 3 | 4 | 2 | 3 |
| 2048 | 4 | 4 | 4 | 2 | 4 | 3 | 3 |
| Astro Dodge | 4 | 4 | 4 | 3 | 5 | 2 | 3 |
| Connect 4 | 4 | 4 | 5 | 3 | 4 | 2 | 3 |
| Whack-a-Pixel | 4 | 4 | 5 | 3 | 4 | 2 | 3 |
| Color Rush | 4 | 4 | 5 | 4 | 4 | 3 | 4 |
| Tic Tac Toe | 4 | 4 | 5 | 3 | 4 | 2 | 3 |
| Simon Pulse | 4 | 4 | 5 | 3 | 5 | 3 | 3 |
| Piedra Papel | 4 | 4 | 5 | 4 | 4 | 4 | 4 |
| Math Sprint | 4 | 5 | 5 | 3 | 4 | 3 | 3 |
| Cofre Rush | 4 | 3 | 4 | 3 | 5 | 2 | 3 |
| Tetris | 4 | 4 | 5 | 4 | 5 | 3 | 4 |
| REM Runner | 3 | 3 | 4 | 3 | 5 | 2 | 3 |

## Deuda ya resuelta

- Targets táctiles: resuelto para las 17 rutas en las dos medidas auditadas. La prueba recorre enlaces, botones, inputs y elementos con rol de botón y exige al menos 44 × 44 px.
- Overflow y clipping horizontal: resuelto en la matriz actual. Shell, stage, HUD, panel, tablero y controles permanecen dentro del viewport.
- Tetris móvil: resuelto el recorte del panel lateral mediante composición en columna.
- REM Runner móvil: resuelta la deformación estructural del canvas; conserva relación 16:9 en el layout actual.
- Reducción de movimiento CSS: las capas compartidas y Tetris incluyen `prefers-reduced-motion`, y las capturas fueron generadas con movimiento reducido. Esto reduce transiciones/animaciones CSS, pero no detiene los bucles `requestAnimationFrame` ni el movimiento dibujado en Canvas de los juegos compartidos, Tetris o REM Runner; esa deuda sigue pendiente y se prioriza abajo con criterios acotados por juego.

Los cuatro primeros puntos no se repiten abajo como deuda pendiente. Pasar layout ni reducir CSS certifica por sí solo comprensión, feedback de estado, movimiento reducido en Canvas ni accesibilidad semántica.

## Hallazgos por superficie

### 1. Portada

1. P1 — Pantalla: portada móvil. Elemento: textos descriptivos de las 16 cards. Causa: a 390 px, `mobile-layout.css` reduce `.home .card span` a 8 px, por debajo de una lectura cómoda aunque no haya clipping. Resultado esperado: descripción legible sin zoom, con un piso tipográfico móvil consistente y sin truncar la promesa del juego. Evidencia: `tests/artifacts/current/home-390x844.png`.
2. P2 — Pantalla: catálogo completo. Elemento: jerarquía de ranking + grilla de 16 juegos. Causa: las cards tienen un peso similar y la portada no propone CTA primario ni agrupaciones; la elección exige recorrer el listado completo. Resultado esperado: validar opcionalmente un CTA o categorías mediante una variante donde la primera acción se identifique antes de la grilla, conservando el arte y la identidad propios de cada juego en vez de homogeneizar las cards. Evidencia: `tests/artifacts/current/home-592x1280.png`.

### 2. Snake

1. P1 — Pantalla: partida activa. Elemento: Canvas, puntaje y estado. Causa: Snake dibuja comida, cuerpo y colisión en Canvas y actualiza un HUD visual, sin una región viva para los hitos. Resultado esperado: mejora parcial verificable: anunciar una vez el inicio, cada energía recogida y la colisión con puntaje final; no se presenta como acceso equivalente al tablero espacial. Evidencia: `tests/artifacts/current/snake-390x844.png`; código: `arcade.js` — `snake()` y `set()`.
2. P2 — Pantalla: controles táctiles. Elemento: botones direccionales. Causa: el nombre accesible se genera con el glifo `↑`, `←`, `↓` o `→`, no con una acción verbal. Resultado esperado: nombres como Mover arriba y Mover izquierda, manteniendo los glifos visibles. Evidencia: `tests/artifacts/current/snake-592x1280.png`.

### 3. Pong

1. P1 — Pantalla: partido. Elemento: marcador, gol y final a 7. Causa: el resultado se actualiza solo en el HUD visual; el Canvas dibuja cancha, paletas y pelota, pero no el resultado. Tampoco hay anuncio programático ni pausa de saque que separe punto y reanudación. Resultado esperado: mejora parcial verificable: anunciar cada cambio de marcador y el ganador, y mostrar un estado breve de saque antes de reanudar; no se presenta como acceso equivalente al seguimiento de la pelota. Evidencia: `tests/artifacts/current/pong-390x844.png`; código: `arcade.js` — `pong()`, `serve()` y `set()`.
2. P2 — Pantalla: control móvil. Elemento: dos botones verticales. Causa: sus nombres accesibles son solo flechas, sin indicar que mueven la paleta. Resultado esperado: controles anunciados como Mover paleta arriba y Mover paleta abajo. Evidencia: `tests/artifacts/current/pong-592x1280.png`.

### 4. Breakout

1. P1 — Pantalla: partida. Elemento: HUD de progreso y condición de derrota. Causa: el HUD informa puntaje o bloques restantes, pero no comunica antes de jugar que una sola caída termina la partida. Resultado esperado: mostrar la regla de intento único o un contador de vidas estable durante la partida. Evidencia: `tests/artifacts/current/breakout-390x844.png`.
2. P1 — Pantalla: partida y final. Elemento: Canvas y mensajes. Causa: bloques, pelota y pala se dibujan en Canvas, mientras los cambios críticos quedan en un HUD visual. Resultado esperado: mejora parcial verificable: anunciar bloques restantes solo cuando cambia el total, y anunciar caída o nivel completado una vez; no se promete representar programáticamente trayectorias o posiciones. Evidencia: `tests/artifacts/current/breakout-592x1280.png`; código: `arcade.js` — `breakout()` y `set()`.

### 5. Memory

1. P1 — Pantalla: tablero de cartas. Elemento: 16 botones `.memory-card`. Causa: el símbolo está en el texto del botón aun cuando se oculta solo con `color: transparent`; un lector puede conocer todas las cartas cerradas. Resultado esperado: carta cerrada anunciada por posición, y símbolo expuesto solo al revelar o resolver. Evidencia: `tests/artifacts/current/memory-390x844.png`.
2. P2 — Pantalla: final de partida. Elemento: mensaje y acción posterior. Causa: al completar parejas cambia el texto del HUD, pero no aparece una acción contextual Jugar otra vez; solo permanece Reiniciar. Resultado esperado: final inequívoco con resultado y CTA de nueva partida. Evidencia: `tests/artifacts/current/memory-592x1280.png`.

### 6. 2048

1. P1 — Pantalla: tablero sin movimientos. Elemento: grilla y HUD. Causa: el JavaScript no detecta ni comunica tablero bloqueado; el usuario puede seguir intentando sin saber que terminó. Resultado esperado: detectar ausencia de movimientos y mostrar fin con puntaje y Jugar otra vez. Evidencia: `tests/artifacts/current/merge-390x844.png`; código: `arcade.js` — `merge()` y `turn()`.
2. P2 — Pantalla: movimiento. Elemento: fichas fusionadas y nueva ficha. Causa: cada redibujado reemplaza el contenido completo y aplica el mismo pop a toda ficha no vacía, sin distinguir fusión de aparición. Resultado esperado: movimiento breve y específico para nueva ficha y fusión, sin animar elementos que no cambiaron. Evidencia: `tests/artifacts/current/merge-592x1280.png`; código: `arcade.js` — `merge()`, `turn()` y `draw()`.

### 7. Astro Dodge

1. P1 — Pantalla: vuelo y colisión. Elemento: Canvas, distancia y derrota. Causa: nave y meteoritos se dibujan en Canvas; el impacto y la distancia final solo cambian el HUD visual. Resultado esperado: mejora parcial verificable: anunciar inicio e impacto una vez con distancia final, sin intentar narrar cada amenaza ni prometer navegación no visual equivalente. Evidencia: `tests/artifacts/current/dodge-390x844.png`; código: `arcade.js` — `dodge()` y `set()`.
2. P2 — Pantalla: HUD durante vuelo. Elemento: distancia. Causa: `set()` actualiza el DOM y dispara animación prácticamente en cada frame, aunque el entero no siempre cambie. Resultado esperado: actualizar solo cuando cambia el valor visible y evitar pulsos continuos que compiten con el juego. Evidencia: `tests/artifacts/current/dodge-592x1280.png`.

### 8. Connect 4

1. P1 — Pantalla: tablero. Elemento: 42 botones `.connect-cell`. Causa: las celdas vacías no tienen nombre accesible ni fila/columna; la interacción visual por columna no se traduce a una estructura comprensible. Resultado esperado: cada opción anuncia columna, disponibilidad y ficha actual. Evidencia: `tests/artifacts/current/connect-390x844.png`; código: `arcade.js` — `connect()`, `draw()` y el handler `b.onclick`.
2. P1 — Pantalla: resultado. Elemento: cuatro fichas ganadoras. Causa: al detectar victoria solo cambia el texto del HUD; no se conserva ni resalta la combinación ganadora. Resultado esperado: marcar visual y programáticamente las cuatro fichas, incluidas diagonales. Evidencia: `tests/artifacts/current/connect-592x1280.png`; código: `arcade.js` — `connect()`, `win()` y `after()`.

### 9. Whack-a-Pixel

1. P1 — Pantalla: tablero reactivo. Elemento: objetivo `.hole.active`. Causa: activo e inactivo se distinguen visualmente por fondo y símbolo, pero no se actualiza nombre, estado ARIA ni instrucción accesible del objetivo actual. Resultado esperado: el objetivo activo se identifica sin depender solo de color o posición visual. Evidencia: `tests/artifacts/current/whack-390x844.png`; código: `arcade.js` — `whack()` y `pop()`.
2. P2 — Pantalla: interacción. Elemento: impacto válido y toque fallido. Causa: un acierto suma y apaga el objetivo, pero no existe feedback diferenciado para fallo; los toques en huecos inactivos no producen respuesta. Resultado esperado: confirmación breve de acierto y señal no intrusiva de fallo, sin bloquear el siguiente toque. Evidencia: `tests/artifacts/current/whack-592x1280.png`; código: `arcade.js` — `whack()`, `pop()` y los handlers `b.onclick`.

### 10. Color Rush

1. P1 — Pantalla: espera, estímulo y resultado. Elemento: botón circular y HUD. Causa: el texto visible evita depender solo del verde, pero los cambios ESPERÁ, AHORA, muy pronto y milisegundos no están asociados a `aria-live`. Resultado esperado: cada transición crítica se anuncia una sola vez y la acción disponible queda clara. Evidencia: `tests/artifacts/current/reaction-390x844.png`.

### 11. Tic Tac Toe

1. P1 — Pantalla: tablero. Elemento: nueve botones `.tic-cell`. Causa: las casillas vacías no tienen nombre de fila/columna y las ocupadas solo exponen × u ○. Resultado esperado: cada casilla anuncia posición, disponibilidad y jugador que la ocupa. Evidencia: `tests/artifacts/current/tic-390x844.png`; código: `arcade.js` — `tic()`, `draw()` y el handler `b.onclick`.
2. P1 — Pantalla: resultado. Elemento: línea ganadora. Causa: se calcula la combinación para decidir el ganador, pero no se guarda ni resalta; solo cambia el HUD. Resultado esperado: fila, columna o diagonal ganadora destacada visualmente y anunciada. Evidencia: `tests/artifacts/current/tic-592x1280.png`; código: `arcade.js` — `tic()`, `winner()` y `after()`.

### 12. Simon Pulse

1. P1 — Pantalla: secuencia y turno. Elemento: cuatro pads y HUD. Causa: los pads tienen nombre, pero demostración, turno de entrada, acierto y error no están en una región viva; el estado depende de iluminación y texto visual. Resultado esperado: anunciar fase y resultado sin revelar la secuencia completa de forma anticipada. Evidencia: `tests/artifacts/current/simon-390x844.png`.
2. P2 — Pantalla: repetición de secuencia. Elemento: indicador de progreso. Causa: el HUD muestra ronda, pero no cuántos pulsos fueron ingresados dentro de la secuencia actual. Resultado esperado: progreso del tipo Paso 2 de 4 durante el turno del jugador. Evidencia: `tests/artifacts/current/simon-592x1280.png`.

### 13. Piedra Papel

1. P2 — Pantalla: rondas consecutivas. Elemento: puntaje rotulado como racha. Causa: `wins` aumenta al ganar pero no vuelve a cero al perder, mientras el HUD usa Racha ganadora o Racha actual. Resultado esperado: o bien reiniciar la racha al perder, o renombrar el valor como Victorias para que número y etiqueta coincidan. Evidencia: `tests/artifacts/current/rps-390x844.png`.

### 14. Math Sprint

1. P1 — Pantalla: desafío. Elemento: promesa contra reloj y HUD. Causa: la card de portada promete Resolver contra reloj, pero la implementación no crea temporizador ni muestra tiempo restante. Resultado esperado: temporizador visible y estado final, o retirar la promesa temporal de la superficie. Evidencia: `tests/artifacts/current/math-390x844.png`; código: `arcade.js` — `math()` y `next()`.
2. P2 — Pantalla: respuesta incorrecta. Elemento: opciones y mensaje. Causa: el error solo cambia el texto general a Probá otra respuesta; la opción pulsada no conserva estado y el mensaje no se anuncia. Resultado esperado: opción errónea identificable por texto/icono además de color, con anuncio breve. Evidencia: `tests/artifacts/current/math-592x1280.png`; código: `arcade.js` — `math()`, `next()` y el handler `btn.onclick`.

### 15. Cofre Rush

1. P1 — Pantalla: laberinto y progreso. Elemento: Canvas, nivel y llegada. Causa: la ruta, el jugador y el cofre se dibujan en Canvas; los cambios de nivel y la llegada solo actualizan el HUD o agregan el panel final. Resultado esperado: mejora parcial verificable: exponer instrucciones iniciales y anunciar cada cambio de nivel y el cofre alcanzado una vez; no se promete describir la ruta ni acceso espacial equivalente. Evidencia: `tests/artifacts/current/maze-390x844.png`; código: `arcade.js` — `maze()`, `load()`, `move()` y `finish()`.
2. P2 — Pantalla: HUD. Elemento: valor numérico decreciente y texto de descuento. Causa: el score arranca cerca de 3000 sin unidad ni relación explícita con el mejor descuento; el usuario debe inferir su significado. Resultado esperado: rotular tiempo y descuento potencial por separado, con unidades estables. Evidencia: `tests/artifacts/current/maze-592x1280.png`.

### 16. Tetris

1. P1 — Pantalla: cabecera. Elemento: navegación de salida. Causa: a diferencia de los juegos compartidos y REM Runner, la página no incluye enlace Volver al arcade. Resultado esperado: salida consistente, visible y alcanzable por teclado y touch. Evidencia: `tests/artifacts/current/tetris-390x844.png`.
2. P1 — Pantalla: partida. Elemento: Canvas, estadísticas y estados de ciclo. Causa: tablero, siguiente pieza y efectos se dibujan en Canvas; puntaje, líneas, nivel, pausa y fin cambian visualmente, y `prefers-reduced-motion` no detiene `requestAnimationFrame` ni la sacudida/partículas de JavaScript. Resultado esperado: mejora parcial verificable: anunciar línea completada, cambio de nivel, pausa y fin una vez —sin narrar cada caída— y, con movimiento reducido, suprimir sacudida, flash y partículas sin alterar controles ni reglas. Evidencia: `tests/artifacts/current/tetris-592x1280.png`; código: `tetris/game.js` — `sweep()`, `updateStats()`, `update()`, `togglePause()` y `gameOver()`.

### 17. REM Runner

1. P2 — Pantalla: controles móviles. Elemento: tres flechas convencionales más RUN, TINTA y FIRE. Causa: TINTA pasa `KeyZ` a `down()`, que cambia el cartucho, y el mismo handler actual de `pointerdown` llama además a `fire()`; la etiqueta comunica una sola acción aunque el toque produce dos. Resultado esperado: separar cambio de cartucho y disparo en controles con una sola responsabilidad, o etiquetar explícitamente la acción combinada; conservar nombres accesibles verbales para las flechas y acciones. Evidencia: `tests/artifacts/current/rem-runner-390x844.png`; código: `rem-runner/index.html` — `.controls`, `.hint` y atributos `data-key`; `rem-runner/src/main.js` — `down()` y handler `pointerdown` de `[data-key]`.
2. P1 — Pantalla: gameplay. Elemento: Canvas, mensaje, calidad y recompensa. Causa: checkpoints, daño, jefe y objetivo se dibujan o actualizan visualmente; `setMessage()` escribe texto, pero `#message` no es una región viva. Resultado esperado: mejora parcial verificable: anunciar una vez pérdida de calidad/checkpoint, reparación o daño al jefe, objetivo cumplido y recompensa; no se promete equivalencia para plataformas, enemigos o puntería. Evidencia: `tests/artifacts/current/rem-runner-592x1280.png`; código: `rem-runner/src/main.js` — `setMessage()`, `update()`, `repair()` y `finish()`.
3. P1 — Pantalla: movimiento reducido. Elemento: bucle Canvas y efectos de gameplay. Causa: `loop()` solicita frames de forma continua y el dibujo usa parallax, partículas y oscilaciones basadas en `performance.now()` aun cuando el sistema pide menos movimiento; la reducción CSS no afecta esas rutinas. Resultado esperado: con `prefers-reduced-motion: reduce`, conservar reglas y controles pero desactivar parallax, oscilaciones decorativas y partículas, y no sostener animación no esencial en Taller, pausa o recompensa; verificarlo instrumentando el media query y los efectos activos. Evidencia: `tests/artifacts/current/rem-runner-390x844.png`; código: `rem-runner/src/main.js` — `loop()`, `drawWorkshop()`, `drawLevel()`, `drawCollectible()` y `addParticles()`.

## Prioridades agregadas de lanzamiento

### P0 — bloquea lanzamiento

- Ninguno sostenido por las capturas, la implementación revisada o la corrida de layout actual.

### P1 — debe cerrarse antes del release candidate

- Aplicar mejoras parciales y verificables en Canvas: Snake (energía/choque/final), Pong (marcador/ganador), Breakout (bloques/caída/final), Astro Dodge (impacto/distancia), Cofre Rush (nivel/cofre), Tetris (línea/nivel/pausa/fin) y REM Runner (calidad/checkpoint/jefe/recompensa), sin describirlas como acceso equivalente al espacio de juego.
- Dar nombre, posición y estado a controles sin semántica suficiente: Connect 4, Tic Tac Toe, Memory, Whack-a-Pixel y flechas táctiles compartidas.
- Hacer inequívocos los resultados: combinación ganadora en Connect 4 y Tic Tac Toe, tablero bloqueado en 2048 y regla de derrota en Breakout.
- Corregir promesa funcional de Math Sprint: implementar reloj o retirar contra reloj.
- Elevar el copy descriptivo de 8 px de la portada a un piso tipográfico móvil medible, sin clipping ni truncado.
- Unificar navegación con Volver al arcade en Tetris.
- Respetar movimiento reducido en JavaScript: en Tetris suprimir sacudida/flash/partículas; en REM Runner suprimir parallax/oscilaciones/partículas y animación no esencial fuera de partida; en los Canvas compartidos mantener bucles solo durante gameplay activo y evitar efectos decorativos continuos.

### P2 — polish posterior a P1

- Refinar feedback específico de aparición/fusión, acierto/fallo y progreso dentro de secuencias.
- Reducir actualizaciones y animaciones de HUD que no representan un cambio visible.
- Corregir etiquetas semánticas como racha frente a victorias y separar tiempo de descuento en Cofre Rush.
- Mejorar, si se valida, jerarquía/CTA/categorías de portada sin homogeneizar el arte de las cards; verbalizar los nombres accesibles de RUN/TINTA/FIRE y de las tres flechas de REM Runner conservando la ayuda existente.

## Top 5 de mayor impacto

1. Canvas con hitos selectivos y movimiento reducido — ver hallazgos 2.1, 3.1, 4.2, 7.1, 15.1, 16.2, 17.2 y 17.3.
2. Semántica de tableros DOM — ver hallazgos 5.1, 8.1, 9.1 y 11.1.
3. Resultados y ciclo de partida inequívocos — ver hallazgos 4.1, 6.1, 8.2 y 11.2.
4. Copy móvil de portada legible — ver hallazgo 1.1; jerarquía/CTA/categorías quedan como P2 opcional en 1.2.
5. Navegación de Tetris y controles de REM Runner — ver hallazgos 16.1 y 17.1.

## Conteo de auditoría

- Superficies puntuadas: 17 de 17.
+ Capturas revisadas y puntuadas manualmente: 34 de 34 a 390 × 844 y 592 × 1280.
+ Capturas técnicas adicionales: 17 a 320 × 844, sin puntuación manual.
- Referencias en hallazgos: 33 citas exactas sobre 32 archivos; Color Rush y Piedra Papel tienen un único hallazgo sostenido y por eso citan solo el estado de 390.
- Hallazgos: 33.
- P0: 0.
- P1: 21.
- P2: 12.
- Hallazgos formulados solo como juicio estético: 0.
