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

    // Hide hero elements below the headline until typewriter finishes
    [heroSubtitle, heroBody, heroCta].forEach((el) => {
        if (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        }
    });

    const text = 'Digital Sheikh.';
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

// ──────────── Terminal Logic ────────────
function initTerminal() {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const body = document.getElementById('terminal-body');

    if (!input || !output) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value.trim().toLowerCase();
            if (!cmd) return;

            // Echo the command
            appendLine(`<span class="prompt-prefix">sheikh@labs:~$</span> ${escapeHtml(input.value.trim())}`, 'terminal__line--prompt');
            input.value = '';

            // Process
            const response = processCommand(cmd);
            typewriterOutput(response, output, body);
        }
    });

    // Focus terminal on click
    body.addEventListener('click', () => input.focus());
}

function processCommand(cmd) {
    switch (cmd) {
        case 'ls':
            return lsOutput();
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

function lsOutput() {
    const projects = [
        { name: 'trading-intel-mcp', stack: 'Python · MCP', desc: 'Tier S grant · 19 tools · Real-time markets, DCF valuation, technical analysis' },
        { name: 'meteora-damm-v2-pool-viewer', stack: 'HTML · Solana', desc: 'Explore Meteora DAMM-V2 liquidity pools on-chain' },
        { name: 'solana-tracker-api', stack: 'Python', desc: 'Token and wallet analytics via Solana Tracker APIs' },
        { name: 'nft-contracts', stack: 'Solidity', desc: 'Open-source NFT smart contracts (Buildship fork)' },
        { name: 'ms-email-sort', stack: 'HTML · JS', desc: 'Email analyzer for Microsoft-hosted domains' },
        { name: 'dsautomation', stack: 'n8n · CSS', desc: 'Automation hub — workflow orchestration at automation.digitalsheikh.com' },
        { name: 'supermart-system', stack: 'Python', desc: 'Supermarket management with admin auth and pricing logic' },
        { name: 'planet-growth', stack: 'PHP', desc: 'Web app growth system' },
        { name: 'firstride', stack: 'Infra', desc: 'IT infrastructure for Ocean Wealth Transport & Logistics e-hailing platform' },
    ];

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
