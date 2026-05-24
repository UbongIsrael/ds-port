/* ========================================
   DIGITAL SHEIKH — script.js
   Typewriter + Scroll Reveals + Terminal
   ======================================== */

// ──────────── On Load ────────────
document.addEventListener('DOMContentLoaded', () => {

    // ── Typewriter Animation ──
    const typewriterText = document.getElementById('typewriter-text');
    const heroSubtitle = document.querySelector('.hero__subtitle');
    const heroBody = document.querySelector('.hero__body');
    const heroCta = document.querySelector('.hero__cta');

    if (typewriterText) {
        // Detect the current page and choose the typewriter string accordingly
        const page = window.location.pathname;
        let text = 'I Build the Infrastructure Scaling Startups Run On.'; // default: index
        if (page.includes('studios')) {
            text = 'Motion. VFX. 3D.';
        } else if (page.includes('media')) {
            text = 'Content that builds empires.';
        } else if (page.includes('labs')) {
            text = 'Built in public. Shipped in production.';
        }

        // Hide hero elements below the headline until typewriter finishes
        [heroSubtitle, heroBody, heroCta].forEach((el) => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            }
        });

        let i = 0;
        const speed = 90; // ms per character

        function typeChar() {
            if (i < text.length) {
                typewriterText.textContent += text.charAt(i);
                i++;
                setTimeout(typeChar, speed);
            } else {
                // Typewriter done — reveal the rest of the hero
                setTimeout(() => {
                    [heroSubtitle, heroBody, heroCta].forEach((el, idx) => {
                        if (el) {
                            setTimeout(() => {
                                el.style.opacity = '1';
                                el.style.transform = 'translateY(0)';
                            }, idx * 150);
                        }
                    });
                }, 300);
            }
        }

        // Start typewriter after a brief pause (let logo fade in first)
        setTimeout(typeChar, 800);
    }

    // ── Scroll Reveal ──
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach((el) => observer.observe(el));

    // ── Terminal ──
    initTerminal();

    // ── Cursor Glow Follower ──
    const glow = document.getElementById('cursor-glow');
    if (glow) {
        let mouseX = 0, mouseY = 0;
        let glowX = 0, glowY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!glow.classList.contains('active')) {
                glow.classList.add('active');
            }
        });

        document.addEventListener('mouseleave', () => {
            glow.classList.remove('active');
        });

        function animateGlow() {
            // Smooth lerp for buttery follow
            glowX += (mouseX - glowX) * 0.15;
            glowY += (mouseY - glowY) * 0.15;
            glow.style.left = glowX + 'px';
            glow.style.top = glowY + 'px';
            requestAnimationFrame(animateGlow);
        }
        animateGlow();
    }
});

// ──────────── GitHub Repo Fetcher ────────────
const CACHE_VERSION = '2';
let reposChangedCallbacks = [];

function onReposChanged(cb) {
    reposChangedCallbacks.push(cb);
}

async function fetchGitHubRepos(forceFetch) {
    // Cache-first: return immediately if available (any age)
    if (!forceFetch) {
        try {
            const cached = localStorage.getItem('gh_repos');
            const ver = localStorage.getItem('gh_repos_ver');
            if (cached && ver === CACHE_VERSION) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            localStorage.removeItem('gh_repos');
            localStorage.removeItem('gh_repos_ver');
            localStorage.removeItem('gh_repos_ts');
        }
    }

    const res = await fetch('https://api.github.com/users/UbongIsrael/repos?sort=updated&per_page=100');
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} — ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Unexpected response from GitHub API');
    localStorage.setItem('gh_repos', JSON.stringify(data));
    localStorage.setItem('gh_repos_ver', CACHE_VERSION);
    localStorage.setItem('gh_repos_ts', String(Date.now()));
    return data;
}

