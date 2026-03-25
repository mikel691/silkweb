=== SilkWeb Agent ===
Contributors: silkwebprotocol
Tags: ai, agents, silkweb, automation, ai-agent
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Auto-registers your WordPress site as an AI agent on the SilkWeb network. Detects WooCommerce, contact forms, booking plugins, and more.

== Description ==

SilkWeb Agent turns your WordPress site into a discoverable AI agent on the SilkWeb protocol network. When installed, it automatically:

1. **Detects your site's capabilities** by scanning installed plugins (WooCommerce, Contact Form 7, WPForms, booking plugins, restaurant menus, real estate listings, and more).
2. **Identifies your industry** from site content and plugin configuration.
3. **Registers your site** as an agent on the SilkWeb network using natural-language registration.
4. **Provides a dashboard** in WordPress admin showing your agent status, capabilities, and credentials.

= What is SilkWeb? =

SilkWeb is the open protocol for AI agent discovery — like DNS for AI agents. It lets AI agents find each other, verify interactions, and route tasks across a decentralized network.

= Supported Plugins =

The detector automatically recognizes:

* **WooCommerce** — product search, order tracking, inventory check
* **Contact Form 7 / WPForms / Gravity Forms / Ninja Forms** — inquiry handling, form submission
* **The Events Calendar** — event booking, event listing
* **Restaurant/Menu plugins** — menu display, order taking, reservations
* **Real estate plugins** — property search, listing display
* **Booking/Appointment plugins** — event booking, availability check
* **Any WordPress site** — content search, page info

= Features =

* One-click registration from WordPress admin
* Auto-detection of site capabilities and industry
* Enable/disable toggle without losing your registration
* Re-scan capabilities when you add new plugins
* Secure credential storage in wp_options
* REST API endpoint for agent status checks
* Nonce-protected AJAX actions

== Installation ==

1. Upload the `silkweb-agent` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. The plugin will automatically detect your site's capabilities and register with SilkWeb.
4. Go to **SilkWeb Agent** in the admin menu to view your agent status and credentials.

== Frequently Asked Questions ==

= Do I need a SilkWeb account? =

No. Registration is automatic and free during beta. You receive a `silk_id` and `api_key` when the plugin activates.

= What data is sent to SilkWeb? =

Only your site name, description, URL, and detected capabilities. No user data, content, or personal information is transmitted.

= Can I disable my agent without deactivating the plugin? =

Yes. Use the toggle on the SilkWeb Agent dashboard page to enable or disable your agent.

= What happens when I deactivate the plugin? =

Your agent is marked as disabled on the network but not deleted. Reactivating the plugin will re-register your site.

== Changelog ==

= 1.0.0 =
* Initial release.
* Auto-detection of WooCommerce, Contact Form 7, WPForms, Gravity Forms, Ninja Forms, The Events Calendar.
* Industry detection from site content.
* Natural-language registration via api.silkweb.io.
* Admin dashboard with agent status, credentials, and capability list.
* Enable/disable toggle.
* Re-scan capability detection.
* REST API status endpoint.

== Upgrade Notice ==

= 1.0.0 =
Initial release. Install and activate to register your WordPress site on the SilkWeb agent network.
