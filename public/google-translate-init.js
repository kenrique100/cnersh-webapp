// Google Translate widget bootstrap.
//
// This lives in /public rather than as an inline <script> so the Content
// Security Policy does not need 'unsafe-inline' for scripts. The widget calls
// window.googleTranslateElementInit once element.js has loaded.
window.googleTranslateElementInit = function () {
    if (
        typeof window.google === "undefined" ||
        typeof window.google.translate === "undefined"
    ) {
        return;
    }

    new window.google.translate.TranslateElement(
        {
            pageLanguage: "en",
            includedLanguages: "en,fr",
            autoDisplay: false,
            layout: 0,
        },
        "google_translate_element",
    );
};