function backgroundRefreshRepos() {
    const oldRaw = localStorage.getItem('gh_repos');
    const old = oldRaw ? JSON.parse(oldRaw) : null;

    fetchGitHubRepos(true).then(fresh => {
        const oldStr = JSON.stringify((old || []).map(r => r.name + r.description));
        const newStr = JSON.stringify(fresh.map(r => r.name + r.description));
        if (oldStr !== newStr) {
            reposChangedCallbacks.forEach(cb => cb(fresh));
        }
    }).catch(() => {
        // silent — user has cached data already
    });
}
    const parts = [];
    if (repo.language) parts.push(repo.language);
    if (repo.topics && repo.topics.length) {
        repo.topics.slice(0, 2).forEach(t =>
            parts.push(t.charAt(0).toUpperCase() + t.slice(1))
        );
    }
    return parts.join(' · ') || '—';
}

// ──────────── Terminal Logic ────────────
function initTerminal() {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const body = document.getElementById('terminal-body');

    if (!input || !output) return;

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value.trim().toLowerCase();
            if (!cmd) return;

            // Echo the command
            appendLine(`<span class="prompt-prefix">sheikh@labs:~$</span> ${escapeHtml(input.value.trim())}`, 'terminal__line--prompt');
            input.value = '';

            // ls is async — handle separately
            if (cmd === 'ls') {
                appendLine('fetching repos...', 'terminal__line--muted', true);
                const response = await lsOutput();
                typewriterOutput(response, output, body);
            } else {
                const response = processCommand(cmd);
                typewriterOutput(response, output, body);
            }
        }
    });

    // Focus terminal on click
    body.addEventListener('click', () => input.focus());
}

function processCommand(cmd) {
    switch (cmd) {
        case 'ls':
            return []; // handled async in the event listener
        case 'whoami':
            return whoamiOutput();
        case 'contact':
            return contactOutput();
        case 'help':
            return helpOutput();
        case 'clear':
            return '__CLEAR__';
        default:
            return [
                { text: `command not found: ${cmd}`, cls: 'terminal__line--muted' },
                { text: 'Type <strong style="color:var(--text-primary)">help</strong> for available commands.', cls: 'terminal__line--muted' },
            ];
    }
}

// ──────────── Command Outputs ────────────

async function lsOutput() {
    const staticProjects = [
        {
            name: 'firstride',
            stack: 'Infra',
            desc: 'IT infrastructure for Ocean Wealth Transport & Logistics e-hailing platform',
        },
    ];

    let githubProjects = [];

    try {
        const repos = await fetchGitHubRepos();
        githubProjects = repos
            .filter((repo) => repo.description && repo.description.trim() !== '')
            .map((repo) => ({
                name: repo.name,
                stack: buildStack(repo),
                desc: repo.description,
            }));
    } catch (err) {
        console.error(err);
        githubProjects = [
            { name: '⚠ fetch failed', stack: '', desc: 'Could not reach GitHub API. Check connection.' },
        ];
    }

    const projects = [...staticProjects, ...githubProjects];

    // Build table HTML
    let tableHtml = '<div class="terminal__table">';
    tableHtml += `<div class="terminal__table-row">
    <span>PROJECT</span><span>STACK</span><span>DESCRIPTION</span>
  </div>`;
    projects.forEach((p) => {
        tableHtml += `<div class="terminal__table-row">
      <span class="project-name">${p.name}</span>
      <span class="project-stack">${p.stack}</span>
      <span class="project-desc">${p.desc}</span>
    </div>`;
    });
    tableHtml += '</div>';

    return [{ html: tableHtml }];
}

function whoamiOutput() {
    return [
        { text: '' },
        { text: 'Sheikh Ubong Israel.', cls: 'terminal__line--highlight' },
        { text: 'Computer Engineering graduate. IT Manager at Ocean Wealth Transport & Logistics by day, MCP architect and Web3 builder by night.' },
        { text: 'Based in Abuja, Nigeria. On-chain as @0xBonge.' },
        { text: 'Automation Geek — I create bots, workflows, and systems that think.' },
        { text: 'Active in Python Uyo Community, Black Python Devs, and PyCon Africa.' },
        { text: 'Tier S Context Protocol grantee.' },
        { text: '' },
        { text: 'Type <strong style="color:var(--text-primary)">ls</strong> to see the work or <strong style="color:var(--text-primary)">contact</strong> to link up.', cls: 'terminal__line--muted' },
    ];
}

