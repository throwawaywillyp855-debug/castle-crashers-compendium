let facts = [];
let category = 'All';

const $ = selector => document.querySelector(selector);

const STOP = new Set([
  'the','and','are','what','how','many','does','can','you','with',
  'about','from','who','which','game','castle','crashers','tell','me'
]);

const terms = value =>
  (String(value).toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(word => word.length > 2 && !STOP.has(word));


/* =====================================================
   FACT SEARCH
===================================================== */

function matchFacts(question) {
  const query = terms(question);

  if (!query.length) return [];

  return facts
    .map(fact => {
      const title = terms(fact.title);
      const keys = terms(fact.keywords.join(' '));
      const body = terms(fact.fact);

      let score = 0;

      for (const term of query) {
        if (title.includes(term)) score += 5;
        if (keys.includes(term)) score += 4;
        if (body.includes(term)) score += 1;
        if (fact.category.toLowerCase() === term) score += 2;
      }

      if (
        question
          .toLowerCase()
          .includes(fact.title.toLowerCase())
      ) {
        score += 8;
      }

      return { fact, score };
    })
    .filter(hit => hit.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(hit => hit.fact);
}


/* =====================================================
   FACT CARDS
===================================================== */

function renderCards() {
  const query = $('#search').value.toLowerCase().trim();
  const cards = $('#cards');

  cards.replaceChildren();

  const shown = facts.filter(fact =>
    (category === 'All' || fact.category === category) &&
    (
      !query ||
      [fact.title, fact.fact, fact.category, ...fact.keywords]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  );

  for (const fact of shown) {
    const card = document.createElement('article');
    card.className = 'card';

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = fact.category;

    const title = document.createElement('h3');
    title.textContent = fact.title;

    const body = document.createElement('p');
    body.textContent = fact.fact;

    const link = document.createElement('a');
    link.href = fact.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View source ↗';

    card.append(tag, title, body, link);
    cards.append(card);
  }

  if (!shown.length) {
    cards.textContent = 'No matching facts yet.';
  }
}


/* =====================================================
   FILTERS
===================================================== */

function renderFilters() {
  const container = $('#filters');

  container.replaceChildren();

  for (
    const name of [
      'All',
      ...new Set(facts.map(fact => fact.category))
    ]
  ) {
    const button = document.createElement('button');

    button.textContent = name;
    button.className =
      name === category ? 'active' : '';

    button.setAttribute(
      'aria-pressed',
      String(name === category)
    );

    button.onclick = () => {
      category = name;
      renderFilters();
      renderCards();
    };

    container.append(button);
  }
}


/* =====================================================
   FACT ANSWERS
===================================================== */

function showFacts(
  matches,
  prefix = 'From the reviewed fact sheet:'
) {
  const box = $('#answer');

  box.replaceChildren();

  if (!matches.length) {
    box.textContent =
      'I could not verify an answer from the current fact sheet. ' +
      'Try a different question or check the source entries.';

    return;
  }

  const heading = document.createElement('strong');
  heading.textContent = prefix;

  const list = document.createElement('ul');

  for (const fact of matches) {
    const item = document.createElement('li');

    item.append(
      document.createTextNode(fact.fact + ' ')
    );

    const link = document.createElement('a');

    link.href = fact.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent =
      `[Source: ${fact.title}]`;

    item.append(link);
    list.append(item);
  }

  box.append(heading, list);
}


/* =====================================================
   ASK THE ARCHIVE
===================================================== */

async function answer() {
  const question =
    $('#question').value.trim();

  if (!question) return;

  const button =
    $('#ask-button');

  const answerBox =
    $('#answer');

  const mode =
    $('#answer-mode');

  button.disabled = true;

  answerBox.textContent =
    'Searching the archive…';

  const matches =
    matchFacts(question);

  try {

    /* -----------------------------------------------
       USE REVIEWED FACT SHEET FIRST
    ------------------------------------------------ */

    if (matches.length) {
      mode.textContent =
        'Archive answer · reviewed facts';

      showFacts(
        matches,
        'From the reviewed Castle Crashers archive:'
      );

      return;
    }


    /* -----------------------------------------------
       NO FACT MATCH — ASK OPENAI
    ------------------------------------------------ */

    if (!window.COMPENDIUM_API_URL) {
      throw new Error(
        'The AI backend URL is not configured.'
      );
    }

    mode.textContent =
      'OpenAI is researching an answer…';

    answerBox.textContent =
      'Nothing matched the reviewed archive. Asking OpenAI…';


    /* -----------------------------------------------
       SEND QUESTION TO BACKEND
    ------------------------------------------------ */

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => controller.abort(),
        20000
      );

    let response;

    try {

      response = await fetch(
        window.COMPENDIUM_API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            question: question
          }),

          signal: controller.signal
        }
      );

    } finally {

      clearTimeout(timer);

    }


    /* -----------------------------------------------
       READ BACKEND RESPONSE
    ------------------------------------------------ */

    let result;

    try {

      result =
        await response.json();

    } catch {

      throw new Error(
        `Backend returned HTTP ${response.status} ` +
        'without a valid JSON response.'
      );

    }


    /* -----------------------------------------------
       SHOW ACTUAL BACKEND / OPENAI ERROR
    ------------------------------------------------ */

    if (!response.ok) {

      throw new Error(
        result.error ||
        `Backend returned HTTP ${response.status}`
      );

    }


    /* -----------------------------------------------
       VERIFY OPENAI ANSWER
    ------------------------------------------------ */

    if (
      !result.answer ||
      typeof result.answer !== 'string'
    ) {

      throw new Error(
        'OpenAI returned no answer.'
      );

    }


    /* -----------------------------------------------
       DISPLAY OPENAI ANSWER
    ------------------------------------------------ */

    answerBox.replaceChildren();

    const heading =
      document.createElement('strong');

    heading.textContent =
      'OpenAI answer beyond the reviewed archive:';

    const body =
      document.createElement('p');

    body.textContent =
      result.answer;

    const notice =
      document.createElement('small');

    notice.textContent =
      'AI-generated response. Information may not have been independently verified.';

    answerBox.append(
      heading,
      body,
      notice
    );

    mode.textContent =
      'OpenAI assisted · outside the reviewed fact sheet';


  } catch (error) {

    console.error(
      'Ask the Archive error:',
      error
    );

    if (error.name === 'AbortError') {

      answerBox.textContent =
        'AI error: The request timed out after 20 seconds.';

    } else {

      answerBox.textContent =
        `AI error: ${error.message}`;

    }

    mode.textContent =
      'AI connection error';


  } finally {

    button.disabled = false;

  }
}


