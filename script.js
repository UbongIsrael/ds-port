/* ========================================
   DIGITAL SHEIKH — script.js
   Scroll Reveals + Project Gallery + Terminal
   ======================================== */

// ──────────── On Load ────────────
document.addEventListener('DOMContentLoaded', () => {

    // Keep the headline and calls to action readable from the first paint.
    // Only reveal offscreen content, with a short animation before it enters view.
    observeReveals(document);
    initProductMarks();
    initLiveDemoGrid();
    const tickerPause = document.querySelector('.marquee-pause');
    tickerPause?.addEventListener('click', () => {
        const paused = tickerPause.getAttribute('aria-pressed') !== 'true';
        tickerPause.setAttribute('aria-pressed', String(paused));
        tickerPause.setAttribute('aria-label', paused ? 'Play technology ticker' : 'Pause technology ticker');
        tickerPause.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    });

    // ── Terminal ──
    initTerminal();

    // ── Cursor Glow Follower ──
    const glow = document.getElementById('cursor-glow');
    if (glow && !window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) {
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
            glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
            requestAnimationFrame(animateGlow);
        }
        animateGlow();
    }
});

// ──────────── GitHub Repo Fetcher ────────────
const CACHE_VERSION = '3';
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

function buildStack(repo) {
    const parts = [];
    if (repo.language) parts.push(repo.language);
    if (repo.topics && repo.topics.length) {
        visibleTopics(repo.topics).slice(0, 2).forEach(t =>
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

    let busy = false;
    async function runCommand(value) {
        const cmd = value.trim().toLowerCase();
        if (!cmd || busy) return;
        busy = true;
        appendLine(`<span class="prompt-prefix">sheikh@labs:~$</span> ${escapeHtml(value.trim())}`, 'terminal__line--prompt');
        input.value = '';
        if (cmd === 'ls') {
            appendLine('Fetching repos…', 'terminal__line--muted');
        }
        const response = cmd === 'ls' ? await lsOutput() : processCommand(cmd);
        renderTerminalOutput(response, output, body);
        busy = false;
    }

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') runCommand(input.value);
    });
    document.querySelectorAll('[data-terminal-command]').forEach(button => {
        button.addEventListener('click', () => runCommand(button.dataset.terminalCommand));
    });
    // Preserve links, text selection, and touch scrolling inside the terminal.
    body.addEventListener('click', (event) => {
        if (!event.target.closest('a, button') && !window.getSelection().toString()) {
            input.focus({ preventScroll: true });
        }
    });
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
            .filter((repo) => repo.description && repo.description.trim() !== '' && !(repo.topics || []).includes(UNLISTED_TOPIC))
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
      <span class="project-name">${escapeHtml(p.name)}</span>
      <span class="project-stack">${escapeHtml(p.stack)}</span>
      <span class="project-desc">${escapeHtml(p.desc)}</span>
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

function renderTerminalOutput(lines, outputEl, bodyEl) {
    if (lines === '__CLEAR__') {
        outputEl.replaceChildren();
        return;
    }
    const fragment = document.createDocumentFragment();
    lines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'terminal__line' + (line.cls ? ' ' + line.cls : '');
        div.innerHTML = line.html || line.text || '';
        fragment.appendChild(div);
    });
    outputEl.appendChild(fragment);
    bodyEl.scrollTop = bodyEl.scrollHeight;
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
    const names = {
        'trading-intelligence-mcp': 'Trading Intelligence MCP',
        'lore-agent-marketplace': 'Lore Agent Marketplace',
        'EmailCampaignPro': 'Email Campaign Pro',
        'easysend': 'EasySend',
        'billmi': 'billmi',
        'hedgemaker': 'HedgeMaker',
        'walletscan': 'WalletScan',
    };
    if (names[name]) return names[name];
    return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_+]+/g, ' ')
        .replace(/\b[a-z0-9]+\b/gi, word => {
            const acronyms = ['ai', 'api', 'mcp', 'sdk', 'nft', 'llm', 'vfx', 'ms', 'html', 'git'];
            return acronyms.includes(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);
        });
}

function observeReveals(root) {
    const elements = root.querySelectorAll('.reveal:not(.visible)');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        elements.forEach(el => el.classList.add('visible'));
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('is-pending');
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0 });
    elements.forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
            el.classList.add('visible');
        } else {
            el.classList.add('is-pending');
            observer.observe(el);
        }
    });
}