function contactOutput() {
    return [
        { text: '' },
        { text: '📧  <strong style="color:var(--text-primary)">Email</strong>     <a href="mailto:sheikhthefather@gmail.com">sheikhthefather@gmail.com</a>', cls: 'terminal__line--link' },
        { text: '🐙  <strong style="color:var(--text-primary)">GitHub</strong>    <a href="https://github.com/UbongIsrael" target="_blank">@UbongIsrael</a>', cls: 'terminal__line--link' },
        { text: '🐦  <strong style="color:var(--text-primary)">Twitter</strong>   <a href="https://twitter.com/0xBonge" target="_blank">@0xBonge</a>', cls: 'terminal__line--link' },
        { text: '⚡  <strong style="color:var(--text-primary)">Automation</strong> <a href="https://automation.digitalsheikh.com" target="_blank">automation.digitalsheikh.com</a>', cls: 'terminal__line--link' },
        { text: '' },
    ];
}

function helpOutput() {
    return [
        { text: '' },
        { text: 'Available commands:', cls: 'terminal__line--highlight' },
        { text: '' },
        { text: '  <strong style="color:var(--text-primary)">ls</strong>        List all projects' },
        { text: '  <strong style="color:var(--text-primary)">whoami</strong>    Who is Digital Sheikh?' },
        { text: '  <strong style="color:var(--text-primary)">contact</strong>   Contact info and links' },
        { text: '  <strong style="color:var(--text-primary)">help</strong>      Show this help message' },
        { text: '  <strong style="color:var(--text-primary)">clear</strong>     Clear the terminal' },
        { text: '' },
    ];
}

// ──────────── Rendering Helpers ────────────

function typewriterOutput(lines, outputEl, bodyEl) {
    if (lines === '__CLEAR__') {
        outputEl.innerHTML = '';
        return;
    }

    let delay = 0;
    const increment = 40; // ms between lines

    lines.forEach((line) => {
        setTimeout(() => {
            if (line.html) {
                const div = document.createElement('div');
                div.innerHTML = line.html;
                div.style.opacity = '0';
                div.style.transform = 'translateY(4px)';
                div.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                outputEl.appendChild(div);
                requestAnimationFrame(() => {
                    div.style.opacity = '1';
                    div.style.transform = 'translateY(0)';
                });
            } else {
                appendLine(line.text || '', line.cls || '', true);
            }
            bodyEl.scrollTop = bodyEl.scrollHeight;
        }, delay);
        delay += increment;
    });
}

function appendLine(text, cls, animate) {
    const output = document.getElementById('terminal-output');
    const div = document.createElement('div');
    div.className = 'terminal__line' + (cls ? ' ' + cls : '');
    div.innerHTML = text;

    if (animate) {
        div.style.opacity = '0';
        div.style.transform = 'translateY(4px)';
        div.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        output.appendChild(div);
        requestAnimationFrame(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
        });
    } else {
        output.appendChild(div);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ========================================
   LABS PAGE MODULE
   ======================================== */

const FEATURED_TOPIC = 'ds-featured';
const UNLISTED_TOPIC = 'ds-unlisted';
const GITHUB_USER = 'UbongIsrael';

function formatName(name) {
    return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function visibleTopics(topics) {
    return (topics || []).filter(t => t !== FEATURED_TOPIC && t !== UNLISTED_TOPIC);
}

function initLabsPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('project')) {
        renderProjectDetail(params.get('project'));
    } else {
        renderProjectGallery();
    }
}

// ──────────── GALLERY VIEW ────────────

