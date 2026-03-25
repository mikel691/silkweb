<?php
/**
 * SilkWeb API — communicates with api.silkweb.io for agent registration and management.
 *
 * @package SilkWeb_Agent
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class SilkWeb_API {

    /**
     * API base URL.
     *
     * @var string
     */
    private $base_url;

    /**
     * Constructor.
     */
    public function __construct() {
        $this->base_url = defined( 'SILKWEB_API_BASE' ) ? SILKWEB_API_BASE : 'https://api.silkweb.io';
    }

    /**
     * Register an agent using the text-based endpoint.
     *
     * @param string      $text          Natural-language description of the agent.
     * @param string|null $contact_email Contact email for the agent owner.
     * @return array|WP_Error  Parsed response body on success, WP_Error on failure.
     */
    public function register_text( string $text, ?string $contact_email = null ) {
        $body = array( 'text' => $text );
        if ( $contact_email ) {
            $body['contact_email'] = $contact_email;
        }

        $response = wp_remote_post(
            $this->base_url . '/api/v1/agents/register-text',
            array(
                'timeout' => 30,
                'headers' => array(
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                    'User-Agent'   => 'SilkWeb-WordPress/' . SILKWEB_AGENT_VERSION,
                ),
                'body'    => wp_json_encode( $body ),
            )
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( 201 !== $code ) {
            $detail = isset( $data['detail'] ) ? $data['detail'] : 'Registration failed with status ' . $code;
            return new WP_Error( 'silkweb_api_error', $detail, array( 'status' => $code ) );
        }

        return $data;
    }

    /**
     * Check agent status on the network.
     *
     * @param string $silk_id The agent's silk_id.
     * @return array|WP_Error
     */
    public function get_agent( string $silk_id ) {
        $response = wp_remote_get(
            $this->base_url . '/api/v1/agents/' . urlencode( $silk_id ),
            array(
                'timeout' => 15,
                'headers' => array(
                    'Accept'     => 'application/json',
                    'User-Agent' => 'SilkWeb-WordPress/' . SILKWEB_AGENT_VERSION,
                ),
            )
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( 200 !== $code ) {
            $detail = isset( $data['detail'] ) ? $data['detail'] : 'Failed to retrieve agent with status ' . $code;
            return new WP_Error( 'silkweb_api_error', $detail, array( 'status' => $code ) );
        }

        return $data;
    }

    /**
     * Ping the API to verify connectivity.
     *
     * @return bool True if the API is reachable.
     */
    public function ping(): bool {
        $response = wp_remote_get(
            $this->base_url . '/health',
            array(
                'timeout' => 10,
                'headers' => array(
                    'User-Agent' => 'SilkWeb-WordPress/' . SILKWEB_AGENT_VERSION,
                ),
            )
        );

        return ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response );
    }
}