// Curated visuals are local assets, so gallery images do not depend on third-party services.
const PROJECT_VISUALS = [
    { aliases: ['ticketer'], repo: 'ticketer', name: 'Ticketer', key: 'ticketer', image: 'ticketer.webp', demo: 'https://ticketer.dsforge.co', label: 'Event experiences', mark: 'T' },
    { aliases: ['emailcampaignpro', 'emailcampaign'], repo: 'EmailCampaignPro', name: 'Email Campaign Pro', key: 'emailcampaign', image: 'emailcampaign.webp', demo: 'https://emailcampaign.dsforge.co', label: 'Campaign → Worker → SMTP', mark: '✉' },
    { aliases: ['walletscan'], repo: 'walletscan', name: 'WalletScan', key: 'walletscan', image: 'walletscan.webp', demo: 'https://walletscan.dsforge.co', label: 'Wallet intelligence', mark: 'W' },
    { aliases: ['versuswords'], repo: 'Versus-Words', name: 'Versus Words', key: 'versuswords', image: 'versuswords-trace.webp', demo: 'https://versuswords.dsforge.co', label: 'Multiplayer word game' },
    { aliases: ['hedgemaker'], repo: 'hedgemaker', name: 'HedgeMaker', key: 'hedgemaker', image: 'hedgemaker.webp', demo: 'https://hedgemaker.dsforge.co', label: 'USD / NGN · Monad testnet', mark: 'H' },
    { aliases: ['lore', 'loreagentmarketplace'], repo: 'lore-agent-marketplace', name: 'Lore', key: 'lore', image: 'lore.webp', demo: 'https://lore.dsforge.co', label: 'AI agent marketplace', mark: '◆' },
    { aliases: ['tradingintelligence', 'tradingintelligencemcp'], repo: 'trading-intelligence-mcp', name: 'Trading Intelligence MCP', key: 'trading', image: 'trading-intelligence.svg', label: 'MCP · market intelligence' },
    { aliases: ['guides'], repo: 'Guides', name: 'Field Notes & Guides', key: 'guides', image: 'guides.svg', label: 'Build. Deploy. Document.' },
    { aliases: ['billmi'], name: 'billmi', key: 'billmi', image: 'billmi.svg', label: 'In development' },
    { aliases: ['kruis'], name: 'Kruis', key: 'kruis', image: 'kruis.svg', label: 'In development' },
];

const PUBLIC_DEMOS = [{
    name: 'walletscan', private: true, html_url: null, homepage: 'https://walletscan.dsforge.co',
    description: 'Wallet intelligence for finding repeat early winners. Scan token contracts, compare early entries, and save recurring wallets.',
    topics: ['wallet-intelligence'], stargazers_count: 0,
}];

function getProjectVisual(name) {
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return PROJECT_VISUALS.find(visual => visual.aliases.includes(key));
}

function withPortfolioDemos(repos) {
    const all = [...repos, ...PUBLIC_DEMOS.filter(demo => !repos.some(repo => repo.name.toLowerCase() === demo.name))];
    return all.map(repo => ({ ...repo, homepage: getProjectVisual(repo.name)?.demo || repo.homepage, description: repo.description || (repo.name.toLowerCase() === 'hedgemaker' ? 'A USD/NGN hedging prototype on Monad testnet. Explore market views, maturity dates, and buyer/seller workflows.' : repo.description) }));
}

function projectSourceLink(repo, className) {
    return repo.html_url
        ? `<a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="${className}">GitHub ↗</a>`
        : `<span class="${className} project-source--private">Private source</span>`;
}

function projectCover(name) {
    const visual = getProjectVisual(name);
    if (!visual) {
        return `<a class="project-cover project-cover--blueprint" href="/labs?project=${encodeURIComponent(name)}" aria-label="Explore ${escapeHtml(formatName(name))}"><div class="project-cover__blueprint" aria-hidden="true"><svg viewBox="0 0 320 160" fill="none"><g stroke="#ff713f" stroke-opacity=".3"><circle cx="160" cy="80" r="58"/><circle cx="160" cy="80" r="76"/><path d="M0 80h102M218 80h102M160 0v22M160 138v22"/></g><path d="M140 60l-20 20 20 20M180 60l20 20-20 20M168 51l-16 58" stroke="#ff713f" stroke-width="2"/></svg></div><span class="project-cover__label">Code &amp; systems</span></a>`;
    }
    const content = visual.key === 'versuswords'
        ? `<div class="project-cover__tiles"><img src="assets/projects/versuswords-trace.webp" alt="Versus Words Trace game artwork" width="525" height="700" loading="lazy" decoding="async"><img src="assets/projects/versuswords-anagrams.webp" alt="Versus Words Anagrams game artwork" width="525" height="700" loading="lazy" decoding="async"></div>`
        : `<div class="project-cover__window${visual.image.endsWith('.svg') ? ' project-cover__window--diagram' : ''}">${visual.image.endsWith('.svg') ? '' : `<div class="project-cover__chrome" aria-hidden="true"><i></i><i></i><i></i><span>${new URL(visual.demo).hostname}</span></div>`}<img src="assets/projects/${visual.image}" alt="${escapeHtml(visual.name)} ${visual.image.endsWith('.svg') ? 'concept diagram' : 'public demo screenshot'}" width="1200" height="750" loading="lazy" decoding="async"></div>`;
    const inner = `${content}<span class="project-cover__label">${escapeHtml(visual.label)}</span>`;
    return visual.repo
        ? `<a class="project-cover project-cover--${visual.key}" href="/labs?project=${encodeURIComponent(visual.repo)}" aria-label="Explore ${escapeHtml(visual.name)}">${inner}</a>`
        : `<div class="project-cover project-cover--${visual.key}">${inner}</div>`;
}