async function renderProjectGallery() {
    const gallery = document.getElementById('labs-gallery');
    const detail = document.getElementById('labs-detail');
    const hero = document.getElementById('labs-hero');
    const featuredSection = document.getElementById('featured-carousel-section');
    if (!gallery) return;

    gallery.style.display = 'block';
    if (detail) detail.style.display = 'none';
    if (hero) hero.style.display = '';
    document.documentElement.style.setProperty('--hero-display', '');

    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    const grid = document.getElementById('projects-grid');
    if (!track || !dots || !grid) return;

    try {
        const repos = await fetchGitHubRepos();

        const featured = repos.filter(r => r.topics && r.topics.includes(FEATURED_TOPIC));
        const regular = repos.filter(r => {
            const topics = r.topics || [];
            return !topics.includes(FEATURED_TOPIC) && !topics.includes(UNLISTED_TOPIC);
        });

        // Hide featured section if no featured repos
        if (featuredSection) {
            featuredSection.style.display = featured.length ? '' : 'none';
        }

        buildCarousel(track, dots, featured);
        buildProjectGrid(grid, regular);

        // Register background refresh — silently updates on next visit
        stopCarousel();
        const currentFeatured = featured;
        const currentRegular = regular;
        onReposChanged(fresh => {
            const feat = fresh.filter(r => r.topics && r.topics.includes(FEATURED_TOPIC));
            const reg = fresh.filter(r => {
                const t = r.topics || [];
                return !t.includes(FEATURED_TOPIC) && !t.includes(UNLISTED_TOPIC);
            });
            if (featuredSection) featuredSection.style.display = feat.length ? '' : 'none';
            buildCarousel(track, dots, feat);
            buildProjectGrid(grid, reg);
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        });
        backgroundRefreshRepos();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    } catch (err) {
        console.error('[Labs] Failed to load GitHub repos:', err);
        const errHtml = `
            <div class="labs-skeleton" style="text-align:center;padding:60px 20px;">
                <p style="color:var(--text-secondary);margin-bottom:16px;max-width:480px;margin-left:auto;margin-right:auto;">
                    Couldn't load projects right now — check back soon or visit
                    <a href="https://github.com/UbongIsrael" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">GitHub</a>
                    directly.
                </p>
            </div>`;
        track.innerHTML = errHtml;
        grid.innerHTML = errHtml;
    }
}

// ── Carousel ──

let carouselInterval = null;
let carouselIndex = 0;
let carouselSlides = 0;

function buildCarousel(track, dots, repos) {
    if (!repos.length) {
        track.innerHTML = '';
        return;
    }

    carouselSlides = repos.length;
    carouselIndex = 0;

    track.innerHTML = repos.map(repo => {
        const topics = visibleTopics(repo.topics).slice(0, 4);
        const stackHtml = topics.map(t => `<span>${escapeHtml(t)}</span>`).join('');
        const stars = repo.stargazers_count || 0;
        const name = formatName(repo.name);

        return `
            <div class="carousel__slide" data-repo="${escapeHtml(repo.name)}">
                <div class="carousel__slide-top">
                    <span class="carousel__slide-name">${escapeHtml(name)}</span>
                    ${repo.language ? `<span class="carousel__slide-lang">${escapeHtml(repo.language)}</span>` : ''}
                </div>
                <p class="carousel__slide-desc">${escapeHtml(repo.description || '')}</p>
                ${stackHtml ? `<div class="carousel__slide-stack">${stackHtml}</div>` : ''}
                <div class="carousel__slide-footer">
                    ${stars > 0 ? `<span class="carousel__slide-stars">★ ${stars}</span>` : ''}
                    <div class="carousel__slide-links">
                        ${repo.homepage ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener" class="carousel__slide-link" onclick="event.stopPropagation();">Live Demo →</a>` : ''}
                        <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="carousel__slide-link" onclick="event.stopPropagation();">View on GitHub →</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    dots.innerHTML = repos.map((_, i) =>
        `<button class="carousel__dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`
    ).join('');

    track.querySelectorAll('.carousel__slide').forEach(slide => {
        slide.addEventListener('click', () => {
            const name = slide.dataset.repo;
            window.location.href = `/labs?project=${encodeURIComponent(name)}`;
        });
    });

    const prev = document.getElementById('carousel-prev');
    const next = document.getElementById('carousel-next');
    if (prev) prev.addEventListener('click', () => { stopCarousel(); prevSlide(); startCarousel(); });
    if (next) next.addEventListener('click', () => { stopCarousel(); nextSlide(); startCarousel(); });

    dots.querySelectorAll('.carousel__dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.dataset.index);
            stopCarousel();
            goToSlide(idx);
            startCarousel();
        });
    });

    const wrapper = track.closest('.carousel');
    if (wrapper) {
        wrapper.addEventListener('mouseenter', stopCarousel);
        wrapper.addEventListener('mouseleave', startCarousel);
    }

    startCarousel();
}

