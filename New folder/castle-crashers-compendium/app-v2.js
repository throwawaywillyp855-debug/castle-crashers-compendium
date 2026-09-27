let facts = [];
let category = 'All';
const $ = selector => document.querySelector(selector);
const STOP = new Set(['the','and','are','what','how','many','does','can','you','with','about','from','who','which','game','castle','crashers','tell','me']);
const terms = value => (String(value).toLowerCase().match(/[a-z0-9]+/g) || []).filter(word => word.length > 2 && !STOP.has(word));
function matchFacts(question) {
  const query = terms(question);if (!query.length) return [];
  return facts.map(fact => {
    const title = terms(fact.title), keys = terms(fact.keywords.join(' ')), body = terms(fact.fact);
    let score = 0;
    for (const term of query) {if (title.includes(term)) score += 5;if (keys.includes(term)) score += 4;if (body.includes(term)) score += 1;if (fact.category.toLowerCase() === term) score += 2;}
    if (question.toLowerCase().includes(fact.title.toLowerCase())) score += 8;
    return {fact,score};
  }).filter(hit => hit.score >= 4).sort((a,b) => b.score - a.score).slice(0,3).map(hit => hit.fact);
}
function renderCards() {
  const query = $('#search').value.toLowerCase().trim();const cards = $('#cards');cards.replaceChildren();
  const shown = facts.filter(fact => (category === 'All' || fact.category === category) && (!query || [fact.title,fact.fact,fact.category,...fact.keywords].join(' ').toLowerCase().includes(query)));
  for (const fact of shown) {
    const card = document.createElement('article');card.className = 'card';
    const tag = document.createElement('span');tag.className = 'tag';tag.textContent = fact.category;
    const title = document.createElement('h3');title.textContent = fact.title;
    const body = document.createElement('p');body.textContent = fact.fact;
    const link = document.createElement('a');link.href = fact.source;link.target = '_blank';link.rel = 'noopener noreferrer';link.textContent = 'View source ↗';
    card.append(tag,title,body,link);cards.append(card);
  }
  if (!shown.length) cards.textContent = 'No matching facts yet.';
}
function renderFilters() {
  const container = $('#filters');container.replaceChildren();
  for (const name of ['All',...new Set(facts.map(fact => fact.category))]) {
    const button = document.createElement('button');button.textContent = name;button.className = name === category ? 'active' : '';
    button.setAttribute('aria-pressed',String(name === category));button.onclick = () => {category = name;renderFilters();renderCards();};container.append(button);
  }
}
function showFacts(matches, prefix = 'From the reviewed fact sheet:') {
  const box = $('#answer');box.replaceChildren();
  if (!matches.length) {box.textContent = 'I could not verify an answer from the current fact sheet. Try a different question or check the source entries.';return;}
  const heading = document.createElement('strong');heading.textContent = prefix;const list = document.createElement('ul');
  for (const fact of matches) {
    const item = document.createElement('li');item.append(document.createTextNode(fact.fact + ' '));
    const link = document.createElement('a');link.href = fact.source;link.target = '_blank';link.rel = 'noopener noreferrer';link.textContent = `[Source: ${fact.title}]`;
    item.append(link);list.append(item);
  }
  box.append(heading,list);
}
async function answer() {
  const question = $('#question').value.trim();if (!question) return;
  const button = $('#ask-button');button.disabled = true;$('#answer').textContent = 'Checking the fact sheet…';
  const matches = matchFacts(question);
  try {
    if (!window.COMPENDIUM_API_URL) {showFacts(matches);return;}
    const controller = new AbortController();const timer = setTimeout(() => controller.abort(),12000);let response;
    try {response = await fetch(window.COMPENDIUM_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:controller.signal});} finally {clearTimeout(timer);}
    if (!response.ok) throw Error('Service unavailable');
    const result = await response.json();if (!result.grounded) {showFacts([]);return;}
    const permitted = new Map(matches.map(fact => [fact.id,fact]));const cited = (result.sources || []).map(source => permitted.get(source.id)).filter(Boolean);
    if (!cited.length || typeof result.answer !== 'string') throw Error('Missing citations');
    const box = $('#answer');box.replaceChildren();const heading = document.createElement('strong');heading.textContent = 'AI response based on reviewed facts:';
    const body = document.createElement('p');body.textContent = result.answer;const list = document.createElement('ul');
    for (const fact of cited) {const item = document.createElement('li');const link = document.createElement('a');link.href = fact.source;link.target = '_blank';link.rel = 'noopener noreferrer';link.textContent = fact.title + ' · source ↗';item.append(link);list.append(item);}
    box.append(heading,body,list);
  } catch {showFacts(matches,'AI service unavailable. Showing reviewed facts instead:');}
  finally {button.disabled = false;}
}
async function load() {
  try {const response = await fetch('facts.json');if (!response.ok) throw Error();facts = await response.json();renderFilters();renderCards();}
  catch {$('#cards').textContent = 'Could not load facts. Open this site through GitHub Pages or a local web server.';}
  try {
    const response = await fetch('gallery.json');if (!response.ok) throw Error();const gallery = await response.json();
    for (const item of gallery) {
      const frame = document.createElement('figure');const img = document.createElement('img');img.src = item.file;img.alt = item.caption;img.loading = 'lazy';
      img.onerror = () => {const missing = document.createElement('div');missing.className = 'missing';missing.textContent = 'Add an authorized image: ' + item.file;img.replaceWith(missing);};
      const caption = document.createElement('figcaption');caption.textContent = item.caption;frame.append(img,caption);$('#gallery-grid').append(frame);
    }
  } catch {$('#gallery-grid').textContent = 'Gallery configuration unavailable.';}
}
$('#search').addEventListener('input',renderCards);$('#ask-button').onclick = answer;
$('#question').addEventListener('keydown',event => {if (event.key === 'Enter' && !event.shiftKey) {event.preventDefault();answer();}});
document.querySelectorAll('[data-question]').forEach(button => button.onclick = () => {$('#question').value = button.dataset.question;answer();});
const music = $('#music'),toggle = $('#music-toggle'),status = $('#music-status');
toggle.onclick = async () => {if (!music.paused) {music.pause();return;}try {await music.play();} catch {status.textContent = 'Add assets/audio/theme.mp3, then press Play.';}};
music.onplay = () => {toggle.textContent = '♫ Pause music';toggle.setAttribute('aria-label','Pause music');status.textContent = 'Now playing · loop on';};
music.onpause = () => {toggle.textContent = '♫ Play music';toggle.setAttribute('aria-label','Play music');status.textContent = 'Paused';};
music.onerror = () => {status.textContent = 'Add assets/audio/theme.mp3 to enable music';};
if (window.COMPENDIUM_API_URL) $('#answer-mode').textContent = 'AI assisted · grounded in reviewed facts';
load();
