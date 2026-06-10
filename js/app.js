/* ═══════════════════════════════════════════════════════════
   EuclidOS Backend-Driven Device Management System
   Shared Application Module
   ═══════════════════════════════════════════════════════════ */

const EuclidApp = (() => {
    'use strict';

    const BASE = 'https://raw.githubusercontent.com/euclid-Devices/official_devices/refs/heads/16';
    const _cache = {};

    // ─── Global Lenis Singleton ───
    let _lenisInstance = null;
    function getLenis() {
        if (_lenisInstance) return _lenisInstance;
        if (typeof Lenis === 'undefined') return null;
        _lenisInstance = new Lenis({
            duration: 1.3,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.9,
            touchMultiplier: 1.5,
        });
        function raf(time) { _lenisInstance.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        return _lenisInstance;
    }

    // ─── Data Fetching with Cache ───
    async function fetchJSON(path) {
        if (_cache[path]) return _cache[path];
        try {
            const res = await fetch(`${BASE}/${path}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            _cache[path] = data;
            return data;
        } catch (e) {
            console.warn(`Failed to load ${path}:`, e);
            return null;
        }
    }

    async function fetchMarkdown(path) {
        if (_cache[path]) return _cache[path];
        try {
            const res = await fetch(`${BASE}/${path}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const text = await res.text();
            _cache[path] = text;
            return text;
        } catch (e) {
            return null;
        }
    }

    // ─── Device Data API ───
    async function getDevices() {
        const data = await fetchJSON('devices.json');
        return data ? data.devices : [];
    }

    async function getDevice(codename) {
        const devices = await getDevices();
        return devices.find(d => d.codename === codename) || null;
    }

    async function getDownloadInfo(codename) {
        return await fetchJSON(`download/${codename}.json`);
    }

    async function getChangelog(codename) {
        return await fetchMarkdown(`changelogs/${codename}.md`);
    }

    async function getInstructions(codename) {
        return await fetchMarkdown(`instructions/${codename}.md`);
    }

    // ─── Markdown Rendering ───
    function renderMarkdown(md) {
        if (!md) return '';
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false
            });
            return marked.parse(md);
        }
        return md.replace(/\n/g, '<br>');
    }

    // ─── Performance Utilities ───
    const Perf = (() => {
        let _low = null;
        let _obs = null;
        function isLowEnd() {
            if (_low !== null) return _low;
            let score = 0;
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) score += 2;
            if (navigator.deviceMemory && navigator.deviceMemory < 4) score += 2;
            if (navigator.connection) {
                const c = navigator.connection;
                if (c.saveData) score += 2;
                if (c.effectiveType === '2g' || c.effectiveType === 'slow-2g') score += 2;
                if (c.downlink < 2) score += 1;
            }
            const ua = navigator.userAgent;
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
                if (/Android.*(?:SM-|GT-|Redmi|POCO|Realme|Galaxy A)/i.test(ua)) score += 1;
            }
            _low = score >= 3;
            return _low;
        }
        function init() {
            if (isLowEnd()) document.documentElement.classList.add('perf-low');
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('perf-reduced');
            if (isLowEnd()) {
                document.querySelectorAll('.aura-blob').forEach(b => {
                    b.style.filter = 'blur(65px)';
                });
                const noise = document.getElementById('noise-overlay');
                if (noise) noise.style.display = 'none';
            }
            _setupTabVisibility();
            _setupViewportObserver();
        }
        function _setupTabVisibility() {
            document.addEventListener('visibilitychange', () => {
                const hidden = document.hidden;
                const bg = document.getElementById('aura-bg');
                if (bg) {
                    if (hidden) { bg.style.animationPlayState = 'paused'; } else { bg.style.animationPlayState = 'running'; }
                }
                const marquee = document.querySelector('.marquee-track');
                if (marquee) {
                    if (hidden) { marquee.style.animationPlayState = 'paused'; } else { marquee.style.animationPlayState = 'running'; }
                }
                const particles = document.querySelectorAll('.contrib-particle');
                particles.forEach(p => {
                    if (hidden) { p.style.animationPlayState = 'paused'; } else { p.style.animationPlayState = 'running'; }
                });
                const floatCards = document.querySelectorAll('.contributor-card');
                floatCards.forEach(c => {
                    if (hidden) { c.style.animationPlayState = 'paused'; } else { c.style.animationPlayState = 'running'; }
                });
                const heroImgs = document.querySelectorAll('.device-hero-img');
                heroImgs.forEach(img => {
                    if (hidden) { img.style.animationPlayState = 'paused'; } else { img.style.animationPlayState = 'running'; }
                });
                const pulseDots = document.querySelectorAll('.status-dot.active');
                pulseDots.forEach(d => {
                    if (hidden) { d.style.animationPlayState = 'paused'; } else { d.style.animationPlayState = 'running'; }
                });
            });
        }
        function _setupViewportObserver() {
            if (_obs) return;
            _obs = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    const inView = e.isIntersecting;
                    e.target.classList.toggle('in-viewport', inView);
                    e.target.classList.toggle('out-viewport', !inView);
                });
            }, { rootMargin: '200px', threshold: 0 });
            const targets = document.querySelectorAll('[data-animate], .contributor-card, .contrib-particle, .aura-blob, .marquee-track, .lineup-card');
            targets.forEach(el => {
                if (el) _obs.observe(el);
            });
        }
        function viewportObserver(selector, opts) {
            const obs = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    e.target.classList.toggle('in-viewport', e.isIntersecting);
                });
            }, { rootMargin: (opts && opts.margin) || '100px', threshold: 0 });
            document.querySelectorAll(selector || '[data-animate]').forEach(el => obs.observe(el));
            return obs;
        }
        function pauseAura() {
            const bg = document.getElementById('aura-bg');
            if (bg) bg.style.animationPlayState = 'paused';
        }
        function resumeAura() {
            const bg = document.getElementById('aura-bg');
            if (bg) bg.style.animationPlayState = 'running';
        }
        return { isLowEnd, init, viewportObserver, pauseAura, resumeAura };
    })();

    // ─── Shared HTML Fragments ───
    function getNavLinkClass(page) {
        return 'nav-link';
    }

    function getActiveClass(currentPage, page) {
        return currentPage === page ? '!text-white !bg-white/[0.08]' : '';
    }

    function buildNavbar(currentPage) {
        return `
    <nav id="navbar" class="fixed top-0 left-0 w-full z-[100]">
        <div class="absolute inset-0 glass transition-opacity duration-500" id="nav-glass" style="opacity: 0;"></div>
        <div class="relative max-w-7xl mx-auto px-5 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <a href="index.html" class="flex items-center gap-2.5 group">
                <div class="relative w-9 h-9 md:w-10 md:h-10 flex-shrink-0">
                    <img src="assets/screenshots/logo.jpeg" alt="EuclidOS Logo" class="w-full h-full rounded-lg border border-white/10 group-hover:border-euclid/40 transition duration-300">
                    <div class="absolute inset-0 rounded-lg bg-euclid/20 blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
                </div>
                <span class="text-lg md:text-xl font-display font-bold text-white tracking-tight">EUCLID<span class="text-euclid">OS</span></span>
            </a>
            <div class="hidden md:flex items-center gap-1 bg-white/[0.04] backdrop-blur-xl rounded-full px-1.5 py-1 border border-white/[0.06]">
                <a href="index.html" class="nav-link ${getActiveClass(currentPage, 'home')}">Home</a>
                <a href="devices.html" class="nav-link ${getActiveClass(currentPage, 'devices')}">Devices</a>
                <a href="screenshots.html" class="nav-link ${getActiveClass(currentPage, 'screenshots')}">Screenshots</a>
            </div>
            <div class="hidden md:flex items-center gap-3">
                <a href="devices.html" class="px-5 py-2.5 bg-euclid text-white text-sm font-semibold rounded-full hover:bg-euclid/90 transition-all duration-300 shadow-lg shadow-euclid/20 hover:shadow-euclid/40 hover:-translate-y-0.5">Get EuclidOS</a>
            </div>
            <button id="menu-btn" class="ham-btn md:hidden z-[101]" aria-label="Toggle menu">
                <span class="ham-glow"></span>
                <span class="ham-line"></span>
                <span class="ham-line"></span>
                <span class="ham-line"></span>
            </button>
        </div>
    </nav>`;
    }

    function buildMobileMenu(currentPage) {
        return `
    <div id="mobile-menu" class="mobile-menu-overlay" style="z-index: 99;">
        <div class="menu-backdrop" id="menu-backdrop"></div>
        <div class="menu-ambient" style="width: 300px; height: 300px; background: rgba(77,120,255,0.15); top: 10%; left: -10%;"></div>
        <div class="menu-ambient" style="width: 250px; height: 250px; background: rgba(0,240,255,0.08); bottom: 15%; right: -5%;"></div>
        <div class="menu-panel">
            <nav class="flex flex-col items-center text-center mb-12">
                <a href="index.html" class="menu-nav-item" data-index="0"><span class="item-index">01</span>Home<span class="item-arrow">&rarr;</span></a>
                <a href="devices.html" class="menu-nav-item" data-index="1"><span class="item-index">02</span>Devices<span class="item-arrow">&rarr;</span></a>
                <a href="screenshots.html" class="menu-nav-item" data-index="2"><span class="item-index">03</span>Screenshots<span class="item-arrow">&rarr;</span></a>
            </nav>
            <a href="devices.html" class="menu-cta-btn">Get EuclidOS</a>
        </div>
    </div>`;
    }

    function buildFooter() {
        return `
    <footer class="relative py-16 md:py-20 px-6 border-t border-white/[0.04]">
        <div class="max-w-7xl mx-auto">
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
                <div class="sm:col-span-2 lg:col-span-2">
                    <div class="flex items-center gap-2.5 mb-5">
                        <img src="assets/screenshots/logo.jpeg" alt="Logo" class="w-9 h-9 rounded-lg border border-white/10">
                        <span class="text-lg font-display font-bold text-white">EUCLID<span class="text-euclid">OS</span></span>
                    </div>
                    <p class="text-sm text-euclid-muted max-w-sm leading-relaxed mb-5">Geometry in Motion. A refined AOSP-based operating system built for precision and performance.</p>
                    <div class="flex gap-3">
                        <a href="#" class="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5" aria-label="Telegram"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a>
                        <a href="#" class="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5" aria-label="GitHub"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
                    </div>
                </div>
                <div>
                    <h4 class="font-semibold text-white/90 mb-5 text-sm">Navigation</h4>
                    <ul class="space-y-2.5">
                        <li><a href="index.html" class="text-sm text-euclid-muted hover:text-white transition duration-300">Home</a></li>
                        <li><a href="devices.html" class="text-sm text-euclid-muted hover:text-white transition duration-300">Devices</a></li>
                        <li><a href="screenshots.html" class="text-sm text-euclid-muted hover:text-white transition duration-300">Screenshots</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-white/90 mb-5 text-sm">Resources</h4>
                    <ul class="space-y-2.5">
                        <li><a href="https://github.com/MODEDGES" class="text-sm text-euclid-muted hover:text-white transition duration-300">GitHub</a></li>
                        <li><a href="#" class="text-sm text-euclid-muted hover:text-white transition duration-300">Documentation</a></li>
                    </ul>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/[0.04] gap-4">
                <p class="text-xs text-euclid-muted/40">&copy; 2026 EuclidOS Project. Not affiliated with Google LLC.</p>
                <div class="flex gap-5">
                    <a href="#" class="text-xs text-euclid-muted/40 hover:text-euclid-muted transition">Privacy Policy</a>
                </div>
            </div>
        </div>
    </footer>`;
    }

    // ─── Shared UI Initialization ───
    function initUI() {
        if (typeof gsap === 'undefined') return;

        const lenis = getLenis();
        if (!lenis) return;

        if (typeof ScrollTrigger !== 'undefined' && gsap) {
            gsap.registerPlugin(ScrollTrigger);
        }

        // Scroll progress - use single listener via Lenis
        lenis.off('scroll', _lenisScrollHandler);
        lenis.on('scroll', _lenisScrollHandler);

        // Navbar
        const navbar = document.getElementById('navbar');
        const navGlass = document.getElementById('nav-glass');
        let lastScrollY = 0;
        let navHidden = false;
        let navTicking = false;

        function updateNavbar() {
            const y = window.scrollY;
            if (y > 30) { navGlass.style.opacity = '1'; } else { navGlass.style.opacity = '0'; }
            const goingDown = y > lastScrollY;
            if (goingDown && y > 200 && !navHidden) {
                navbar.style.transform = 'translateY(-100%)';
                navHidden = true;
            } else if (!goingDown && navHidden) {
                navbar.style.transform = 'translateY(0)';
                navHidden = false;
            }
            lastScrollY = y;
            navTicking = false;
        }
        window.addEventListener('scroll', () => {
            if (!navTicking) { requestAnimationFrame(updateNavbar); navTicking = true; }
        }, { passive: true });

        // Mobile Menu
        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const menuBackdrop = document.getElementById('menu-backdrop');
        const menuNavItems = document.querySelectorAll('.menu-nav-item');
        const menuCtaBtn = document.querySelector('.menu-cta-btn');
        let isMenuOpen = false;
        let menuTL = null;

        function openMenu() {
            isMenuOpen = true;
            menuBtn.classList.add('ham-open');
            mobileMenu.classList.add('active');
            lenis.stop();
            menuTL = gsap.timeline({ defaults: { ease: "power3.out" } });
            menuTL.to(menuNavItems, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, delay: 0.15 })
                  .to(menuCtaBtn, { opacity: 1, y: 0, duration: 0.5 }, "-=0.25");
        }

        function closeMenu() {
            isMenuOpen = false;
            menuBtn.classList.remove('ham-open');
            if (menuTL) menuTL.kill();
            gsap.to([menuNavItems, menuCtaBtn], {
                opacity: 0, y: 10, duration: 0.2, stagger: 0.02, ease: "power2.in",
                onComplete: () => {
                    mobileMenu.classList.remove('active');
                    gsap.set(menuNavItems, { opacity: 0, y: 20 });
                    gsap.set(menuCtaBtn, { opacity: 0, y: 20 });
                }
            });
            lenis.start();
        }

        function toggleMenu() { isMenuOpen ? closeMenu() : openMenu(); }

        menuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
        menuBackdrop.addEventListener('click', closeMenu);
        menuNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                closeMenu();
                if (href && !href.startsWith('#')) {
                    setTimeout(() => { window.location.href = href; }, 350);
                }
            });
        });

        // Scroll Reveal - batch with reduced ScrollTrigger count
        const revealEls = document.querySelectorAll('.reveal-section');
        if (revealEls.length > 0) {
            revealEls.forEach((el) => {
                gsap.to(el, {
                    y: 0, opacity: 1, duration: 0.7,
                    ease: "power3.out",
                    scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
                });
            });
        }

        // Smooth scroll anchors
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) lenis.scrollTo(target, { offset: -70, duration: 1.5 });
            });
        });

        return lenis;
    }

    // ─── Shared Lenis scroll handler ───
    function _lenisScrollHandler(e) {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
        const bar = document.getElementById('scroll-progress');
        if (bar) bar.style.width = (e.progress * 100).toFixed(2) + '%';
    }

    // ─── Date Formatting ───
    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const d = new Date(dateStr);
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
        return formatDate(dateStr);
    }

    // ─── Status Badge ───
    function statusBadge(active) {
        if (active) {
            return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-500/40 text-green-400 bg-green-500/[0.08] backdrop-blur-sm"><span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Active</span>`;
        }
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-500/30 text-red-400/80 bg-red-500/[0.06] backdrop-blur-sm"><span class="w-1.5 h-1.5 bg-red-400/70 rounded-full"></span> Inactive</span>`;
    }

    function downloadStatusBadge(status) {
        if (status === 'active') {
            return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-500/40 text-green-400 bg-green-500/[0.08]"><span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Available</span>`;
        }
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-yellow-500/30 text-yellow-400/80 bg-yellow-500/[0.06]"><span class="w-1.5 h-1.5 bg-yellow-400/70 rounded-full"></span> ${status}</span>`;
    }

    // ─── Public API ───
    return {
        fetchJSON,
        fetchMarkdown,
        getDevices,
        getDevice,
        getDownloadInfo,
        getChangelog,
        getInstructions,
        renderMarkdown,
        buildNavbar,
        buildMobileMenu,
        buildFooter,
        initUI,
        getLenis,
        formatDate,
        timeAgo,
        statusBadge,
        downloadStatusBadge,
        Perf,
        BASE
    };
})();