/* =====================================================
   LOAD FACTS AND GALLERY
===================================================== */

async function load() {

  try {

    const response =
      await fetch('facts.json');

    if (!response.ok) {
      throw Error();
    }

    facts =
      await response.json();

    renderFilters();
    renderCards();

  } catch {

    $('#cards').textContent =
      'Could not load facts. Open this site through GitHub Pages or a local web server.';

  }


  try {

    const response =
      await fetch('gallery.json');

    if (!response.ok) {
      throw Error();
    }

    const gallery =
      await response.json();

    for (const item of gallery) {

      const frame =
        document.createElement('figure');

      const img =
        document.createElement('img');

      img.src =
        item.file;

      img.alt =
        item.caption;

      img.loading =
        'lazy';

      img.onerror = () => {

        const missing =
          document.createElement('div');

        missing.className =
          'missing';

        missing.textContent =
          'Add an authorized image: ' +
          item.file;

        img.replaceWith(
          missing
        );

      };

      const caption =
        document.createElement('figcaption');

      caption.textContent =
        item.caption;

      frame.append(
        img,
        caption
      );

      $('#gallery-grid')
        .append(frame);
    }

  } catch {

    $('#gallery-grid').textContent =
      'Gallery configuration unavailable.';

  }
}


/* =====================================================
   SEARCH AND QUESTION CONTROLS
===================================================== */

$('#search').addEventListener(
  'input',
  renderCards
);

$('#ask-button').onclick =
  answer;

$('#question').addEventListener(
  'keydown',
  event => {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      answer();
    }

  }
);

document
  .querySelectorAll('[data-question]')
  .forEach(button => {

    button.onclick = () => {

      $('#question').value =
        button.dataset.question;

      answer();

    };

  });


/* =====================================================
   MUSIC PLAYLIST
===================================================== */

const playlist = [

  {
    title: 'Four Brave Champions',
    file: '01 - Four Brave Champions.mp3'
  },

  {
    title: 'Flutey World Map',
    file: '02 - Flutey World Map.mp3'
  },

  {
    title: 'Barracks Song',
    file: '03 - Barracks Song.mp3'
  },

  {
    title: 'Spanish Waltz',
    file: '06 - Spanish Waltz.mp3'
  },

  {
    title: 'Gold Grab',
    file: '09 - Gold Grab.mp3'
  },

  {
    title: 'Race Around the World',
    file: '10 - Race Around the World (Edit).mp3'
  },

  {
    title: "Orange's Kiss",
    file: "37 - Orange's Kiss.mp3"
  },

  {
    title: 'Castle Crashers Online Menu',
    file: '38 - Castle Crashers Online Menu.mp3'
  }

];


/* =====================================================
   MUSIC PLAYER STATE
===================================================== */

