const roomStories={
 gryffindor:['붉은 벽난로 곁에 자리가 비어 있어요. 다음 모험을 골라 보세요.','The fire is lit. Claim a seat, then choose your next adventure.','용기의 탑','Tower of Courage'],
 ravenclaw:['별빛이 서재를 비춥니다. 아직 풀리지 않은 수수께끼가 기다려요.','Starlight fills the library. An unsolved riddle awaits.','별빛 서재','Starlit Library'],
 hufflepuff:['따뜻한 찻잔과 모험 수첩을 준비했어요. 천천히 함께 출발해요.','A warm cup and your field journal are ready. Make yourself at home.','햇살 정원','Sunlit Hearth'],
 slytherin:['호수 아래 휴게실은 고요합니다. 다음 수를 정할 시간이에요.','The lake-side chamber is quiet. Time to plan your next move.','호수의 방','Chamber Beneath the Lake']
};
const subjectPlaces={rules:['⚖','수호자의 관문','Guardian’s Gate','통관의 봉인을 해제하세요.','Break the seals at the customs gate.'],payment:['◇','마법 금고','Enchanted Vault','대금과 서류의 비밀을 풀어보세요.','Uncover the secrets of payments and documents.'],contract:['⌘','맹약의 전당','Hall of Pacts','거래의 조건을 해독하세요.','Decipher the terms of every pact.'],english:['✧','고대 언어실','Chamber of Words','세계로 통하는 언어를 익히세요.','Learn the language that opens the world.']};
function chapterInfo(id){for(const subject of subjects){const chapter=subject.chapters.find(c=>c[0]===id);if(chapter)return {subject,chapter}}return null}
function historyChapter(entry){return entry.chapterId||({'Incoterms':'incoterms','Letter of Credit':'lc','Customs':'customs'}[entry.chapter])}
function reviewChapters(){
 const latest=new Map();
 state.quizHistory.forEach(entry=>{const id=historyChapter(entry);if(chapterInfo(id))latest.set(id,entry)});
 return [...latest].filter(([,entry])=>!entry.correct).map(([id])=>id);
}
function chapterLink(id,label=''){const info=chapterInfo(id);return info?`<button class="room-link" data-open-chapter="${id}"><span>${label||t(info.chapter[1],info.chapter[2])}</span><span aria-hidden="true">◇</span></button>`:''}
function renderCommonRoom(){
 const h=houses[state.house],room=roomStories[state.house],reviews=reviewChapters();
 const explored=Object.keys(state.visitedChapters||{}).filter(id=>chapterInfo(id)).length;
 const notes=Object.keys(state.notes).filter(id=>chapterInfo(id)&&state.notes[id].trim());
 const recent=state.quizHistory.slice(-3).reverse();
 const rate=state.quizHistory.length?Math.round(state.quizHistory.filter(q=>q.correct).length/state.quizHistory.length*100):0;
 app.innerHTML=`<section class="page page-enter common-room">
  <header class="room-welcome"><div class="room-identity">${houseLogo(state.house,'mini')}<div><p class="step">${h.en.toUpperCase()} · ${t('나의 기숙사','YOUR HOUSE')}</p><h1>${t(room[2],room[3])}</h1></div></div><div class="resident"><span>${t('기숙사 거주 학생','HOUSE RESIDENT')}</span><b>${esc(state.name)||t('새로운 학생','New student')}</b></div></header>
  <div class="room-invitation"><p>${t(room[0],room[1])}</p><button class="ghost-btn" data-route="quizIntro">${t('모험 떠나기','Embark on a quest')}</button></div>
  <section aria-labelledby="destinations-title"><div class="room-section-title"><h2 id="destinations-title">${t('오늘은 어디로 떠날까요?','Where will you venture today?')}</h2><span>${t('네 과목 · 열두 개의 관문','Four subjects · Twelve gateways')}</span></div>
   <div class="destination-grid">${subjects.map((subject,i)=>{const place=subjectPlaces[subject.id],count=subject.chapters.filter(c=>state.visitedChapters?.[c[0]]).length;return `<article class="destination"><div class="destination-rune" aria-hidden="true">${place[0]}</div><span class="destination-number">0${i+1}</span><p class="step">${t(place[1],place[2])}</p><h3>${t(subject.ko,subject.en)}</h3><p class="destination-description">${t(place[3],place[4])}</p><div class="gateway-tracker" aria-label="${t(`${count}개 챕터 방문`,`${count} chapters visited`)}">${subject.chapters.map(c=>`<i class="${state.visitedChapters?.[c[0]]?'visited':''}"></i>`).join('')}<span>${count}/3 ${t('탐험','visited')}</span></div><button class="primary-btn" data-open-chapter="${subject.chapters[0][0]}">${t('입장하기','Enter')}</button><details class="gateway-list"><summary>${t('관문 선택','Choose a chapter')}</summary>${subject.chapters.map(c=>chapterLink(c[0])).join('')}</details></article>`}).join('')}</div>
  </section>
  <div class="room-lower">
   <section class="room-board review-board"><p class="step">THE NOTICE BOARD</p><h2>${t('다시 열어볼 관문','Unfinished business')}</h2><p class="room-secondary">${reviews.length?t('최근 도전에서 놓친 단서예요. 해당 챕터로 돌아가 준비하세요.','These clues escaped you last time. Revisit the chapters before your next quest.'):t('아직 놓친 단서는 없어요. 다음 모험을 준비해 볼까요?','No missed clues yet. Prepare for your next adventure.')}</p>${(reviews.length?reviews:['incoterms','lc','customs']).map(id=>chapterLink(id)).join('')}<small>${reviews.length?t('최근 답안이 오답인 챕터','Chapters with an incorrect latest answer'):t('첫 모험을 위한 추천 관문','Suggested chapters for your first quest')}</small></section>
   <section class="room-board"><p class="step">YOUR WRITING DESK</p><h2>${t('펼쳐 둔 모험 수첩','Your field journal')}</h2><p class="room-secondary">${t('지난번에 남긴 페이지부터 이어가세요.','Pick up where you left off.')}</p>${chapterLink(state.chapter)}<div class="journal-notes"><h3>${t(`메모가 남은 페이지 · ${notes.length}`,`Pages with notes · ${notes.length}`)}</h3>${notes.length?notes.slice(-3).map(id=>chapterLink(id)).join(''):`<p class="room-secondary">${t('관문에서 기록한 메모가 이곳에 모입니다.','Notes you write on your travels will appear here.')}</p>`}</div></section>
   <section class="room-board"><p class="step">TALES OF YOUR JOURNEY</p><h2>${t('지난 모험의 흔적','Your recent adventures')}</h2>${recent.length?recent.map(entry=>{const id=historyChapter(entry),info=chapterInfo(id);return `<div class="quest-memory"><span class="quest-stamp ${entry.correct?'success':''}" aria-hidden="true">${entry.correct?'✦':'◇'}</span><div>${info?chapterLink(id):`<p>${esc(entry.chapter)}</p>`}<small>${t(entry.correct?'관문 통과':'단서 재확인',entry.correct?'Gate unlocked':'Clue to revisit')} · ${esc(entry.date)}</small></div></div>`}).join(''):`<p class="room-secondary">${t('첫 모험이 아직 쓰이지 않았어요. 빗자루를 챙기고 출발해 보세요.','Your first adventure is still unwritten. Ready to head out?')}</p>`}<button class="ghost-btn" data-route="record">${t('모험 기록 펼치기','Open adventure records')}</button></section>
  </div>
  <footer class="room-ledger"><span>✦ ${t('나의 발자취','YOUR FOOTPRINTS')}</span><span>${t('방문한 관문','Chapters visited')} <b>${explored}/12</b></span><span>${t('퀴즈 정답률','Quiz accuracy')} <b>${state.quizHistory.length?rate+'%':'—'}</b></span><span>${t('남긴 메모','Journal notes')} <b>${notes.length}</b></span></footer>
 </section>`;
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-open-chapter]');if(!target)return;
 const id=target.dataset.openChapter;if(!chapterInfo(id))return;
 state.chapter=id;go('concepts');
});
