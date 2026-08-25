document.addEventListener('DOMContentLoaded', () => {
    // ── Scroll Animations ──
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // ── Smooth Scrolling for Anchor Links ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ── Search System ──
    const SEARCH_INDEX = [
        { name: 'Rust Internal',   tags: ['rust', 'internal', 'aimbot', 'esp', 'cheat'],      url: 'rust-internal.html' },
        { name: 'Rust External',   tags: ['rust', 'external', 'overlay', 'streamproof'],       url: 'rust-external.html' },
        { name: 'Vade Executor',   tags: ['roblox', 'executor', 'script', 'byfron', 'level 8'], url: 'roblox-exec.html' },
        { name: 'Roblox External', tags: ['roblox', 'external', 'aimbot', 'esp', 'universal'],  url: 'roblox-ext.html' },
        { name: 'Products',        tags: ['products', 'catalog', 'buy'],                        url: 'products.html' },
        { name: 'Status',          tags: ['status', 'uptime', 'online', 'offline'],             url: 'status.html' },
        { name: 'Rate Us',         tags: ['rate', 'review', 'feedback'],                        url: 'rate.html' },
        { name: 'Terms of Service',tags: ['tos', 'terms', 'refund', 'policy'],                  url: 'tos.html' },
    ];

    // Build dropdown UI once
    const searchContainers = document.querySelectorAll('.search-container');
    searchContainers.forEach(container => {
        const input = container.querySelector('.search-input');
        if (!input) return;

        // Create results dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        container.appendChild(dropdown);

        let activeIndex = -1;

        function renderResults(query) {
            const q = query.trim().toLowerCase();
            dropdown.innerHTML = '';
            activeIndex = -1;

            if (!q) { dropdown.classList.remove('open'); return; }

            const matches = SEARCH_INDEX.filter(item =>
                item.name.toLowerCase().includes(q) ||
                item.tags.some(t => t.includes(q))
            );

            if (matches.length === 0) {
                dropdown.innerHTML = '<div class="search-no-results">No results found</div>';
                dropdown.classList.add('open');
                return;
            }

            matches.forEach((item, i) => {
                const el = document.createElement('a');
                el.className = 'search-result-item';
                el.href = item.url;
                el.innerHTML = `
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>${item.name}</span>
                `;
                dropdown.appendChild(el);
            });

            dropdown.classList.add('open');
        }

        input.addEventListener('input', () => renderResults(input.value));

        // Keyboard navigation
        input.addEventListener('keydown', e => {
            const items = dropdown.querySelectorAll('.search-result-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, -1);
                items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0 && items[activeIndex]) {
                    window.location.href = items[activeIndex].href;
                } else if (items.length === 1) {
                    window.location.href = items[0].href;
                }
            } else if (e.key === 'Escape') {
                dropdown.classList.remove('open');
                input.blur();
            }
        });

        // Close on outside click
        document.addEventListener('click', e => {
            if (!container.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    });

    // ── User Auth State — Sign In button → User dropdown when logged in ──
    var sb = window.supabaseClient;
    if (sb) {
        sb.auth.getSession().then(function (result) {
            var session = result.data.session;
            var loginBtn = document.getElementById('discord-login-btn');
            if (!loginBtn) return;

            if (session) {
                var user = session.user;
                var displayName = user.user_metadata.username || user.email;

                var wrapper = document.createElement('div');
                wrapper.className = 'user-dropdown';
                wrapper.id = 'user-dropdown';

                wrapper.innerHTML = `
                    <button class="user-dropdown-trigger" aria-expanded="false" aria-haspopup="true">
                        <div class="user-avatar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <span class="user-display-name">${displayName}</span>
                        <svg class="user-dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="user-dropdown-menu" role="menu">
                        <div class="user-dropdown-header">
                            <div class="user-dropdown-avatar">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <span class="user-dropdown-name">${displayName}</span>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <a href="dashboard.html" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Dashboard
                        </a>
                        <a href="#" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                            Subscriptions
                        </a>
                        <a href="#" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download
                        </a>
                        <div class="user-dropdown-divider"></div>
                        <a href="#" class="user-dropdown-item user-dropdown-logout" role="menuitem" id="nav-logout">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Logout
                        </a>
                    </div>
                `;

                loginBtn.parentNode.replaceChild(wrapper, loginBtn);

                var trigger = wrapper.querySelector('.user-dropdown-trigger');
                var menu = wrapper.querySelector('.user-dropdown-menu');

                trigger.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var isOpen = wrapper.classList.contains('open');
                    wrapper.classList.toggle('open', !isOpen);
                    trigger.setAttribute('aria-expanded', String(!isOpen));
                });

                document.addEventListener('click', function (e) {
                    if (!wrapper.contains(e.target)) {
                        wrapper.classList.remove('open');
                        trigger.setAttribute('aria-expanded', 'false');
                    }
                });

                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') {
                        wrapper.classList.remove('open');
                        trigger.setAttribute('aria-expanded', 'false');
                    }
                });

                wrapper.querySelector('#nav-logout').addEventListener('click', async function (e) {
                    e.preventDefault();
                    await sb.auth.signOut();
                    window.location.href = 'login.html';
                });
            }
        }).catch(function (err) {
            console.error('Error checking login status:', err);
        });
    }

    // ── Support Dropdown Toggle (click for mobile) ──
    const supportDropdown = document.querySelector('.dropdown');
    const supportBtn = document.querySelector('.btn-support');
    if (supportBtn && supportDropdown) {
        supportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            supportDropdown.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!supportDropdown.contains(e.target)) {
                supportDropdown.classList.remove('open');
            }
        });
    }

    // ── Discord Online Count ──
    // Note: I'm using the Server ID I saw in the screenshot. 
    // If it doesn't work, just replace it with the exact number you copied from your widget settings!
    const discordServerId = '1490213290113241169'; 
    fetch(`https://discord.com/api/guilds/${discordServerId}/widget.json`)
        .then(res => res.json())
        .then(data => {
            const onlineCount = document.getElementById('online-count');
            if (onlineCount && data.presence_count !== undefined) {
                onlineCount.textContent = `${data.presence_count} online`;
            }
        })
        .catch(err => console.error("Error fetching Discord widget data:", err));
});
