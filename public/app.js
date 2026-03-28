// ── STATE ─────────────────────────────────────────────────────────────────────
let currentSort   = 'date';
let currentSearch = '';
let currentTag    = '';
let editingId     = null;
let activeCommentPostId = null;
let totalComments = 0;

// ── UTILS ─────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
  );
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── INIT (no particles needed — scene-bg handles background) ─────────────────
function initParticles() {
  initAurora();
}

// ── AURORA CANVAS ─────────────────────────────────────────────────────────────
function initAurora() {
  const canvas = document.getElementById('aurora-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Aurora wave bands
  const bands = [
    { y: 0.25, color: '#00ffb3', amp: 80,  speed: 0.0004, phase: 0 },
    { y: 0.35, color: '#7b2fff', amp: 60,  speed: 0.0006, phase: 2 },
    { y: 0.20, color: '#00e5ff', amp: 100, speed: 0.0003, phase: 4 },
    { y: 0.30, color: '#00ff88', amp: 50,  speed: 0.0005, phase: 1 },
  ];

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 1;

    bands.forEach(band => {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.3, hexToRgba(band.color, 0.0));
      gradient.addColorStop(0.5, hexToRgba(band.color, 0.18));
      gradient.addColorStop(0.7, hexToRgba(band.color, 0.06));
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(0, canvas.height);

      for (let x = 0; x <= canvas.width; x += 4) {
        const wave1 = Math.sin(x * 0.003 + t * band.speed * 1000 + band.phase) * band.amp;
        const wave2 = Math.sin(x * 0.007 + t * band.speed * 800  + band.phase + 1) * (band.amp * 0.4);
        const y = canvas.height * band.y + wave1 + wave2;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats(posts) {
  const totalVotes = posts.reduce((s, p) => s + (p.votes || 0), 0);
  animateNumber('stat-posts', posts.length);
  animateNumber('stat-votes', totalVotes);
  animateNumber('stat-comments', totalComments);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  if (diff === 0) return;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(start + diff * (step / steps));
    if (step >= steps) clearInterval(timer);
  }, 20);
}

// ── FETCH POSTS ───────────────────────────────────────────────────────────────
async function fetchPosts(
  search = currentSearch,
  sort   = currentSort,
  tag    = currentTag
) {
  currentSearch = search;
  currentSort   = sort;
  currentTag    = tag;

  const loading = document.getElementById('loading');
  const empty   = document.getElementById('empty-state');
  const grid    = document.getElementById('posts');

  loading.style.display = 'block';
  empty.style.display   = 'none';
  grid.innerHTML        = '';

  try {
    const params = new URLSearchParams({ search, sort });
    if (tag) params.set('tag', tag);

    const res = await fetch(`/api/posts?${params}`);
    if (!res.ok) throw new Error('Erreur serveur');
    const posts = await res.json();

    loading.style.display = 'none';

    if (!posts.length) {
      empty.style.display = 'block';
    } else {
      posts.forEach((p, i) => {
        const card = buildPostCard(p);
        card.style.animationDelay = `${i * 0.05}s`;
        grid.appendChild(card);
      });
    }

    updateStats(posts);
  } catch (err) {
    loading.style.display = 'none';
    showToast('Impossible de charger les posts', 'error');
    console.error(err);
  }
}

// ── BUILD POST CARD ───────────────────────────────────────────────────────────
function buildPostCard(p) {
  const color = p.color || 'yellow';
  const tag   = p.tag   || 'général';

  const card = document.createElement('article');
  card.className = `post-card ${color}${p.pinned ? ' pinned' : ''}`;
  card.dataset.id = p.id;

  const tagMeta = {
    'général':  '💬', 'idée': '💡', 'question': '❓',
    'urgent': '🚨', 'fun': '😄', 'annonce': '📢'
  };

  card.innerHTML = `
    <div class="post-actions">
      <button class="action-btn pin ${p.pinned ? 'active' : ''}"
        onclick="togglePin(${p.id})" title="${p.pinned ? 'Désépingler' : 'Épingler'}">
        📌
      </button>
      <button class="action-btn edit" onclick="startEdit(${p.id})" title="Modifier">✎</button>
      <button class="action-btn delete" onclick="deletePost(${p.id})" title="Supprimer">🗑</button>
    </div>
    ${p.pinned ? '<div class="pin-badge">📌 Épinglé</div>' : ''}
    <div class="post-tag-badge">${tagMeta[tag] || '💬'} ${escapeHtml(tag)}</div>
    <h3 class="post-title">${escapeHtml(p.title)}</h3>
    <p class="post-content">${escapeHtml(p.content)}</p>

    <!-- REACTIONS (nouvelle fonctionnalité) -->
    <div class="reactions-bar" id="reactions-${p.id}">
      <span class="reactions-loading">…</span>
    </div>

    <div class="post-footer">
      <div class="post-meta">
        <span class="post-author">👤 ${escapeHtml(p.author || 'Anonyme')}</span>
        <span class="post-date">📅 ${formatDate(p.created_at)}</span>
      </div>
      <div class="post-btns">
        <button class="vote-btn up" onclick="vote(${p.id},'up')">
          👍 <span class="vote-count" id="votes-${p.id}">${p.votes || 0}</span>
        </button>
        <button class="vote-btn down" onclick="vote(${p.id},'down')">👎</button>
        <button class="comment-btn" onclick="openComments(${p.id}, '${escapeHtml(p.title)}')">💬</button>
      </div>
    </div>
  `;

  // Load reactions asynchronously after card is built
  loadReactions(p.id);

  return card;
}

// ── FEATURE 1: TAGS ───────────────────────────────────────────────────────────

// Tag selector in the form
document.querySelectorAll('.tag-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('post-tag').value = btn.dataset.tag;
  });
});