let currentTrack = 0;

let loopTrack = false;

const music =
  $('#music');

const playButton =
  $('#music-play');

const nextButton =
  $('#music-next');

const previousButton =
  $('#music-previous');

const loopButton =
  $('#music-loop');

const musicStatus =
  $('#music-status');


/* =====================================================
   LOAD MUSIC TRACK
===================================================== */

function loadTrack(index) {

  currentTrack =
    index;

  music.src =
    playlist[currentTrack].file;

  musicStatus.textContent =
    '♫ ' +
    playlist[currentTrack].title;

}


/* =====================================================
   PLAY MUSIC
===================================================== */

async function playMusic() {

  try {

    await music.play();

  } catch {

    /*
      Most modern browsers block autoplay with sound
      until the visitor interacts with the webpage.

      If that happens, the music player remains ready
      and the visitor can press Play.
    */

    playButton.textContent =
      '▶';

    playButton.setAttribute(
      'aria-label',
      'Play music'
    );

    musicStatus.textContent =
      '♫ ' +
      playlist[currentTrack].title +
      ' · Press play to listen';

  }

}


/* =====================================================
   NEXT TRACK
===================================================== */

function nextTrack() {

  currentTrack++;

  if (
    currentTrack >=
    playlist.length
  ) {

    currentTrack = 0;

  }

  loadTrack(
    currentTrack
  );

  playMusic();

}


/* =====================================================
   PREVIOUS TRACK
===================================================== */

function previousTrack() {

  /*
    If more than three seconds of the song
    have played, pressing Previous restarts
    the current track.

    Pressing Previous near the beginning
    moves to the previous song.
  */

  if (music.currentTime > 3) {

    music.currentTime = 0;

    return;

  }

  currentTrack--;

  if (currentTrack < 0) {

    currentTrack =
      playlist.length - 1;

  }

  loadTrack(
    currentTrack
  );

  playMusic();

}


/* =====================================================
   PLAY / PAUSE BUTTON
===================================================== */

playButton.onclick =
  async () => {

    if (music.paused) {

      await playMusic();

    } else {

      music.pause();

    }

  };


/* =====================================================
   NEXT BUTTON
===================================================== */

nextButton.onclick =
  () => {

    nextTrack();

  };


/* =====================================================
   PREVIOUS BUTTON
===================================================== */

previousButton.onclick =
  () => {

    previousTrack();

  };


/* =====================================================
   LOOP BUTTON
===================================================== */

loopButton.onclick =
  () => {

    loopTrack =
      !loopTrack;

    music.loop =
      loopTrack;

    loopButton.classList.toggle(
      'active',
      loopTrack
    );

    loopButton.setAttribute(
      'aria-pressed',
      String(loopTrack)
    );

  };


/* =====================================================
   UPDATE PLAY BUTTON
===================================================== */

music.addEventListener(
  'play',
  () => {

    playButton.textContent =
      '❚❚';

    playButton.setAttribute(
      'aria-label',
      'Pause music'
    );

    musicStatus.textContent =
      '♫ ' +
      playlist[currentTrack].title;

  }
);


/* =====================================================
   UPDATE PAUSE BUTTON
===================================================== */

music.addEventListener(
  'pause',
  () => {

    playButton.textContent =
      '▶';

    playButton.setAttribute(
      'aria-label',
      'Play music'
    );

  }
);


/* =====================================================
   AUTOMATIC NEXT SONG
===================================================== */

music.addEventListener(
  'ended',
  () => {

    if (!loopTrack) {

      nextTrack();

    }

  }
);


/* =====================================================
   MUSIC ERROR
===================================================== */

music.addEventListener(
  'error',
  () => {

    musicStatus.textContent =
      'Music unavailable';

  }
);


/* =====================================================
   AUTOPLAY MUSIC
===================================================== */

/*
  Load Four Brave Champions as the first track.

  The website will attempt to begin playing it
  automatically when the page opens.

  If the browser blocks autoplay with sound,
  the player remains available and the visitor
  can press Play.
*/

loadTrack(0);

window.addEventListener(
  'load',
  async () => {

    try {

      await music.play();

    } catch {

      playButton.textContent =
        '▶';

      playButton.setAttribute(
        'aria-label',
        'Play music'
      );

      musicStatus.textContent =
        '♫ ' +
        playlist[currentTrack].title +
        ' · Press play to listen';

    }

  }
);


/* =====================================================
   AI STATUS
===================================================== */

if (window.COMPENDIUM_API_URL) {

  $('#answer-mode').textContent =
    'OpenAI assisted · grounded in reviewed facts';

}


/* =====================================================
   START WEBSITE
===================================================== */

load();
