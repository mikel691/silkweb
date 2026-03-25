<?php
/**
 * Plugin Name:       SilkWeb Agent
 * Plugin URI:        https://silkweb.io/wordpress
 * Description:       Auto-registers your WordPress site as an AI agent on the SilkWeb network. Detects WooCommerce, contact forms, booking plugins, and more.
 * Version:           1.0.0
 * Author:            SilkWeb Protocol
 * Author URI:        https://silkweb.io
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       silkweb-agent
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'SILKWEB_AGENT_VERSION', '1.0.0' );
define( 'SILKWEB_AGENT_FILE', __FILE__ );
define( 'SILKWEB_AGENT_DIR', plugin_dir_path( __FILE__ ) );
define( 'SILKWEB_AGENT_URL', plugin_dir_url( __FILE__ ) );
define( 'SILKWEB_API_BASE', 'https://api.silkweb.io' );

// Autoload classes.
require_once SILKWEB_AGENT_DIR . 'includes/class-silkweb-detector.php';
require_once SILKWEB_AGENT_DIR . 'includes/class-silkweb-api.php';
require_once SILKWEB_AGENT_DIR . 'includes/class-silkweb-admin.php';

/**
 * Main plugin class — singleton.
 */
final class SilkWeb_Agent {

    /** @var self|null */
    private static $instance = null;

    /** @var SilkWeb_Detector */
    public $detector;

    /** @var SilkWeb_API */
    public $api;

    /** @var SilkWeb_Admin */
    public $admin;

    /**
     * Get singleton instance.
     */
    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor — wire hooks.
     */
    private function __construct() {
        $this->detector = new SilkWeb_Detector();
        $this->api      = new SilkWeb_API();
        $this->admin    = new SilkWeb_Admin( $this->detector, $this->api );

        // Activation / deactivation.
        register_activation_hook( SILKWEB_AGENT_FILE, array( $this, 'activate' ) );
        register_deactivation_hook( SILKWEB_AGENT_FILE, array( $this, 'deactivate' ) );

        // Admin hooks.
        if ( is_admin() ) {
            add_action( 'admin_menu', array( $this->admin, 'register_menu' ) );
            add_action( 'admin_enqueue_scripts', array( $this->admin, 'enqueue_assets' ) );
            add_action( 'wp_ajax_silkweb_register', array( $this->admin, 'ajax_register' ) );
            add_action( 'wp_ajax_silkweb_toggle', array( $this->admin, 'ajax_toggle' ) );
            add_action( 'wp_ajax_silkweb_rescan', array( $this->admin, 'ajax_rescan' ) );
        }
    }

    /**
     * Plugin activation — detect capabilities and auto-register.
     */
    public function activate(): void {
        // Run detection.
        $detection = $this->detector->detect();
        update_option( 'silkweb_detection', $detection, false );

        // Build registration text from detection.
        $text = $this->build_registration_text( $detection );
        update_option( 'silkweb_registration_text', $text, false );

        // Attempt auto-registration.
        $result = $this->api->register_text( $text, get_option( 'admin_email' ) );
        if ( ! is_wp_error( $result ) && ! empty( $result['silk_id'] ) ) {
            update_option( 'silkweb_silk_id', sanitize_text_field( $result['silk_id'] ), false );
            update_option( 'silkweb_agent_id', sanitize_text_field( $result['agent_id'] ), false );
            update_option( 'silkweb_api_key', sanitize_text_field( $result['api_key'] ), false );
            update_option( 'silkweb_registered', true, false );
            update_option( 'silkweb_enabled', true, false );
            update_option( 'silkweb_registered_at', current_time( 'mysql' ), false );
            update_option( 'silkweb_capabilities', $result['capabilities'] ?? array(), false );
            update_option( 'silkweb_tags', $result['tags'] ?? array(), false );
        } else {
            update_option( 'silkweb_registered', false, false );
            $error_msg = is_wp_error( $result ) ? $result->get_error_message() : 'Unknown error';
            update_option( 'silkweb_last_error', $error_msg, false );
        }
    }

    /**
     * Plugin deactivation — mark agent as disabled (does not delete from SilkWeb).
     */
    public function deactivate(): void {
        update_option( 'silkweb_enabled', false, false );
    }

    /**
     * Build a natural-language registration description from detected site info.
     */
    public function build_registration_text( array $detection ): string {
        $site_name = get_bloginfo( 'name' );
        $site_desc = get_bloginfo( 'description' );
        $site_url  = home_url();

        $parts = array();
        $parts[] = sprintf( 'My agent is called %s.', $site_name );

        if ( ! empty( $site_desc ) ) {
            $parts[] = $site_desc . '.';
        }

        // Describe capabilities based on detected plugins.
        $cap_descriptions = array();
        foreach ( $detection['capabilities'] as $cap ) {
            $cap_descriptions[] = $cap['description'];
        }
        if ( ! empty( $cap_descriptions ) ) {
            $parts[] = 'It can ' . implode( ', ', $cap_descriptions ) . '.';
        }

        // Industry.
        if ( ! empty( $detection['industry'] ) ) {
            $parts[] = sprintf( 'Industry: %s.', $detection['industry'] );
        }

        // Endpoint.
        $parts[] = sprintf( 'Endpoint: %s', rtrim( $site_url, '/' ) . '/wp-json/silkweb/v1/agent' );

        return implode( ' ', $parts );
    }
}

/**
 * Register a simple REST endpoint so the site can respond as a SilkWeb agent.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'silkweb/v1', '/agent', array(
        'methods'             => 'GET',
        'callback'            => function () {
            $silk_id = get_option( 'silkweb_silk_id', '' );
            $enabled = get_option( 'silkweb_enabled', false );
            return new WP_REST_Response( array(
                'status'  => $enabled ? 'active' : 'inactive',
                'silk_id' => $silk_id,
                'site'    => get_bloginfo( 'name' ),
                'version' => SILKWEB_AGENT_VERSION,
            ), 200 );
        },
        'permission_callback' => '__return_true',
    ) );
} );

/**
 * Initialize plugin.
 */
function silkweb_agent_init(): SilkWeb_Agent {
    return SilkWeb_Agent::instance();
}
add_action( 'plugins_loaded', 'silkweb_agent_init' );