// Small product marks add identity without inventing screenshots or metrics.
function projectMark(name, className = 'project-mark') {
    const visual = getProjectVisual(name);
    if (visual?.key === 'versuswords') {
        return `<span class="${className} project-mark--image" aria-hidden="true"><img src="assets/projects/versuswords-logo.webp" alt="" width="48" height="48" loading="lazy"></span>`;
    }
    if (visual?.mark) return `<span class="${className} project-mark--${visual.key}" aria-hidden="true">${visual.mark}</span>`;
    const paths = [
        '<path d="M4 18l6-7 5 3 7-9M17 5h5v5"/>',
        '<rect x="5" y="5" width="16" height="16" rx="5"/><path d="M9 11h.01M17 11h.01M10 16h6M13 2v3"/>',
        '<rect x="3" y="5" width="20" height="16" rx="3"/><path d="M3 7l10 7 10-7"/>',
        '<path d="M4 7a3 3 0 013-3h12a3 3 0 013 3v3a3 3 0 000 6v3a3 3 0 01-3 3H7a3 3 0 01-3-3v-3a3 3 0 000-6zM16 7v2M16 12v2M16 17v2"/>',
        '<path d="M8 3h10l3 3v17l-4-2-4 2-4-2-4 2V6zM9 10h8M9 14h8M9 18h4"/>',
        '<path d="M4 20h18M7 20V9l6-5 6 5v11M11 20v-6h4v6"/>',
        '<path d="M9 7l-6 6 6 6M17 7l6 6-6 6M15 4l-4 18"/>',
    ];
    const lower = name.toLowerCase();
    const index = lower.includes('trading') ? 0 : lower.includes('lore') ? 1 : lower.includes('email') ? 2 : lower.includes('ticket') ? 3 : lower.includes('bill') ? 4 : lower.includes('kruis') ? 5 : 6;
    return `<span class="${className}" aria-hidden="true"><svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths[index]}</svg></span>`;
}

function initProductMarks() {
    document.querySelectorAll('.product-card').forEach(card => {
        const name = card.querySelector('.product-name').textContent;
        card.insertAdjacentHTML('afterbegin', projectCover(name) + projectMark(name));
    });
}

function initLiveDemoGrid() {
    const grid = document.getElementById('live-demo-grid');
    if (!grid) return;
    grid.innerHTML = ['walletscan', 'Versus-Words', 'hedgemaker'].map(name => {
        const visual = getProjectVisual(name);
        return `<article class="demo-card">${projectCover(name)}<div class="demo-card__info"><h3><a href="/labs?project=${encodeURIComponent(visual.repo)}">${escapeHtml(visual.name)}</a></h3><a href="${visual.demo}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(visual.name)} demo">Live Demo ↗</a></div></article>`;
    }).join('');
}

function guideCover(folderName) {
    const desktop = folderName.toLowerCase().includes('desktop');
    return `<div class="guide-cover"><img src="assets/projects/${desktop ? 'guide-desktop.svg' : 'guide-cloud.svg'}" alt="${desktop ? 'Linux server connected to a browser through VNC' : 'Cloud GPU connected to a local AI coding agent'}" width="1200" height="750" loading="lazy" decoding="async"></div>`;
}

