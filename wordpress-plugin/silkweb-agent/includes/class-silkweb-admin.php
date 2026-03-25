<?php
/**
 * SilkWeb Admin — dashboard page, AJAX handlers, and admin UI.
 *
 * @package SilkWeb_Agent
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class SilkWeb_Admin {

    /** @var SilkWeb_Detector */
    private $detector;

    /** @var SilkWeb_API */
    private $api;

    /**
     * Constructor.
     *
     * @param SilkWeb_Detector $detector Detector instance.
     * @param SilkWeb_API      $api      API instance.
     */
    public function __construct( SilkWeb_Detector $detector, SilkWeb_API $api ) {
        $this->detector = $detector;
        $this->api      = $api;
    }

    /**
     * Register the admin menu page.
     */
    public function register_menu(): void {
        add_menu_page(
            'SilkWeb Agent',
            'SilkWeb Agent',
            'manage_options',
            'silkweb-agent',
            array( $this, 'render_page' ),
            'dashicons-networking',
            80
        );
    }

    /**
     * Enqueue admin CSS and JS on our page only.
     *
     * @param string $hook_suffix Current admin page hook.
     */
    public function enqueue_assets( string $hook_suffix ): void {
        if ( 'toplevel_page_silkweb-agent' !== $hook_suffix ) {
            return;
        }

        wp_enqueue_style(
            'silkweb-admin',
            SILKWEB_AGENT_URL . 'assets/css/admin.css',
            array(),
            SILKWEB_AGENT_VERSION
        );

        wp_enqueue_script(
            'silkweb-admin',
            SILKWEB_AGENT_URL . 'assets/js/admin.js',
            array( 'jquery' ),
            SILKWEB_AGENT_VERSION,
            true
        );

        wp_localize_script( 'silkweb-admin', 'silkwebAdmin', array(
            'ajax_url' => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'silkweb_admin_nonce' ),
        ) );
    }

    /**
     * Render the admin dashboard page.
     */
    public function render_page(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have permission to access this page.', 'silkweb-agent' ) );
        }

        $is_registered = get_option( 'silkweb_registered', false );
        $is_enabled    = get_option( 'silkweb_enabled', false );
        $silk_id       = get_option( 'silkweb_silk_id', '' );
        $agent_id      = get_option( 'silkweb_agent_id', '' );
        $api_key       = get_option( 'silkweb_api_key', '' );
        $registered_at = get_option( 'silkweb_registered_at', '' );
        $capabilities  = get_option( 'silkweb_capabilities', array() );
        $tags          = get_option( 'silkweb_tags', array() );
        $detection     = get_option( 'silkweb_detection', array() );
        $last_error    = get_option( 'silkweb_last_error', '' );
        $reg_text      = get_option( 'silkweb_registration_text', '' );

        include SILKWEB_AGENT_DIR . 'admin/settings.html';
    }

    /**
     * AJAX: Register (or re-register) the agent.
     */
    public function ajax_register(): void {
        check_ajax_referer( 'silkweb_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
        }

        // Re-detect capabilities.
        $detection = $this->detector->detect();
        update_option( 'silkweb_detection', $detection, false );

        // Build text.
        $plugin = SilkWeb_Agent::instance();
        $text   = $plugin->build_registration_text( $detection );
        update_option( 'silkweb_registration_text', $text, false );

        // Register.
        $result = $this->api->register_text( $text, get_option( 'admin_email' ) );

        if ( is_wp_error( $result ) ) {
            update_option( 'silkweb_last_error', $result->get_error_message(), false );
            wp_send_json_error( array( 'message' => $result->get_error_message() ) );
        }

        // Store credentials.
        update_option( 'silkweb_silk_id', sanitize_text_field( $result['silk_id'] ), false );
        update_option( 'silkweb_agent_id', sanitize_text_field( $result['agent_id'] ), false );
        update_option( 'silkweb_api_key', sanitize_text_field( $result['api_key'] ), false );
        update_option( 'silkweb_registered', true, false );
        update_option( 'silkweb_enabled', true, false );
        update_option( 'silkweb_registered_at', current_time( 'mysql' ), false );
        update_option( 'silkweb_capabilities', $result['capabilities'] ?? array(), false );
        update_option( 'silkweb_tags', $result['tags'] ?? array(), false );
        delete_option( 'silkweb_last_error' );

        wp_send_json_success( array(
            'message'      => 'Agent registered successfully.',
            'silk_id'      => $result['silk_id'],
            'agent_id'     => $result['agent_id'],
            'capabilities' => $result['capabilities'] ?? array(),
            'tags'         => $result['tags'] ?? array(),
        ) );
    }

    /**
     * AJAX: Toggle agent enabled/disabled.
     */
    public function ajax_toggle(): void {
        check_ajax_referer( 'silkweb_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
        }

        $enabled = isset( $_POST['enabled'] ) && 'true' === sanitize_text_field( wp_unslash( $_POST['enabled'] ) );
        update_option( 'silkweb_enabled', $enabled, false );

        wp_send_json_success( array(
            'enabled' => $enabled,
            'message' => $enabled ? 'Agent enabled.' : 'Agent disabled.',
        ) );
    }

    /**
     * AJAX: Re-scan capabilities.
     */
    public function ajax_rescan(): void {
        check_ajax_referer( 'silkweb_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
        }

        $detection = $this->detector->detect();
        update_option( 'silkweb_detection', $detection, false );

        $plugin = SilkWeb_Agent::instance();
        $text   = $plugin->build_registration_text( $detection );
        update_option( 'silkweb_registration_text', $text, false );

        wp_send_json_success( array(
            'detection' => $detection,
            'text'      => $text,
            'message'   => 'Capabilities re-scanned.',
        ) );
    }
}
