// One timer per intro; all exits clean it up through go().
function finishArrival(){
 if(state.route!=='arrival')return;
 introComplete=true;
 go('home');
}
function renderArrival(){
 clearTimeout(introTimer);
 const h=houses[state.house];
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 app.innerHTML=`<section class="arrival ${reduced?'still':''}" aria-labelledby="arrival-title" style="--flight-color:${h.color}">
  <div class="arrival-sky" aria-hidden="true"></div><div class="arrival-moon" aria-hidden="true"></div>
  <div class="arrival-cloud cloud-back" aria-hidden="true"></div><div class="arrival-cloud cloud-front" aria-hidden="true"></div>
  <div class="flight-caption"><p class="step">THE JOURNEY TO HOGWARTS</p><h1 id="arrival-title">${t(`${esc(state.name)}님, 호그와트로 출발합니다.`,`${esc(state.name)}, your journey begins.`)}</h1><p>${t(`${h.ko}의 새로운 학생을 기다리고 있어요.`,`A place in ${h.en} is waiting for you.`)}</p></div>
  <div class="broom-flight" role="img" aria-label="${t('기숙사 색 목도리를 두른 학생이 빗자루를 타고 밤하늘을 날아갑니다.','A student wearing their house scarf flies across the night sky on a broom.')}" >
   <div class="flight-trail" aria-hidden="true"></div>
   <svg class="broom-rider" viewBox="0 0 500 330" aria-hidden="true">
    <defs><linearGradient id="cloak" x2="1" y2="1"><stop stop-color="#334458"/><stop offset="1" stop-color="#0c1423"/></linearGradient><linearGradient id="bristles"><stop stop-color="#69502d"/><stop offset="1" stop-color="#cea36a"/></linearGradient></defs>
    <g stroke-linecap="round" stroke-linejoin="round">
     <path d="M69 228 8 250 26 271 6 286 110 263 140 239Z" fill="url(#bristles)" stroke="#b58e53" stroke-width="2"/>
     <path d="m30 255 96-15m-61 30 68-24m-67 28 57-24" stroke="#dfbd7d" stroke-width="2"/>
     <path d="M110 246Q270 209 453 187" fill="none" stroke="#4f3323" stroke-width="15"/>
     <path d="M110 242Q270 205 453 183" fill="none" stroke="#be905a" stroke-width="5"/>
     <path d="m104 234 6 25m4-29 7 25" stroke="#d7bd7c" stroke-width="5"/>
     <path d="m269 200 38 40-24 58" fill="none" stroke="#28364b" stroke-width="22"/>
     <path d="m281 291-8 20 36 0" fill="none" stroke="#141c28" stroke-width="17"/>
     <path d="M268 132Q214 166 116 155L144 181 74 199Q185 239 271 220L305 183Z" fill="url(#cloak)" stroke="#627084" stroke-width="2"/>
     <path d="M144 186q65 29 110 11M168 168q48 17 73 6" fill="none" stroke="#47576a" stroke-width="2"/>
     <path d="m271 208 60 18-7 58" fill="none" stroke="#38465b" stroke-width="23"/>
     <path d="m323 278 0 25 31 4" fill="none" stroke="#131b28" stroke-width="18"/>
     <path d="m280 140 27 40 50 17" fill="none" stroke="#27364b" stroke-width="24"/>
     <path d="m354 196 16 2" stroke="#dfb08d" stroke-width="13"/>
     <path d="m273 114-2 25" stroke="#c89573" stroke-width="18"/>
     <path d="M256 78Q295 61 306 93l-1 17-13 14-31-8-13-22Z" fill="#e1b793"/>
     <path d="M249 98q-19-27 9-44 27-12 48 15l3 18-22-13-20 14-2 20Z" fill="#30271f"/>
     <path d="m302 94 11 11-12 2" fill="#e1b793"/><circle cx="297" cy="91" r="2.5" fill="#21212a"/>
     <path d="M253 129q20 12 37 3" fill="none" stroke="var(--flight-color)" stroke-width="16"/>
     <path d="M258 134Q192 113 165 138T88 120l12 25q36 19 72 8t78 4Z" fill="var(--flight-color)"/>
     <path d="m225 132-4 22m-20-25-5 23" stroke="#dfc68d" stroke-width="5"/>
     <path d="m271 158 9 4-2 12-8 4-5-9Z" fill="var(--flight-color)" stroke="#dfc68d"/>
    </g>
   </svg>
  </div>
  <div class="arrival-footer"><p>${t('곧 기숙사 공용 휴게실에 도착합니다.','Your common room awaits.')}</p><div class="arrival-progress" aria-hidden="true"><span></span></div><button class="ghost-btn" data-action="skip-arrival">${t('건너뛰고 입장','Skip to common room')}</button></div>
 </section>`;
 introTimer=setTimeout(finishArrival,8500);
}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="skip-arrival"]'))finishArrival()});
