<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Font Awesome -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />

        <!-- Fix scrolling issues -->
        <style>
            html, body {
                overflow: hidden;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
            }
            body {
                position: relative;
            }
body.settings-page {
                overflow-y: scroll !important;
                height: auto !important;
                min-height: 100vh !important;
                position: static !important;
            }

            body.settings-page
min-height: 100vh;
                height: auto !important;
                overflow: visible !important;
            }
.scrollable-container {
                overflow-y: auto;
                overflow-x: hidden;
            }
.modal-content,
            .rating-modal-container,
            .social-modal-content,
            .collection-modal-content {
                overflow-y: auto;
                max-height: 90vh;
            }




position: relative;
                z-index: 9999999;
            }
button, a, input, textarea, select, [role="button"] {
                pointer-events: auto !important;
            }
        </style>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
        <div id="collection-details-modal-root"></div>
        <div id="user-profile-modal-root"></div>
        <div id="self-profile-modal-root"></div>
        <div id="error-boundary-root"></div>
        <div id="navigation-modal-root"></div>
        <div id="rating-modal-root"></div>
        <div id="collection-modal-root"></div>
        <div id="collection-rating-modal-root"></div>
        <div id="save-to-collection-modal-root"></div>
        <div id="tag-selector-modal-root"></div>
    </body>
</html>
