/**
 * SilkWeb Agent — Admin JavaScript
 *
 * Handles AJAX calls for registration, toggling, and rescanning.
 *
 * @package SilkWeb_Agent
 */

/* global jQuery, silkwebAdmin */
(function ($) {
    'use strict';

    /**
     * Register (or re-register) the agent via AJAX.
     */
    window.silkwebRegister = function () {
        var $btn = $('#silkweb-register-btn, #silkweb-reregister-btn');
        var originalText = $btn.text();
        $btn.prop('disabled', true).html(originalText + ' <span class="silkweb-spinner"></span>');

        $.post(silkwebAdmin.ajax_url, {
            action: 'silkweb_register',
            nonce:  silkwebAdmin.nonce
        })
        .done(function (response) {
            if (response.success) {
                showNotice('success', response.data.message + ' Reloading...');
                setTimeout(function () {
                    window.location.reload();
                }, 1500);
            } else {
                showNotice('error', response.data.message || 'Registration failed.');
                $btn.prop('disabled', false).text(originalText);
            }
        })
        .fail(function () {
            showNotice('error', 'Network error. Please try again.');
            $btn.prop('disabled', false).text(originalText);
        });
    };

    /**
     * Toggle agent enabled / disabled.
     *
     * @param {boolean} enabled
     */
    window.silkwebToggleAgent = function (enabled) {
        $.post(silkwebAdmin.ajax_url, {
            action:  'silkweb_toggle',
            nonce:   silkwebAdmin.nonce,
            enabled: enabled ? 'true' : 'false'
        })
        .done(function (response) {
            if (response.success) {
                // Update badge text.
                var $badge = $('.silkweb-badge');
                if (enabled) {
                    $badge.removeClass('silkweb-badge-inactive').addClass('silkweb-badge-active').text('Active');
                } else {
                    $badge.removeClass('silkweb-badge-active').addClass('silkweb-badge-inactive').text('Disabled');
                }
                showNotice('success', response.data.message);
            } else {
                showNotice('error', response.data.message || 'Toggle failed.');
            }
        })
        .fail(function () {
            showNotice('error', 'Network error. Please try again.');
        });
    };

    /**
     * Re-scan site capabilities.
     */
    window.silkwebRescan = function () {
        var $btn = $('#silkweb-rescan-btn');
        var originalText = $btn.text();
        $btn.prop('disabled', true).html(originalText + ' <span class="silkweb-spinner"></span>');

        $.post(silkwebAdmin.ajax_url, {
            action: 'silkweb_rescan',
            nonce:  silkwebAdmin.nonce
        })
        .done(function (response) {
            if (response.success) {
                showNotice('success', response.data.message + ' Reloading...');
                setTimeout(function () {
                    window.location.reload();
                }, 1000);
            } else {
                showNotice('error', response.data.message || 'Rescan failed.');
                $btn.prop('disabled', false).text(originalText);
            }
        })
        .fail(function () {
            showNotice('error', 'Network error. Please try again.');
            $btn.prop('disabled', false).text(originalText);
        });
    };

    /**
     * Show a temporary notice at the top of the page.
     *
     * @param {string} type    'success' or 'error'
     * @param {string} message
     */
    function showNotice(type, message) {
        // Remove any existing notice.
        $('.silkweb-notice-dynamic').remove();

        var cssClass = 'success' === type ? 'silkweb-notice-success' : 'silkweb-notice-error';
        var $notice = $(
            '<div class="silkweb-notice silkweb-notice-dynamic ' + cssClass + '">' +
            '<p>' + escHtml(message) + '</p>' +
            '</div>'
        );

        $('.silkweb-header').after($notice);

        // Auto-dismiss success notices after 5 seconds.
        if ('success' === type) {
            setTimeout(function () {
                $notice.fadeOut(300, function () {
                    $notice.remove();
                });
            }, 5000);
        }
    }

    /**
     * Escape HTML entities.
     *
     * @param {string} str
     * @return {string}
     */
    function escHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})(jQuery);
