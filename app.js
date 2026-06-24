/* 
================================================================================
  ResearchOS CONFIGURATION
  INSTRUCTIONS: Replace these values with your actual Supabase URL & Anon Key
================================================================================
*/
const SUPABASE_URL = "https://deioiojytowejhyszztw.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_D0RI2t1-ixTlEZ5WrvN3xQ_BLJsJ8Sc";

/*
  DATABASE SETUP:
  Run this SQL in your Supabase SQL Editor:

  create table saved_papers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    title text,
    url text,
    source text,
    date text,
    summary text,
    saved_at timestamp default now()
  );
  alter table saved_papers enable row level security;
  create policy "Users see own papers" on saved_papers for all using (auth.uid() = user_id);
*/

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentUser = null;
let currentMode = "signin";

// DOM Elements - Auth
const btnLogin = document.getElementById('btn-login');
const navAuthContainer = document.getElementById('nav-auth-container');
const authModal = document.getElementById('auth-modal');
const closeModal = document.getElementById('close-modal');
const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authConfirm = document.getElementById('auth-confirm');
const authMsg = document.getElementById('auth-msg');
const modalTitle = document.getElementById('modal-title');

// DOM Elements - App
const unauthedState = document.getElementById('unauthed-state');
const authedState = document.getElementById('authed-state');
const pipeTabs = document.querySelectorAll('.pipe-tab');
const pipeContents = document.querySelectorAll('.pipe-content');

// --- AUTH LOGIC ---
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  updateUI();
});

function updateUI() {
  if (currentUser) {
    navAuthContainer.innerHTML = `
      <div class="nav-user">
        <span>${currentUser.email}</span>
        <button id="btn-logout" class="nav-link">Sign Out</button>
      </div>
    `;
    document.getElementById('btn-logout').addEventListener('click', () => supabase.auth.signOut());
    unauthedState.classList.add('hidden');
    authedState.classList.remove('hidden');
    loadLibrary(); // Load lib automatically
  } else {
    navAuthContainer.innerHTML = `<button id="btn-login" class="nav-link">Sign In / Sign Up</button>`;
    document.getElementById('btn-login').addEventListener('click', () => authModal.classList.remove('hidden'));
    unauthedState.classList.remove('hidden');
    authedState.classList.add('hidden');
  }
}

// Modal handling
tabSignin.addEventListener('click', () => setAuthMode('signin'));
tabSignup.addEventListener('click', () => setAuthMode('signup'));
closeModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
  authMsg.innerText = '';
});

function setAuthMode(mode) {
  currentMode = mode;
  authMsg.innerText = '';
  if (mode === 'signin') {
    tabSignin.classList.add('active');
    tabSignup.classList.remove('active');
    authConfirm.classList.add('hidden');
    authConfirm.removeAttribute('required');
    modalTitle.innerText = "Sign In";
  } else {
    tabSignup.classList.add('active');
    tabSignin.classList.remove('active');
    authConfirm.classList.remove('hidden');
    authConfirm.setAttribute('required', 'true');
    modalTitle.innerText = "Sign Up";
  }
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authMsg.innerText = "Processing...";
  
  const email = authEmail.value;
  const password = authPassword.value;

  if (currentMode === 'signup') {
    if (password !== authConfirm.value) {
      authMsg.innerText = "Passwords do not match.";
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) authMsg.innerText = error.message;
    else authMsg.innerText = "Check your email to confirm your account.";
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authMsg.innerText = error.message;
    } else {
      authModal.classList.add('hidden');
      authForm.reset();
    }
  }
});

// --- PIPELINE TABS ---
pipeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    pipeTabs.forEach(t => t.classList.remove('active'));
    pipeContents.forEach(c => c.classList.add('hidden'));
    
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.remove('hidden');
  });
});

// --- TOOL A: DEEP SEARCH ---
document.getElementById('form-search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const container = document.getElementById('search-results');
  container.innerHTML = '<div class="notice-box">Querying Exa index...</div>';

  const query = document.getElementById('search-query').value;
  const startYear = document.getElementById('search-start').value;
  const endYear = document.getElementById('search-end').value;
  const useAutoprompt = document.getElementById('search-type').value === 'neural';

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, startYear, endYear, useAutoprompt })
    });
    const data = await res.json();
    renderCards(data.results || data, container);
  } catch (err) {
    container.innerHTML = `<div class="notice-box">Error: ${err.message}</div>`;
  }
});

// --- TOOL B: SIMILAR PAPERS ---
document.getElementById('form-similar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const container = document.getElementById('similar-results');
  container.innerHTML = '<div class="notice-box">Finding similarities...</div>';

  const url = document.getElementById('similar-url').value;

  try {
    const res = await fetch('/api/similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    renderCards(data.results || data, container);
  } catch (err) {
    container.innerHTML = `<div class="notice-box">Error: ${err.message}</div>`;
  }
});

// --- TOOL C: LIBRARY ---
document.getElementById('refresh-library').addEventListener('click', loadLibrary);

async function loadLibrary() {
  const container = document.getElementById('library-results');
  container.innerHTML = '<div class="notice-box">Loading library...</div>';

  const { data, error } = await supabase
    .from('saved_papers')
    .select('*')
    .order('saved_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="notice-box">Error: ${error.message}</div>`;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = '<div class="notice-box">Your library is empty.</div>';
    return;
  }

  container.innerHTML = '';
  data.forEach(paper => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <div class="paper-card-header">
        <a href="${paper.url}" target="_blank" class="paper-title">${paper.title || 'Untitled'}</a>
      </div>
      <div class="paper-meta">${paper.source || 'Unknown'} • ${paper.date ? paper.date.split('T')[0] : 'N/A'}</div>
      <div class="paper-summary">${paper.summary || 'No summary available.'}</div>
      <button class="btn-action" onclick="deletePaper('${paper.id}')">Delete Paper</button>
    `;
    container.appendChild(card);
  });
}

// --- HELPERS ---
function renderCards(papers, container) {
  container.innerHTML = '';
  if (!papers || papers.length === 0) {
    container.innerHTML = '<div class="notice-box">No results found.</div>';
    return;
  }

  papers.forEach(p => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    
    // Clean data
    const title = p.title || 'Untitled Document';
    const source = p.author || new URL(p.url).hostname;
    const date = p.publishedDate ? p.publishedDate.split('T')[0] : 'Date unknown';
    const summary = p.summary || p.text || 'No summary provided by index.';

    card.innerHTML = `
      <div class="paper-card-header">
        <a href="${p.url}" target="_blank" class="paper-title">${title}</a>
      </div>
      <div class="paper-meta">${source} • ${date}</div>
      <div class="paper-summary">${summary}</div>
      <button class="btn-action save-btn">Save Paper</button>
    `;

    // Save binding
    card.querySelector('.save-btn').addEventListener('click', async (e) => {
      e.target.innerText = "Saving...";
      const { error } = await supabase.from('saved_papers').insert([{
        user_id: currentUser.id,
        title: title,
        url: p.url,
        source: source,
        date: p.publishedDate || null,
        summary: summary
      }]);
      
      if (error) {
        e.target.innerText = "Error!";
        console.error(error);
      } else {
        e.target.innerText = "Saved";
        e.target.disabled = true;
        loadLibrary(); // background refresh
      }
    });

    container.appendChild(card);
  });
}

window.deletePaper = async function(id) {
  const { error } = await supabase.from('saved_papers').delete().eq('id', id);
  if (!error) loadLibrary();
};