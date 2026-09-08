(() => {
  const COLS=10, ROWS=20, BLOCK=30;
  const COLORS=[null,'#86efac','#fff','#86efac','#fff','#86efac','#fff','#86efac'];
  const SHAPES=[null,[[1,1,1,1]],[[2,0,0],[2,2,2]],[[0,0,3],[3,3,3]],[[4,4],[4,4]],[[0,5,5],[5,5,0]],[[0,6,0],[6,6,6]],[[7,7,0],[0,7,7]]];
  const canvas=document.querySelector('#board'), ctx=canvas.getContext('2d');
  const nextCanvas=document.querySelector('#next'), nextCtx=nextCanvas.getContext('2d');
  const scoreEl=document.querySelector('#score'), linesEl=document.querySelector('#lines'), levelEl=document.querySelector('#level');
  const overlay=document.querySelector('#overlay'), overlayTitle=document.querySelector('#overlay-title'), overlayCopy=document.querySelector('#overlay-copy');
  const startBtn=document.querySelector('#start-button'), pauseBtn=document.querySelector('#pause-button');
  ctx.scale(BLOCK,BLOCK); nextCtx.scale(24,24);
  let arena, player, next, score, lines, level, dropCounter, dropInterval, lastTime, running=false, paused=false;
  const createMatrix=(w,h)=>Array.from({length:h},()=>Array(w).fill(0));
  function createPiece(type){return SHAPES[type].map(row=>row.slice())}
  function randomPiece(){const type=1+Math.floor(Math.random()*7);return createPiece(type)}
  function reset(){arena=createMatrix(COLS,ROWS);score=lines=0;level=1;dropInterval=800;dropCounter=0;next=randomPiece();spawn();updateStats()}
  function spawn(){player={matrix:next,pos:{x:0,y:0}};next=randomPiece();player.pos.x=Math.floor((COLS-player.matrix[0].length)/2);if(collide(arena,player)){gameOver()}drawNext()}
  function collide(board,p){for(let y=0;y<p.matrix.length;y++)for(let x=0;x<p.matrix[y].length;x++)if(p.matrix[y][x]!==0&&(board[y+p.pos.y]&&board[y+p.pos.y][x+p.pos.x])!==0)return true;return false}
  function merge(board,p){p.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v)board[y+p.pos.y][x+p.pos.x]=v}))}
  function sweep(){let rowCount=1, cleared=0;outer:for(let y=arena.length-1;y>=0;y--){for(let x=0;x<COLS;x++)if(arena[y][x]===0)continue outer;arena.splice(y,1);arena.unshift(Array(COLS).fill(0));y++;cleared++;score+=rowCount*100*level;rowCount*=2}if(cleared){lines+=cleared;level=Math.floor(lines/10)+1;dropInterval=Math.max(120,800-(level-1)*65);updateStats()}}
  function rotate(matrix,dir){for(let y=0;y<matrix.length;y++)for(let x=0;x<y;x++)[matrix[x][y],matrix[y][x]]=[matrix[y][x],matrix[x][y]];if(dir>0)matrix.forEach(row=>row.reverse());else matrix.reverse()}
  function playerRotate(){const pos=player.pos.x;let offset=1;rotate(player.matrix,1);while(collide(arena,player)){player.pos.x+=offset;offset=-(offset+(offset>0?1:-1));if(Math.abs(offset)>player.matrix[0].length){rotate(player.matrix,-1);player.pos.x=pos;return}}}
  function move(dir){if(!running||paused)return;player.pos.x+=dir;if(collide(arena,player))player.pos.x-=dir}
  function drop(){if(!running||paused)return;player.pos.y++;if(collide(arena,player)){player.pos.y--;merge(arena,player);sweep();spawn()}dropCounter=0}
  function hardDrop(){if(!running||paused)return;let distance=0;while(!collide(arena,player)){player.pos.y++;distance++}player.pos.y--;score+=(distance-1)*2;merge(arena,player);sweep();spawn();updateStats();dropCounter=0}
  function drawMatrix(matrix,offset,context=ctx){matrix.forEach((row,y)=>row.forEach((value,x)=>{if(!value)return;context.fillStyle=COLORS[value];context.fillRect(x+offset.x,y+offset.y,1,1);context.fillStyle='rgba(255,255,255,.22)';context.fillRect(x+offset.x,y+offset.y,.05,1);context.fillStyle='rgba(0,0,0,.2)';context.fillRect(x+offset.x,y+offset.y+.9,1,.1)}))}
  function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,COLS,ROWS);ctx.strokeStyle='#1a1a1a';ctx.lineWidth=.025;for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ROWS);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(COLS,y);ctx.stroke()}drawMatrix(arena,{x:0,y:0});if(player)drawMatrix(player.matrix,player.pos)}
  function drawNext(){nextCtx.fillStyle='#000';nextCtx.fillRect(0,0,5,5);const width=next[0].length,height=next.length;drawMatrix(next,{x:(5-width)/2,y:(5-height)/2},nextCtx)}
  function updateStats(){scoreEl.textContent=score;linesEl.textContent=lines;levelEl.textContent=level}
  function update(time=0){const delta=time-lastTime;lastTime=time;if(running&&!paused){dropCounter+=delta;if(dropCounter>dropInterval)drop();draw();requestAnimationFrame(update)}}
  function start(){reset();running=true;paused=false;overlay.classList.add('hidden');pauseBtn.textContent='Pausar';lastTime=performance.now();requestAnimationFrame(update);canvas.focus()}
  function togglePause(){if(!running)return;paused=!paused;pauseBtn.textContent=paused?'Continuar':'Pausar';if(paused){overlayTitle.textContent='PAUSA';overlayCopy.textContent='Tomate un respiro';startBtn.textContent='Continuar';overlay.classList.remove('hidden')}else{overlay.classList.add('hidden');lastTime=performance.now();requestAnimationFrame(update)}}
  function gameOver(){running=false;overlayTitle.textContent='FIN DEL JUEGO';overlayCopy.textContent='Puntaje final: '+score;startBtn.textContent='Reintentar';overlay.classList.remove('hidden');pauseBtn.textContent='Pausar'}
  document.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '];if(keys.includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);if(e.key==='ArrowDown')drop();if(e.key==='ArrowUp')playerRotate();if(e.key===' ')hardDrop();if(e.key==='p'||e.key==='P')togglePause()});
  startBtn.addEventListener('click',()=>paused?togglePause():start());pauseBtn.addEventListener('click',togglePause);
  document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.action;if(a==='left')move(-1);if(a==='right')move(1);if(a==='down')drop();if(a==='rotate')playerRotate();if(a==='drop')hardDrop()}));
  reset();draw();
})();