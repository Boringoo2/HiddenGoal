(function() {
    document.addEventListener("DOMContentLoaded", function() {
        const consentKey = "hg_cookie_consent";
        if (!localStorage.getItem(consentKey)) {
            const banner = document.createElement("div");
            banner.className = "hg-cookie-banner";
            banner.innerHTML = `
                <p>Este sitio utiliza cookies para mejorar la experiencia del usuario y mostrar publicidad relevante.</p>
                <div class="hg-cookie-actions">
                    <button id="btn-accept-cookies" class="hg-btn primary">Aceptar</button>
                    <button id="btn-reject-cookies" class="hg-btn secondary">Rechazar</button>
                </div>
            `;
            document.body.appendChild(banner);

            document.getElementById("btn-accept-cookies").addEventListener("click", () => {
                localStorage.setItem(consentKey, "accepted");
                banner.remove();
            });

            document.getElementById("btn-reject-cookies").addEventListener("click", () => {
                localStorage.setItem(consentKey, "rejected");
                banner.remove();
            });
        }
    });
})();
