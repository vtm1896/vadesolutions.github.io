// ── 30-day uptime engine (status strips + product cards) ──
window.VadeUptime = (function () {
    var DATA = {
        'rust-internal': { uptime: '99.8%', lastDowntime: 'Oct 3 · 2h 10m', down: { 11: '2h 10m downtime' }, warn: {} },
        'rust-external': { uptime: '96.4%', lastDowntime: 'Oct 20 · 5h 40m', down: { 12: '1h 15m downtime', 28: '5h 40m downtime' }, warn: {} },
        'roblox-exec':   { uptime: '99.9%', lastDowntime: 'Oct 1 · 1h 05m',  down: { 9: '1h 05m downtime' }, warn: {} },
        'roblox-ext':    { uptime: '100%',  lastDowntime: 'No downtime in past 30 days', down: {}, warn: {} }
    };

    var STATUS_TEXT = { online: 'All systems operational', offline: 'Currently unavailable', updating: 'Update in progress' };
    var STATUS_LABEL = { online: 'Operational', offline: 'Offline', updating: 'Updating' };

    function dayDate(i) {
        var d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d;
    }

    function fmtDay(d) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    function fmtStamp(d) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function html(slug, status, variant) {
        var info = DATA[slug] || { uptime: '—', lastDowntime: '—', down: {}, warn: {} };
        status = status || 'online';
        var full = variant === 'full';

        var bars = '';
        for (var i = 0; i < 30; i++) {
            var cls = 'u-up';
            var tipStatus = 'All systems operational';
            if (i === 29) {
                cls = status === 'offline' ? 'u-down' : status === 'updating' ? 'u-warn' : 'u-up';
                tipStatus = STATUS_TEXT[status] || STATUS_TEXT.online;
            } else if (info.down[i]) {
                cls = 'u-down';
                tipStatus = info.down[i];
            } else if (info.warn[i]) {
                cls = 'u-warn';
                tipStatus = 'Degraded performance';
            }
            bars += '<i class="' + cls + '" data-tip="' + fmtDay(dayDate(i)) + '\n' + tipStatus + '"></i>';
        }

        var isDown = status === 'offline';
        var last = isDown ? 'Ongoing downtime' : info.lastDowntime;
        var now = new Date();

        var head =
            '<div class="uptime-head">' +
                '<span class="uptime-head-label">' +
                    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
                    'Product status' +
                '</span>' +
                '<span class="status-pill ' + status + '"><span class="pill-dot"></span> ' + (STATUS_LABEL[status] || status) + '</span>' +
            '</div>';

        var barsEl = '<div class="uptime-bars">' + bars + '</div>';

        var foot =
            '<div class="uptime-foot">' +
                '<span>Past 30 days · <span class="uptime-pct">' + info.uptime + ' uptime</span></span>' +
                '<span class="uptime-updated">Updated ' + fmtStamp(now) + '</span>' +
            '</div>';

        var body = full
            ? '<div class="uptime-body">' + (STATUS_TEXT[status] || STATUS_TEXT.online) +
              (isDown ? '' : ' · Last downtime: <strong>' + last + '</strong>') + '</div>'
            : '<div class="uptime-foot uptime-foot-sub">' +
                '<span class="uptime-last' + (isDown ? ' is-down' : '') + '">Last downtime: <strong>' + last + '</strong></span>' +
                '<span></span>' +
              '</div>';

        return head + barsEl + foot + body;
    }

    function hydrate() {
        document.querySelectorAll('[data-uptime]').forEach(function (el) {
            if (el.getAttribute('data-hydrated')) return;
            el.setAttribute('data-hydrated', '1');
            var slug = el.getAttribute('data-uptime');
            var variant = el.getAttribute('data-uptime-variant') || 'full';
            var status = el.getAttribute('data-uptime-status') || 'online';
            el.innerHTML = html(slug, status, variant);

            var sb = window.supabaseClient;
            if (sb) {
                sb.from('products').select('status').eq('slug', slug).single().then(function (res) {
                    var st = res && res.data && res.data.status;
                    if (st) el.innerHTML = html(slug, st, variant);
                });
            }
        });
    }

    return { html: html, hydrate: hydrate, data: DATA, statusLabel: STATUS_LABEL };
})();

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

    // ── Hydrate 30-day uptime cards ──
    if (window.VadeUptime) window.VadeUptime.hydrate();

    // ── Mobile Nav: burger left of logo + left off-canvas panel ──
    const navbar = document.querySelector('.navbar');
    const navContainer = document.querySelector('.nav-container');
    if (navbar && navContainer) {
        const links = navContainer.querySelector('.nav-links');
        const actions = navContainer.querySelector('.nav-actions');

        const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

        const drawer = document.createElement('div');
        drawer.className = 'nav-drawer';
        if (links) drawer.appendChild(links);
        if (actions) drawer.appendChild(actions);
        navContainer.appendChild(drawer);

        const panel = document.createElement('aside');
        panel.className = 'nav-panel';
        panel.setAttribute('aria-label', 'Menu');
        panel.appendChild(drawer);

        const overlay = document.createElement('div');
        overlay.className = 'nav-overlay';

        const burger = document.createElement('button');
        burger.className = 'nav-burger';
        burger.setAttribute('aria-label', 'Open menu');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
        navContainer.insertBefore(burger, navContainer.firstChild);
        document.body.appendChild(panel);
        document.body.appendChild(overlay);

        const setOpen = (open) => {
            panel.classList.toggle('open', open);
            overlay.classList.toggle('open', open);
            navbar.classList.toggle('nav-open', open);
            burger.setAttribute('aria-expanded', open);
            document.body.style.overflow = open ? 'hidden' : '';
        };

        const place = () => {
            if (isMobile()) {
                panel.appendChild(drawer);
            } else {
                navContainer.appendChild(drawer);
                setOpen(false);
            }
        };
        place();
        window.matchMedia('(max-width: 900px)').addEventListener('change', place);

        burger.addEventListener('click', (e) => {
            e.stopPropagation();
            setOpen(!panel.classList.contains('open'));
        });

        overlay.addEventListener('click', () => setOpen(false));

        drawer.querySelectorAll('.dropdown > a').forEach(a => {
            a.addEventListener('click', (e) => {
                if (isMobile()) {
                    e.preventDefault();
                    a.parentElement.classList.toggle('open');
                }
            });
        });

        drawer.querySelectorAll('a').forEach(a => {
            if (a.parentElement && a.parentElement.classList.contains('dropdown')) return;
            a.addEventListener('click', () => setOpen(false));
        });

        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target) && !panel.contains(e.target)) setOpen(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setOpen(false);
        });
    }

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
        sb.auth.getSession().then(async function (result) {
            var session = result.data.session;
            var loginBtn = document.getElementById('discord-login-btn');
            if (!loginBtn) return;

            if (session) {
                var user = session.user;

                // Fetch profile from Supabase for Discord info + role
                var { data: profile, error: profileErr } = await sb
                    .from('profiles')
                    .select('username, discord_id, avatar, role')
                    .eq('id', user.id)
                    .maybeSingle();
                if (profileErr) {
                    // role column not added yet — retry without it
                    var retry = await sb
                        .from('profiles')
                        .select('username, discord_id, avatar')
                        .eq('id', user.id)
                        .maybeSingle();
                    profile = retry.data || null;
                }

                var displayName = (profile && profile.username) || user.user_metadata.username || user.email;
                var userRole = (profile && profile.role) || 'customer';
                var roleLabel = (window.VadeRoles && window.VadeRoles.LABELS[userRole]) || 'Customer';
                var isStaff = window.VadeRoles ? window.VadeRoles.atLeast(userRole, 'staff') : false;
                var avatarUrl = null;
                if (profile && profile.discord_id && profile.avatar) {
                    var ext = profile.avatar.startsWith('a_') ? 'gif' : 'png';
                    avatarUrl = 'https://cdn.discordapp.com/avatars/' + profile.discord_id + '/' + profile.avatar + '.' + ext + '?size=64';
                }

                var avatarHtml = avatarUrl
                    ? '<img src="' + avatarUrl + '" alt="' + displayName + '" />'
                    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

                var avatarHtmlLarge = avatarUrl
                    ? '<img src="' + avatarUrl + '" alt="' + displayName + '" />'
                    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

                var adminItemHtml = isStaff ? `
                        <a href="admin.html" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Admin Panel
                        </a>` : '';

                var wrapper = document.createElement('div');
                wrapper.className = 'user-dropdown';
                wrapper.id = 'user-dropdown';

                wrapper.innerHTML = `
                    <button class="user-dropdown-trigger" aria-expanded="false" aria-haspopup="true">
                        <div class="user-avatar">
                            ${avatarHtml}
                        </div>
                        <span class="user-display-name">${displayName}</span>
                        <svg class="user-dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="user-dropdown-menu" role="menu">
                        <div class="user-dropdown-header">
                            <div class="user-dropdown-avatar">
                                ${avatarHtmlLarge}
                            </div>
                            <div class="user-dropdown-header-text">
                                <span class="user-dropdown-name">${displayName}</span>
                                <span class="user-role-badge role-${userRole}">${roleLabel}</span>
                            </div>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <a href="dashboard.html" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Dashboard
                        </a>
                        <a href="dashboard.html#subscriptions" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                            Subscriptions
                        </a>
                        <a href="dashboard.html#loader" class="user-dropdown-item" role="menuitem">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download
                        </a>
                        ${adminItemHtml}
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