function visibleTopics(topics) {
    return (topics || []).filter(t => !t.startsWith('ds-'));
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
        const repos = withPortfolioDemos(await fetchGitHubRepos());

        const featured = repos.filter(r => r.topics && r.topics.includes(FEATURED_TOPIC));
        const regular = repos.filter(r => {
            const topics = r.topics || [];
            return !topics.includes(FEATURED_TOPIC) && !topics.includes(UNLISTED_TOPIC);
        }).sort((a, b) => Number(Boolean(getProjectVisual(b.name))) - Number(Boolean(getProjectVisual(a.name))));

        // Hide featured section if no featured repos
        if (featuredSection) {
            featuredSection.style.display = featured.length ? '' : 'none';
        }

        buildCarousel(track, dots, featured);
        buildProjectGrid(grid, regular);

        // Keep cached project data fresh in the background.
        onReposChanged(repos => {
            const fresh = withPortfolioDemos(repos);
            const feat = fresh.filter(r => r.topics && r.topics.includes(FEATURED_TOPIC));
            const reg = fresh.filter(r => {
                const t = r.topics || [];
                return !t.includes(FEATURED_TOPIC) && !t.includes(UNLISTED_TOPIC);
            }).sort((a, b) => Number(Boolean(getProjectVisual(b.name))) - Number(Boolean(getProjectVisual(a.name))));
            if (featuredSection) featuredSection.style.display = feat.length ? '' : 'none';
            buildCarousel(track, dots, feat);
            buildProjectGrid(grid, reg);
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        });
        backgroundRefreshRepos();

        observeReveals(gallery);
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

function projectStars(repo) {
    const count = Number(repo.stargazers_count) || 0;
    return count > 0
        ? `<span class="project-card__stars" aria-label="${count} GitHub ${count === 1 ? 'star' : 'stars'}"><span aria-hidden="true">★</span> ${count}</span>`
        : '<span class="project-card__stars"></span>';
}

let carouselIndex = 0;
let carouselSlides = 0;
let carouselResizeObserver;

function buildCarousel(track, dots, repos) {
    carouselResizeObserver?.disconnect();
    carouselSlides = repos.length;
    carouselIndex = 0;
    const wrapper = track.parentElement;
    wrapper.scrollLeft = 0;
    track.innerHTML = repos.map(repo => {
        const topics = visibleTopics(repo.topics).slice(0, 4);
        const name = formatName(repo.name);
        return `
            <article class="carousel__slide">
                ${projectCover(repo.name)}
                <div class="carousel__slide-top">
                    ${projectMark(repo.name)}
                    ${repo.language ? `<span class="carousel__slide-lang">${escapeHtml(repo.language)}</span>` : ''}
                </div>
                <h3 class="carousel__slide-name"><a href="/labs?project=${encodeURIComponent(repo.name)}">${escapeHtml(name)}</a></h3>
                <p class="carousel__slide-desc">${escapeHtml(repo.description || 'Explore the source, documentation, and project details.')}</p>
                ${topics.length ? `<div class="carousel__slide-stack">${topics.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                <div class="carousel__slide-footer">
                    <a href="/labs?project=${encodeURIComponent(repo.name)}" class="carousel__slide-link">Explore Project</a>
                    ${projectStars(repo)}
                    ${projectSourceLink(repo, 'carousel__source-link')}
                </div>
            </article>`;
    }).join('');

    dots.innerHTML = repos.map((repo, i) =>
        `<button type="button" class="carousel__dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Show ${escapeHtml(formatName(repo.name))}" aria-current="${i === 0 ? 'true' : 'false'}"></button>`
    ).join('');
    dots.querySelectorAll('button').forEach(dot => {
        dot.addEventListener('click', () => goToSlide(Number(dot.dataset.index)));
    });
    const prev = document.getElementById('carousel-prev');
    const next = document.getElementById('carousel-next');
    if (prev) prev.onclick = () => goToSlide(carouselIndex - 1);
    if (next) next.onclick = () => goToSlide(carouselIndex + 1);
    wrapper.onscroll = () => updateCarouselState();
    wrapper.onkeydown = event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            goToSlide(carouselIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
    };
    if ('ResizeObserver' in window) {
        carouselResizeObserver = new ResizeObserver(() => updateCarouselState());
        carouselResizeObserver.observe(wrapper);
    }
    updateCarouselState();
}

function updateCarouselState() {
    const track = document.getElementById('carousel-track');
    const wrapper = track.parentElement;
    const slides = Array.from(track.children);
    const first = slides[0];
    if (!first) return;
    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
    let closestDistance = Infinity;
    slides.forEach((slide, index) => {
        const distance = Math.abs(wrapper.scrollLeft - (slide.offsetLeft - first.offsetLeft));
        if (distance < closestDistance) {
            closestDistance = distance;
            carouselIndex = index;
        }
    });
    document.querySelectorAll('.carousel__dot').forEach((dot, i) => {
        dot.hidden = slides[i].offsetLeft - first.offsetLeft > maxScroll + 2;
        dot.classList.toggle('active', i === carouselIndex);
        dot.setAttribute('aria-current', String(i === carouselIndex));
    });
    document.getElementById('carousel-prev').disabled = wrapper.scrollLeft <= 2;
    document.getElementById('carousel-next').disabled = wrapper.scrollLeft >= maxScroll - 2;
}

function goToSlide(index) {
    const track = document.getElementById('carousel-track');
    const slide = track.children[Math.max(0, Math.min(index, carouselSlides - 1))];
    if (!slide) return;
    track.parentElement.scrollTo({
        left: slide.offsetLeft - track.firstElementChild.offsetLeft,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
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
        const name = formatName(repo.name);

        return `
            <article class="project-card reveal">
                ${projectCover(repo.name)}
                ${projectMark(repo.name)}
                <div class="project-card__top">
                    <h3 class="project-card__name"><a href="/labs?project=${encodeURIComponent(repo.name)}">${escapeHtml(name)}</a></h3>
                    ${repo.language ? `<span class="project-card__lang">${escapeHtml(repo.language)}</span>` : ''}
                </div>
                <p class="project-card__desc">${escapeHtml(repo.description || 'Explore the source, documentation, and project details.')}</p>
                ${stackHtml ? `<div class="project-card__stack">${stackHtml}</div>` : ''}
                ${repo.homepage ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener" class="project-card__demo">Live Demo ↗</a>` : ''}
                <div class="project-card__stats">
                    <a href="/labs?project=${encodeURIComponent(repo.name)}" class="project-card__link">Explore Project</a>
                    ${projectStars(repo)}
                    ${projectSourceLink(repo, 'project-card__source')}
                </div>
            </article>
        `;
    }).join('');

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

    if (navLabel) navLabel.textContent = formatName(repoName);
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
        let repo = PUBLIC_DEMOS.find(demo => demo.name === repoName);
        if (!repo) {
            const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}`);
            if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
            repo = await res.json();
        }
        repo = { ...repo, homepage: getProjectVisual(repoName)?.demo || repo.homepage };

        // Basic info
        document.title = `${formatName(repo.name)} — Digital Sheikh Labs`;

        if (header) {
            header.innerHTML = `
                <h1 class="detail__title">${escapeHtml(formatName(repo.name))}</h1>
                <p class="detail__description">${escapeHtml(repo.description || 'No description provided.')}</p>
                <div class="detail__meta">
                    ${repo.language ? `<span>${escapeHtml(repo.language)}</span>` : ''}
                    ${repo.private ? '<span>Public demo · Private source</span>' : `<span>★ ${repo.stargazers_count || 0}</span><span>${repo.forks_count || 0} forks</span><span>Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>`}
                </div>
            `;
        }

        // Screenshots
        if (screenshots) {
            await loadScreenshots(screenshots, repoName);
        }

        // Tech stack
        const topics = visibleTopics(repo.topics);
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
            if (repo.html_url) buttonsHtml += `<a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="btn btn--outline">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View Source
            </a>`;
            actions.innerHTML = buttonsHtml;
        }

        // README
        if (readme && repo.private) {
            readme.innerHTML = '<h2>Wallet intelligence</h2><p>Scan a token contract, review early wallet entries, and keep a collection of wallets that recur across tokens. Explore the public scanner using the live demo above.</p>';
        } else if (readme) {
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



    } catch (err) {
        if (header) header.innerHTML = `<div class="labs-skeleton"><p>Failed to load project. ${err.message}</p></div>`;
    }
}

async function loadScreenshots(container, repoName) {
    const visual = getProjectVisual(repoName);
    if (visual) {
        const images = visual.key === 'versuswords' ? ['versuswords-trace.webp', 'versuswords-anagrams.webp'] : [visual.image];
        container.innerHTML = images.map(image => `<div class="screenshot-gallery__item"><img src="assets/projects/${image}" alt="${escapeHtml(visual.name)} project preview" width="1200" height="750" loading="lazy" decoding="async"></div>`).join('');
        return;
    }
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

    // Protect fenced code from later heading/list/emphasis replacements.
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.trim())}</code></pre>`);
        return `DSCODEBLOCK${index}END`;
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
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

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

    html = html.replace(/DSCODEBLOCK(\d+)END/g, (_, index) => codeBlocks[Number(index)]);
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