function goToSlide(index) {
    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    if (!track || !dots) return;

    carouselIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;

    dots.querySelectorAll('.carousel__dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function nextSlide() {
    goToSlide((carouselIndex + 1) % carouselSlides);
}

function prevSlide() {
    goToSlide((carouselIndex - 1 + carouselSlides) % carouselSlides);
}

function startCarousel() {
    if (carouselSlides <= 1) return;
    stopCarousel();
    carouselInterval = setInterval(nextSlide, 5000);
}

function stopCarousel() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }
}

// ── Project Grid ──

function buildProjectGrid(grid, repos) {
    if (!repos.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;grid-column:1/-1;">No additional projects yet.</p>';
        return;
    }

    grid.innerHTML = repos.map(repo => {
        const topics = visibleTopics(repo.topics).slice(0, 3);
        const stackHtml = topics.map(t => `<span>${escapeHtml(t)}</span>`).join('');
        const stars = repo.stargazers_count || 0;
        const name = formatName(repo.name);

        return `
            <div class="project-card reveal" data-repo="${escapeHtml(repo.name)}">
                <div class="project-card__top">
                    <span class="project-card__name">${escapeHtml(name)}</span>
                    ${repo.language ? `<span class="project-card__lang">${escapeHtml(repo.language)}</span>` : ''}
                </div>
                <p class="project-card__desc">${escapeHtml(repo.description || '')}</p>
                ${stackHtml ? `<div class="project-card__stack">${stackHtml}</div>` : ''}
                <div class="project-card__stats">
                    ${stars > 0 ? `<span>★ ${stars}</span>` : ''}
                    ${repo.homepage ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener" class="project-card__link" onclick="event.stopPropagation();">Live Demo</a>` : ''}
                </div>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.repo;
            window.location.href = `/labs?project=${encodeURIComponent(name)}`;
        });
    });
}

// ──────────── DETAIL VIEW ────────────

