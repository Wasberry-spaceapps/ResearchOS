// REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = "https://deioiojytowejhyszztw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlaW9pb2p5dG93ZWpoeXN6enR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDczODEsImV4cCI6MjA5Nzg4MzM4MX0.fkYIluOV3nHPx1y59YcEAA4f0ClYijbo8HMd8tQZDT0";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentUser = null;
let currentMode = "signin";

// DOM - Navigation & Auth Modal (Present on all pages)
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userMenu = document.getElementById('user-menu');
const userEmail = document.getElementById('user-email');

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

// DOM - Pipeline Specific (Only on pipeline.html)
const unauthedState = document.getElementById('unauthed-state');
const authedState = document.getElementById('authed-state');
const pipeTabs = document.querySelectorAll('.pipe-tab');
const pipeContents = document.querySelectorAll('.pipe-content');
const formSearch = document.getElementById('form-search');
const formSimilar = document.getElementById('form-similar');
const refreshLibraryBtn = document.getElementById('refresh-library');


// --- 1. AUTH LOGIC & UI UPDATER ---
async function updateUI(session) {
  currentUser = session?.user || null;
  
  if (currentUser) {
    // Logged In
    if (btnLogin) btnLogin.classList.add('hidden');
    if (userMenu) {
      userMenu.classList.remove('hidden');
      userEmail.innerText = currentUser.email;
    }
    
    // If on pipeline page
    if (unauthedState && authedState) {
      unauthedState.classList.add('hidden');
      authedState.classList.remove('hidden');
      loadLibrary();
    }
  } else {
    // Logged Out
    if (userMenu) userMenu.classList.add('hidden');
    if (btnLogin) btnLogin.classList.remove('hidden'); // This unhides your login button!
    
    // If on pipeline page
    if (unauthedState && authedState) {
      unauthedState.classList.remove('hidden'); // This unhides the pipeline login message!
      authedState.classList.add('hidden');
    }
  }
}

// 1A. Check auth state immediately on page load
supabase.auth.getSession().then(({ data: { session } }) => {
  updateUI(session);
});

// 1B. Listen for future sign ins / sign outs
supabase.auth.onAuthStateChange((event, session) => {
  updateUI(session);
});


// --- 2. MODAL & LOGOUT LISTENERS ---
if (btnLogin) btnLogin.addEventListener('click', () => authModal.classList.remove('hidden'));
if (btnLogout) btnLogout.addEventListener('click', () => supabase.auth.signOut());

if (closeModal) closeModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
  authMsg.innerText = '';
});

if (tabSignin) tabSignin.addEventListener('click', () => setAuthMode('signin'));
if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode('signup'));

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

if (authForm) {
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
}


// --- 3. PIPELINE PAGE LOGIC ---
if (pipeTabs.length > 0) {
  pipeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pipeTabs.forEach(t => t.classList.remove('active'));
      pipeContents.forEach(c => c.classList.add('hidden'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.remove('hidden');
    });
  });
}

// Deep Search Form
if (formSearch) {
  formSearch.addEventListener('submit', async (e) => {
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
}

// Find Similar Form
if (formSimilar) {
  formSimilar.addEventListener('submit', async (e) => {
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
}

// Library 
if (refreshLibraryBtn) {
  refreshLibraryBtn.addEventListener('click', loadLibrary);
}

async function loadLibrary() {
  const container = document.getElementById('library-results');
  if (!container) return; // Ignore if not on pipeline page
  
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

// --- RENDERING HELPERS ---
function renderCards(papers, container) {
  container.innerHTML = '';
  if (!papers || papers.length === 0) {
    container.innerHTML = '<div class="notice-box">No results found.</div>';
    return;
  }

  papers.forEach(p => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    
    const title = p.title || 'Untitled Document';
    let source = 'Unknown';
    try { source = p.author || new URL(p.url).hostname; } catch(e) {}
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
        loadLibrary();
      }
    });

    container.appendChild(card);
  });
}

window.deletePaper = async function(id) {
  const { error } = await supabase.from('saved_papers').delete().eq('id', id);
  if (!error) loadLibrary();
};
