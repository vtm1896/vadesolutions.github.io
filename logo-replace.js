document.addEventListener('DOMContentLoaded', function () {
    if (!window.VADE_LOGO_B64) return;
    var selectors = ['.logo-icon', '.login-logo-icon', '.db-logo-icon'];
    selectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) {
            var svg = el.querySelector('svg');
            if (svg) {
                var img = document.createElement('img');
                img.src = window.VADE_LOGO_B64;
                img.alt = 'Vade';
                img.style.width = svg.getAttribute('width') || '18px';
                img.style.height = svg.getAttribute('height') || '18px';
                img.style.objectFit = 'contain';
                svg.replaceWith(img);
            }
        });
    });
});