// Tag filter buttons
document.querySelectorAll('.filter-tag').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fetchPosts(currentSearch, currentSort, btn.dataset.tag);
  });
});

// ── FEATURE 2: PIN ────────────────────────────────────────────────────────────
async function togglePin(id) {
  try {
    const res = await fetch(`/api/posts/${id}/pin`, { method: 'PATCH' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    showToast(data.pinned ? '📌 Post épinglé !' : '📌 Post désépinglé', 'info');
    await fetchPosts();
  } catch {
    showToast('Erreur lors de l\'épinglage', 'error');
  }
}

// ── FEATURE 3: REACTIONS ──────────────────────────────────────────────────────
const EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '😢'];

async function loadReactions(postId) {
  const bar = document.getElementById(`reactions-${postId}`);
  if (!bar) return;

  try {
    const res = await fetch(`/api/posts/${postId}/reactions`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderReactions(postId, data);
  } catch {
    if (bar) bar.innerHTML = '';
  }
}

function renderReactions(postId, data) {
  const bar = document.getElementById(`reactions-${postId}`);
  if (!bar) return;

  // Build a map for quick lookup
  const counts = {};
  data.forEach(r => { counts[r.emoji] = r.count; });

  bar.innerHTML = EMOJIS.map(emoji => {
    const count = counts[emoji] || 0;
    return `
      <button class="reaction-btn ${count > 0 ? 'has-reactions' : ''}"
        onclick="addReaction(${postId}, '${emoji}')"
        title="Réagir avec ${emoji}">
        ${emoji}${count > 0 ? `<span class="reaction-count">${count}</span>` : ''}
      </button>
    `;
  }).join('');
}

async function addReaction(postId, emoji) {
  try {
    const res = await fetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderReactions(postId, data);

    // Animate the button
    const bar = document.getElementById(`reactions-${postId}`);
    if (bar) {
      const btns = bar.querySelectorAll('.reaction-btn');
      btns.forEach(b => {
        if (b.textContent.startsWith(emoji)) {
          b.classList.add('pop');
          setTimeout(() => b.classList.remove('pop'), 300);
        }
      });
    }
  } catch {
    showToast('Erreur lors de la réaction', 'error');
  }
}

// ── CREATE / EDIT POST ────────────────────────────────────────────────────────
document.getElementById('new-post-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title   = document.getElementById('title').value.trim();
  const author  = document.getElementById('author').value.trim();
  const content = document.getElementById('content').value.trim();
  const color   = document.getElementById('post-color').value;
  const tag     = document.getElementById('post-tag').value;

  if (!title || !content) { showToast('Titre et contenu requis', 'error'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span>';

  try {
    const url    = editingId ? `/api/posts/${editingId}` : '/api/posts';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, author, color, tag })
    });

    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur'); }

    cancelEdit();
    await fetchPosts();
    showToast(editingId ? '✅ Post modifié !' : '✅ Post publié !');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">➕</span> Publier';
  }
});

async function startEdit(id) {
  try {
    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) throw new Error();
    const p = await res.json();

    document.getElementById('title').value   = p.title;
    document.getElementById('author').value  = p.author || '';
    document.getElementById('content').value = p.content;
    document.getElementById('char-count').textContent = p.content.length;

    // Restore color
    const color = p.color || 'yellow';
    document.getElementById('post-color').value = color;
    document.querySelectorAll('.color-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === color);
    });

    // Restore tag
    const tag = p.tag || 'général';
    document.getElementById('post-tag').value = tag;
    document.querySelectorAll('.tag-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.tag === tag);
    });

    editingId = id;
    document.getElementById('form-title').textContent = '✏️ Modifier';
    document.getElementById('submit-btn').innerHTML = '<span class="btn-icon">💾</span> Sauvegarder';
    document.getElementById('cancel-btn').style.display = 'inline-flex';

    document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('title').focus();
    showToast('Mode édition activé', 'info');
  } catch {
    showToast('Impossible de charger le post', 'error');
  }
}

