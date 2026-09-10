(()=>{
  const config=window.SUPABASE_CONFIG;
  if(!config)return;
  const game=new URLSearchParams(location.search).get("game")||document.body.dataset.game;
  const api=(path,options={})=>fetch(config.url+"/rest/v1/"+path,{...options,headers:{apikey:config.key,Authorization:"Bearer "+config.key,"Content-Type":"application/json",...(options.headers||{})}});
  const safe=value=>String(value).replace(/[&<>]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[char]));
  const month=new Date().toISOString().slice(0,7)+"-01";
  const home=document.querySelector("#home-ranking");
  if(!game&&home){
    home.innerHTML=`<div><p class="eyebrow">Ranking mensual</p><h2>TOP 3</h2></div><ol><li>Cargando récords…</li></ol>`;
    api("monthly_general_leaderboard?month=eq."+month+"&select=player_name,total_score,games_played&order=total_score.desc&limit=3").then(response=>response.ok?response.json():Promise.reject()).then(rows=>{
      home.querySelector("ol").innerHTML=rows.length?rows.map((row,index)=>`<li><em>0${index+1}</em><b>${safe(row.player_name)}</b><span>${row.total_score} pts</span></li>`).join(""):"<li>El primer récord del mes está esperando.</li>";
    }).catch(()=>{home.querySelector("ol").innerHTML="<li>No se pudo cargar el ranking.</li>"});
    return;
  }
  if(!game)return;
  const root=document.querySelector("#records");
  if(!root)return;
  root.innerHTML=`<div class="record-head"><h2>Récords</h2><span>Esta partida</span></div><label class="name-label">Tu nombre<input id="player-name" maxlength="16" placeholder="MARTIN" autocomplete="nickname"></label><button id="save-score" class="game-btn">Guardar puntaje de sesión</button><p id="record-note">Guardá tu puntaje al terminar una partida.</p><div class="record-columns"><section><h3>Por juego</h3><ol id="game-records"></ol></section><section><h3>General del mes</h3><ol id="month-records"></ol></section></div>`;
  const name=root.querySelector("#player-name"),note=root.querySelector("#record-note"),button=root.querySelector("#save-score");
  name.value=localStorage.getItem("arcade-player-name")||"";
  const render=(el,items,format)=>el.innerHTML=items.length?items.map(item=>`<li><b>${safe(item.player_name)}</b><span>${format(item)}</span></li>`).join(""):"<li>Sin récords todavía</li>";
  async function load(){try{const gameResponse=await api("game_leaderboard?game_key=eq."+encodeURIComponent(game)+"&select=player_name,score&order=score.desc&limit=10"),monthResponse=await api("monthly_general_leaderboard?month=eq."+month+"&select=player_name,total_score,games_played&order=total_score.desc&limit=10");if(!gameResponse.ok||!monthResponse.ok)throw Error();render(root.querySelector("#game-records"),await gameResponse.json(),item=>item.score+" pts");render(root.querySelector("#month-records"),await monthResponse.json(),item=>item.total_score+" pts / "+item.games_played+" juegos")}catch(error){note.textContent="No se pudieron cargar los récords."}}
  button.onclick=async()=>{const player=name.value.trim().toUpperCase(),score=Number(document.querySelector("#score")?.textContent.replace(/[^0-9]/g,""));if(player.length<2){note.textContent="Ingresá un nombre de 2 a 16 caracteres.";return}localStorage.setItem("arcade-player-name",player);button.disabled=true;note.textContent="Guardando…";try{const response=await api("score_submissions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({player_name:player,game_key:game,score})});if(!response.ok)throw Error();note.textContent="¡Puntaje guardado!";load()}catch(error){note.textContent="No se pudo guardar el puntaje."}finally{button.disabled=false}};
  load();
})();
