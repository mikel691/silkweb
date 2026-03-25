<?php
/**
 * SilkWeb Detector — auto-detects site capabilities from installed plugins and content.
 *
 * @package SilkWeb_Agent
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class SilkWeb_Detector {

    /**
     * Run full detection and return structured results.
     *
     * @return array{
     *   site_type: string,
     *   industry: string,
     *   capabilities: array<array{id: string, name: string, description: string, source: string}>,
     *   plugins_detected: string[]
     * }
     */
    public function detect(): array {
        $capabilities     = array();
        $plugins_detected = array();
        $industry         = 'general';
        $site_type        = 'wordpress';

        // ── WooCommerce ──────────────────────────────────────────────────
        if ( $this->plugin_active( 'woocommerce/woocommerce.php' ) || class_exists( 'WooCommerce' ) ) {
            $plugins_detected[] = 'WooCommerce';
            $site_type          = 'ecommerce';
            $industry           = 'ecommerce';

            $capabilities[] = $this->cap( 'product-search', 'Product Search', 'search products and browse the catalog', 'WooCommerce' );
            $capabilities[] = $this->cap( 'order-tracking', 'Order Tracking', 'track order status and delivery updates', 'WooCommerce' );
            $capabilities[] = $this->cap( 'inventory-check', 'Inventory Check', 'check product availability and stock levels', 'WooCommerce' );
        }

        // ── Contact Form 7 ──────────────────────────────────────────────
        if ( $this->plugin_active( 'contact-form-7/wp-contact-form-7.php' ) || defined( 'WPCF7_VERSION' ) ) {
            $plugins_detected[] = 'Contact Form 7';
            $capabilities       = $this->add_form_caps( $capabilities, 'Contact Form 7' );
        }

        // ── WPForms ─────────────────────────────────────────────────────
        if (
            $this->plugin_active( 'wpforms-lite/wpforms.php' ) ||
            $this->plugin_active( 'wpforms/wpforms.php' ) ||
            defined( 'WPFORMS_VERSION' )
        ) {
            $plugins_detected[] = 'WPForms';
            $capabilities       = $this->add_form_caps( $capabilities, 'WPForms' );
        }

        // ── Gravity Forms ───────────────────────────────────────────────
        if ( $this->plugin_active( 'gravityforms/gravityforms.php' ) || class_exists( 'GFForms' ) ) {
            $plugins_detected[] = 'Gravity Forms';
            $capabilities       = $this->add_form_caps( $capabilities, 'Gravity Forms' );
        }

        // ── Ninja Forms ─────────────────────────────────────────────────
        if ( $this->plugin_active( 'ninja-forms/ninja-forms.php' ) || class_exists( 'Ninja_Forms' ) ) {
            $plugins_detected[] = 'Ninja Forms';
            $capabilities       = $this->add_form_caps( $capabilities, 'Ninja Forms' );
        }

        // ── The Events Calendar ─────────────────────────────────────────
        if ( $this->plugin_active( 'the-events-calendar/the-events-calendar.php' ) || class_exists( 'Tribe__Events__Main' ) ) {
            $plugins_detected[] = 'The Events Calendar';
            $capabilities[]     = $this->cap( 'event-booking', 'Event Booking', 'book and register for events', 'The Events Calendar' );
            $capabilities[]     = $this->cap( 'event-listing', 'Event Listing', 'list and search upcoming events', 'The Events Calendar' );
        }

        // ── Restaurant / Menu plugins ───────────────────────────────────
        // Check for common restaurant menu and food-ordering plugins.
        if ( $this->detect_by_slugs( array(
            'flavor/flavor.php',
            'flavor-developer/flavor.php',
            'flavor-developer/flavor-developer.php',
            'flavor-developer-flavor/flavor.php',
            'flavor-developer-flavor-developer/flavor.php',
            'flavor/flavor-developer.php',
        ) ) || $this->detect_by_post_type( array( 'flavor_menu', 'flavor_menu_item', 'flavor_dish' ) ) ) {
            $plugins_detected[] = 'Restaurant/Menu Plugin';
            if ( 'general' === $industry ) {
                $industry = 'food';
            }
            $capabilities[] = $this->cap( 'menu-display', 'Menu Display', 'display restaurant menus and dishes', 'Restaurant Plugin' );
            $capabilities[] = $this->cap( 'order-taking', 'Order Taking', 'take food orders online', 'Restaurant Plugin' );
            $capabilities[] = $this->cap( 'reservation', 'Reservation', 'handle restaurant reservations', 'Restaurant Plugin' );
        }

        // ── Real Estate plugins ─────────────────────────────────────────
        // Detect by custom post types commonly used by RE plugins.
        if ( $this->detect_by_post_type( array( 'property', 'listing', 'real-estate', 'estate_property' ) ) ) {
            $plugins_detected[] = 'Real Estate Plugin';
            if ( 'general' === $industry ) {
                $industry = 'real-estate';
            }
            $capabilities[] = $this->cap( 'property-search', 'Property Search', 'search property listings', 'Real Estate Plugin' );
            $capabilities[] = $this->cap( 'listing-display', 'Listing Display', 'display property details and images', 'Real Estate Plugin' );
        }

        // ── Booking / Appointment plugins ───────────────────────────────
        if ( $this->detect_by_post_type( array( 'booking', 'appointment', 'mec-events', 'tribe_events' ) ) ||
             $this->detect_by_slugs( array(
                 'bookly-responsive-appointment-booking-tool/main.php',
                 'ameliabooking/ameliabooking.php',
             ) ) ||
             class_exists( 'Bookly\\Lib\\Plugin' ) ||
             defined( 'JETRM_PLUGIN_FILE' )
        ) {
            $plugins_detected[] = 'Booking Plugin';
            if ( ! $this->has_cap( $capabilities, 'event-booking' ) ) {
                $capabilities[] = $this->cap( 'event-booking', 'Event Booking', 'book appointments and events', 'Booking Plugin' );
            }
            $capabilities[] = $this->cap( 'availability-check', 'Availability Check', 'check booking availability', 'Booking Plugin' );
        }

        // ── Default: generic WordPress capabilities ─────────────────────
        $capabilities[] = $this->cap( 'content-search', 'Content Search', 'search site content and pages', 'WordPress' );
        $capabilities[] = $this->cap( 'page-info', 'Page Info', 'retrieve page and post information', 'WordPress' );

        // ── Industry auto-detection from content ────────────────────────
        if ( 'general' === $industry ) {
            $industry = $this->detect_industry_from_content();
        }

        return array(
            'site_type'        => $site_type,
            'industry'         => $industry,
            'capabilities'     => $capabilities,
            'plugins_detected' => $plugins_detected,
        );
    }

    // ── Private helpers ──────────────────────────────────────────────────

    /**
     * Check if a plugin is active.
     */
    private function plugin_active( string $plugin ): bool {
        if ( ! function_exists( 'is_plugin_active' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        return is_plugin_active( $plugin );
    }

    /**
     * Check multiple plugin slugs.
     */
    private function detect_by_slugs( array $slugs ): bool {
        foreach ( $slugs as $slug ) {
            if ( $this->plugin_active( $slug ) ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Detect by registered custom post types.
     */
    private function detect_by_post_type( array $types ): bool {
        foreach ( $types as $type ) {
            if ( post_type_exists( $type ) ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build a capability array.
     */
    private function cap( string $id, string $name, string $description, string $source ): array {
        return array(
            'id'          => $id,
            'name'        => $name,
            'description' => $description,
            'source'      => $source,
        );
    }

    /**
     * Add form capabilities if not already present.
     */
    private function add_form_caps( array $capabilities, string $source ): array {
        if ( ! $this->has_cap( $capabilities, 'inquiry-handling' ) ) {
            $capabilities[] = $this->cap( 'inquiry-handling', 'Inquiry Handling', 'handle customer inquiries and contact requests', $source );
        }
        if ( ! $this->has_cap( $capabilities, 'form-submission' ) ) {
            $capabilities[] = $this->cap( 'form-submission', 'Form Submission', 'process form submissions', $source );
        }
        return $capabilities;
    }

    /**
     * Check if a capability ID is already in the list.
     */
    private function has_cap( array $capabilities, string $id ): bool {
        foreach ( $capabilities as $cap ) {
            if ( $cap['id'] === $id ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Detect industry from site content (name, tagline, recent posts).
     */
    private function detect_industry_from_content(): string {
        $haystack = strtolower(
            get_bloginfo( 'name' ) . ' ' .
            get_bloginfo( 'description' ) . ' ' .
            $this->get_recent_post_titles( 10 )
        );

        $industry_keywords = array(
            'legal'         => array( 'law', 'legal', 'attorney', 'lawyer', 'contract' ),
            'medical'       => array( 'medical', 'health', 'doctor', 'clinic', 'patient', 'dental' ),
            'finance'       => array( 'finance', 'bank', 'invest', 'accounting', 'tax' ),
            'real-estate'   => array( 'real estate', 'property', 'rental', 'realtor', 'mortgage' ),
            'food'          => array( 'restaurant', 'food', 'bakery', 'cafe', 'menu', 'catering' ),
            'travel'        => array( 'travel', 'hotel', 'tourism', 'flight', 'vacation' ),
            'education'     => array( 'education', 'school', 'university', 'course', 'learning' ),
            'ecommerce'     => array( 'shop', 'store', 'buy', 'product', 'cart' ),
            'marketing'     => array( 'marketing', 'seo', 'agency', 'campaign', 'brand' ),
            'construction'  => array( 'construction', 'building', 'contractor', 'architect' ),
            'automotive'    => array( 'auto', 'car', 'vehicle', 'dealer', 'fleet' ),
            'manufacturing' => array( 'manufacturing', 'factory', 'production', 'industrial' ),
            'insurance'     => array( 'insurance', 'claims', 'policy', 'coverage' ),
            'hr'            => array( 'recruitment', 'hiring', 'hr', 'staffing', 'jobs' ),
        );

        foreach ( $industry_keywords as $industry => $keywords ) {
            foreach ( $keywords as $kw ) {
                if ( false !== strpos( $haystack, $kw ) ) {
                    return $industry;
                }
            }
        }

        return 'general';
    }

    /**
     * Get recent post titles as a single string for keyword matching.
     */
    private function get_recent_post_titles( int $count = 10 ): string {
        $posts = get_posts( array(
            'numberposts' => $count,
            'post_status' => 'publish',
            'post_type'   => 'post',
        ) );

        $titles = array();
        foreach ( $posts as $post ) {
            $titles[] = $post->post_title;
        }

        return implode( ' ', $titles );
    }
}