function cancelEdit() {
  editingId = null;
  document.getElementById('new-post-form').reset();
  document.getElementById('char-count').textContent = '0';
  document.getElementById('form-title').textContent = 'Nouveau Post';
  document.getElementById('submit-btn').innerHTML = '<span class="btn-icon">➕</span> Publier';
  document.getElementById('cancel-btn').style.display = 'none';

  // Reset color
  document.querySelectorAll('.color-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
  document.getElementById('post-color').value = 'yellow';

  // Reset tag
  document.querySelectorAll('.tag-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
  document.getElementById('post-tag').value = 'général';
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function deletePost(id) {
  if (!confirm('Supprimer ce post définitivement ?')) return;
  try {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    const card = document.querySelector(`.post-card[data-id="${id}"]`);
    if (card) {
      card.style.transition = 'all 0.3s ease';
      card.style.transform  = 'scale(0.8)';
      card.style.opacity    = '0';
      setTimeout(() => card.remove(), 300);
    }
    showToast('🗑️ Post supprimé');
    setTimeout(fetchPosts, 350);
  } catch {
    showToast('Erreur lors de la suppression', 'error');
  }
}

// ── VOTE ──────────────────────────────────────────────────────────────────────
async function vote(id, type) {
  try {
    const res = await fetch(`/api/posts/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const el = document.getElementById(`votes-${id}`);
    if (el) {
      el.textContent = data.votes;
      el.parentElement.style.transform = 'scale(1.2)';
      setTimeout(() => el.parentElement.style.transform = '', 200);
    }
    // Recalculate total votes from DOM
    const totalVotes = [...document.querySelectorAll('.vote-count')]
      .reduce((s, el) => s + (parseInt(el.textContent) || 0), 0);
    document.getElementById('stat-votes').textContent = totalVotes;
  } catch {
    showToast('Erreur vote', 'error');
  }
}

// ── COMMENTS MODAL ────────────────────────────────────────────────────────────
async function openComments(postId, postTitle) {
  activeCommentPostId = postId;
  document.getElementById('modal-post-info').innerHTML =
    `<strong>${escapeHtml(postTitle)}</strong>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  await loadComments(postId);
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  activeCommentPostId = null;
  document.getElementById('comment-form').reset();
}

async function loadComments(postId) {
  const list = document.getElementById('comments-list');
  list.innerHTML = '<div class="no-comments">Chargement...</div>';
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    if (!res.ok) throw new Error();
    const comments = await res.json();
    renderComments(comments);
  } catch {
    list.innerHTML = '<div class="no-comments">Erreur de chargement</div>';
  }
}

function renderComments(comments) {
  const list = document.getElementById('comments-list');
  totalComments = comments.length;
  if (!comments.length) {
    list.innerHTML = '<div class="no-comments">Aucun commentaire. Soyez le premier !</div>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="c-author">💬 ${escapeHtml(c.author || 'Anonyme')}</div>
      <div class="c-text">${escapeHtml(c.content)}</div>
      <div class="c-date">${formatDate(c.created_at)}</div>
    </div>
  `).join('');
}

document.getElementById('comment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeCommentPostId) return;
  const author  = document.getElementById('comment-author').value.trim();
  const content = document.getElementById('comment-content').value.trim();
  if (!content) { showToast('Commentaire vide', 'error'); return; }

  try {
    const res = await fetch(`/api/posts/${activeCommentPostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content })
    });
    if (!res.ok) throw new Error();
    document.getElementById('comment-form').reset();
    await loadComments(activeCommentPostId);
    totalComments++;
    document.getElementById('stat-comments').textContent = totalComments;
    showToast('💬 Commentaire ajouté !');
  } catch {
    showToast("Erreur lors de l'envoi", 'error');
  }
});

// ── COLOR PICKER ──────────────────────────────────────────────────────────────
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('post-color').value = btn.dataset.color;
  });
});

// ── CHAR COUNTER ──────────────────────────────────────────────────────────────
document.getElementById('content').addEventListener('input', function () {
  document.getElementById('char-count').textContent = this.value.length;
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
let searchTimer;
document.getElementById('search-input').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchPosts(e.target.value, currentSort, currentTag), 300);
});

// ── SORT TABS ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.sort-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    fetchPosts(currentSearch, tab.dataset.sort, currentTag);
  });
});

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal({ target: document.getElementById('modal-overlay') });
});

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  fetchPosts();
  init3DTilt();
});

// ── 3D TILT ON CARDS (mouse follow) ──────────────────────────────────────────
function init3DTilt() {
  document.getElementById('posts').addEventListener('mousemove', (e) => {
    const card = e.target.closest('.post-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) translateY(-8px) scale(1.02)`;
  });
  document.getElementById('posts').addEventListener('mouseleave', (e) => {
    const card = e.target.closest('.post-card');
    if (card) card.style.transform = '';
  }, true);
  document.getElementById('posts').addEventListener('mouseleave', () => {
    document.querySelectorAll('.post-card').forEach(c => c.style.transform = '');
  });
}