async function renderProjectDetail(repoName) {
    const gallery = document.getElementById('labs-gallery');
    const detail = document.getElementById('labs-detail');
    const hero = document.getElementById('labs-hero');
    const navLabel = document.getElementById('nav-label');
    const navBack = document.getElementById('nav-back-link');

    if (gallery) gallery.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (detail) detail.style.display = 'block';
    document.documentElement.style.setProperty('--hero-display', 'none');

    if (navLabel) navLabel.textContent = repoName;
    if (navBack) {
        navBack.href = '/labs';
        navBack.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Labs
        `;
    }

    // Show loading
    const header = document.getElementById('detail-header');
    const screenshots = document.getElementById('screenshot-gallery');
    const stack = document.getElementById('detail-stack');
    const actions = document.getElementById('detail-actions');
    const readme = document.getElementById('detail-readme');

    if (header) header.innerHTML = '<div class="labs-skeleton"><div class="labs-skeleton__spinner"></div><p>Loading project...</p></div>';
    if (screenshots) screenshots.innerHTML = '';

    try {
        // Fetch individual repo details
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}`);
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        const repo = await res.json();

        // Basic info
        document.title = `${repo.name} — Digital Sheikh Labs`;

        if (header) {
            header.innerHTML = `
                <h1 class="detail__title">${escapeHtml(repo.name)}</h1>
                <p class="detail__description">${escapeHtml(repo.description || 'No description provided.')}</p>
                <div class="detail__meta">
                    ${repo.language ? `<span>${escapeHtml(repo.language)}</span>` : ''}
                    <span>★ ${repo.stargazers_count || 0}</span>
                    <span>${repo.forks_count || 0} forks</span>
                    <span>Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>
                </div>
            `;
        }

        // Screenshots
        if (screenshots) {
            await loadScreenshots(screenshots, repoName);
        }

        // Tech stack
        const topics = repo.topics || [];
        if (stack) {
            const allTags = [repo.language, ...topics].filter(Boolean);
            stack.innerHTML = allTags.map(t => `<span>${escapeHtml(t)}</span>`).join('');
        }

        // Action buttons
        if (actions) {
            let buttonsHtml = '';
            if (repo.homepage) {
                buttonsHtml += `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener" class="btn btn--glow">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    View Project
                </a>`;
            }
            buttonsHtml += `<a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="btn btn--outline">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View Source
            </a>`;
            actions.innerHTML = buttonsHtml;
        }

        // README
        if (readme) {
            const readmeRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/readme`, {
                headers: { 'Accept': 'application/vnd.github.v3.raw' }
            });
            if (readmeRes.ok) {
                const text = await readmeRes.text();
                readme.innerHTML = renderMarkdown(text);
            } else {
                readme.innerHTML = '<p style="color:var(--text-muted)">No README available.</p>';
            }
        }

        // Update URL without page reload
        window.history.pushState({ project: repoName }, repoName, `/labs?project=${encodeURIComponent(repoName)}`);

    } catch (err) {
        if (header) header.innerHTML = `<div class="labs-skeleton"><p>Failed to load project. ${err.message}</p></div>`;
    }
}

async function loadScreenshots(container, repoName) {
    try {
        // Try to list screenshots from repo's assets/screenshots directory
        const contentsRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/contents/assets/screenshots`);
        if (contentsRes.ok) {
            const files = await contentsRes.json();
            const images = files.filter(f => f.type === 'file' && /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name));

            if (images.length) {
                container.innerHTML = images.map(img => `
                    <div class="screenshot-gallery__item">
                        <img src="${escapeHtml(img.download_url)}" alt="${escapeHtml(img.name)}" loading="lazy">
                    </div>
                `).join('');
                return;
            }
        }
    } catch (e) {
        // fall through to fallback
    }

    // Fallback: try GitHub social preview
    const fallbackUrl = `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repoName}`;
    container.innerHTML = `
        <div class="screenshot-gallery__item">
            <img src="${fallbackUrl}" alt="${escapeHtml(repoName)} preview" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'screenshot-gallery__placeholder\\'><span>No screenshots available</span></div>'">
        </div>
    `;
}

// ── Markdown renderer (lightweight) ──

function renderMarkdown(text) {
    let html = text;

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Headings
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Bold & italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up nested paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<\/p>\n*<p><\/p>/g, '</p><p>');
    html = html.replace(/<p><br><\/p>/g, '');

    return html;
}

// ──────────── Init on labs page ────────────

if (window.location.pathname.includes('labs')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLabsPage);
    } else {
        initLabsPage();
    }
}

// Handle browser back/forward for project detail
window.addEventListener('popstate', () => {
    if (window.location.pathname.includes('labs')) {
        const params = new URLSearchParams(window.location.search);
        const projectName = params.get('project');
        if (projectName) {
            renderProjectDetail(projectName);
        } else {
            renderProjectGallery();
        }
    }
});
