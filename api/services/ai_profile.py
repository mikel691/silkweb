"""AI profile generator for businesses.

Takes crawl data + user-provided onboarding data and produces an
AI-optimized profile: plain-text description, FAQ entries, capability
tags, schema.org JSON-LD, and ranked keywords.
"""

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _generate_description(crawl: dict, user: dict) -> str:
    """Generate a comprehensive plain-text description optimized for AI citation."""
    parts: list[str] = []

    name = user.get("name") or crawl.get("business_name") or "This business"
    desc = user.get("description") or crawl.get("description") or ""
    industry = crawl.get("industry") or ""
    city = crawl.get("location", {}).get("city") or user.get("city") or ""
    state = crawl.get("location", {}).get("state") or user.get("state") or ""

    # Opening sentence
    location_str = ""
    if city and state:
        location_str = f" in {city}, {state}"
    elif city:
        location_str = f" in {city}"

    if industry:
        parts.append(f"{name} is a {industry.lower()} business{location_str}.")
    else:
        parts.append(f"{name} is a business{location_str}.")

    # Description
    if desc:
        parts.append(desc)

    # Services
    services = crawl.get("services", [])
    user_services = user.get("services", [])
    all_services = list(dict.fromkeys(user_services + services))  # dedupe, keep order
    if all_services:
        service_list = ", ".join(all_services[:10])
        parts.append(f"{name} offers: {service_list}.")

    # Contact info
    contact = crawl.get("contact", {})
    if contact.get("phone"):
        parts.append(f"Contact {name} at {contact['phone']}.")
    if contact.get("email"):
        parts.append(f"Email: {contact['email']}.")
    if contact.get("address"):
        parts.append(f"Located at {contact['address']}.")

    # Hours
    hours = crawl.get("hours") or user.get("hours")
    if hours:
        parts.append(f"Business hours: {hours}.")

    # Website
    url = crawl.get("url") or user.get("website_url")
    if url:
        parts.append(f"Visit {name} online at {url}.")

    return " ".join(parts)


def _generate_faqs(crawl: dict, user: dict) -> list[dict]:
    """Generate 5-10 auto-generated Q&As about the business."""
    name = user.get("name") or crawl.get("business_name") or "this business"
    faqs: list[dict] = []

    # Q: What services?
    services = crawl.get("services", [])
    user_services = user.get("services", [])
    all_services = list(dict.fromkeys(user_services + services))
    if all_services:
        faqs.append({
            "question": f"What services does {name} offer?",
            "answer": f"{name} offers {', '.join(all_services[:8])}.",
        })

    # Q: Where is it located?
    location = crawl.get("location", {})
    city = location.get("city") or user.get("city")
    state = location.get("state") or user.get("state")
    address = crawl.get("contact", {}).get("address") or location.get("address")
    if city:
        loc_answer = f"{name} is located in {city}"
        if state:
            loc_answer += f", {state}"
        if address:
            loc_answer += f" at {address}"
        loc_answer += "."
        faqs.append({
            "question": f"Where is {name} located?",
            "answer": loc_answer,
        })

    # Q: Hours?
    hours = crawl.get("hours") or user.get("hours")
    if hours:
        faqs.append({
            "question": f"What are {name}'s hours?",
            "answer": f"{name}'s hours are {hours}.",
        })

    # Q: Contact?
    contact = crawl.get("contact", {})
    contact_parts = []
    if contact.get("phone"):
        contact_parts.append(f"phone at {contact['phone']}")
    if contact.get("email"):
        contact_parts.append(f"email at {contact['email']}")
    url = crawl.get("url") or user.get("website_url")
    if url:
        contact_parts.append(f"their website at {url}")
    if contact_parts:
        faqs.append({
            "question": f"How can I contact {name}?",
            "answer": f"You can reach {name} by {', or '.join(contact_parts)}.",
        })

    # Q: Does [business] offer [top service]?
    for svc in all_services[:3]:
        faqs.append({
            "question": f"Does {name} offer {svc.lower()}?",
            "answer": f"Yes, {name} offers {svc.lower()} as one of their services.",
        })

    # Q: Social media?
    social = crawl.get("social", {})
    if social:
        platforms = list(social.keys())
        faqs.append({
            "question": f"Is {name} on social media?",
            "answer": f"Yes, {name} is on {', '.join(platforms)}.",
        })

    # Q: Industry
    industry = crawl.get("industry")
    if industry:
        faqs.append({
            "question": f"What type of business is {name}?",
            "answer": f"{name} is a {industry.lower()} business.",
        })

    # Q: Menu/pricing?
    menu_url = crawl.get("menu_url")
    pricing_url = crawl.get("pricing_url")
    if menu_url:
        faqs.append({
            "question": f"Does {name} have a menu?",
            "answer": f"Yes, you can view {name}'s menu at {menu_url}.",
        })
    if pricing_url:
        faqs.append({
            "question": f"Where can I find {name}'s pricing?",
            "answer": f"You can find {name}'s pricing at {pricing_url}.",
        })

    return faqs[:10]


def _generate_capability_tags(crawl: dict, user: dict) -> list[str]:
    """Map business capabilities to searchable tags."""
    tags: set[str] = set()

    # From industry
    industry = crawl.get("industry", "")
    if industry:
        tags.add(industry.lower().replace(" / ", "-").replace(" ", "-"))

    # From services
    for svc in crawl.get("services", []) + user.get("services", []):
        # Normalize to tag format
        tag = svc.lower().strip()
        tag = tag.replace(" ", "-")[:50]
        if tag:
            tags.add(tag)

    # From crawl keywords
    for kw in crawl.get("keywords", [])[:10]:
        tags.add(kw)

    # From user-provided tags
    for tag in user.get("tags", []):
        tags.add(tag.lower().strip())

    return sorted(tags)[:30]


def _generate_schema_org(crawl: dict, user: dict) -> dict:
    """Generate schema.org JSON-LD for the business."""
    name = user.get("name") or crawl.get("business_name") or "Business"
    desc = user.get("description") or crawl.get("description") or ""

    schema: dict = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": name,
    }

    if desc:
        schema["description"] = desc

    # URL
    url = crawl.get("url") or user.get("website_url")
    if url:
        schema["url"] = url

    # Logo
    logo = crawl.get("logo_url")
    if logo:
        schema["logo"] = logo

    # Contact
    contact = crawl.get("contact", {})
    if contact.get("phone"):
        schema["telephone"] = contact["phone"]
    if contact.get("email"):
        schema["email"] = contact["email"]

    # Address
    location = crawl.get("location", {})
    address_parts: dict = {}
    if location.get("address") or contact.get("address"):
        address_parts["streetAddress"] = location.get("address") or contact.get("address")
    if location.get("city"):
        address_parts["addressLocality"] = location["city"]
    if location.get("state"):
        address_parts["addressRegion"] = location["state"]
    if location.get("zip"):
        address_parts["postalCode"] = location["zip"]
    if address_parts:
        address_parts["@type"] = "PostalAddress"
        address_parts["addressCountry"] = "US"
        schema["address"] = address_parts

    # Hours
    hours = crawl.get("hours") or user.get("hours")
    if hours:
        schema["openingHours"] = hours

    # Social / sameAs
    social = crawl.get("social", {})
    if social:
        schema["sameAs"] = list(social.values())

    # Industry
    industry = crawl.get("industry")
    if industry:
        # Map to more specific schema.org types
        type_map = {
            "Restaurant / Food": "Restaurant",
            "Legal Services": "LegalService",
            "Healthcare / Medical": "MedicalBusiness",
            "Real Estate": "RealEstateAgent",
            "Retail / E-Commerce": "Store",
            "Finance / Accounting": "FinancialService",
            "Beauty / Wellness": "HealthAndBeautyBusiness",
            "Automotive": "AutoRepair",
            "Education / Tutoring": "EducationalOrganization",
            "Travel / Hospitality": "LodgingBusiness",
        }
        if industry in type_map:
            schema["@type"] = type_map[industry]

    return schema


def _rank_keywords(crawl: dict, user: dict) -> list[str]:
    """Rank keywords by relevance — user-provided first, then crawl-extracted."""
    ranked: list[str] = []
    seen: set[str] = set()

    # User-provided keywords first (highest relevance)
    for kw in user.get("keywords", []):
        kw_lower = kw.lower().strip()
        if kw_lower and kw_lower not in seen:
            seen.add(kw_lower)
            ranked.append(kw_lower)

    # User-provided tags
    for tag in user.get("tags", []):
        tag_lower = tag.lower().strip()
        if tag_lower and tag_lower not in seen:
            seen.add(tag_lower)
            ranked.append(tag_lower)

    # Industry as keyword
    industry = crawl.get("industry")
    if industry:
        for word in industry.lower().replace("/", " ").split():
            word = word.strip()
            if word and word not in seen:
                seen.add(word)
                ranked.append(word)

    # Location keywords
    location = crawl.get("location", {})
    for field in ["city", "state"]:
        val = location.get(field)
        if val:
            val_lower = val.lower()
            if val_lower not in seen:
                seen.add(val_lower)
                ranked.append(val_lower)

    # Crawl-extracted keywords
    for kw in crawl.get("keywords", []):
        if kw not in seen:
            seen.add(kw)
            ranked.append(kw)

    return ranked[:30]


def generate_ai_profile(crawl_data: dict, user_input: dict) -> dict:
    """Generate a structured AI profile from crawl data + user input.

    Args:
        crawl_data: The result from crawl_business().
        user_input: User-provided data from onboarding (name, description,
                    services, city, state, hours, keywords, tags, website_url).

    Returns:
        A dict containing:
        - ai_description: plain-text description optimized for AI citation
        - faq_entries: list of {question, answer} dicts
        - capability_tags: list of searchable tag strings
        - schema_org: schema.org JSON-LD dict
        - keywords_ranked: keywords ranked by relevance
        - generated_at: ISO timestamp
    """
    user_input = user_input or {}

    profile = {
        "ai_description": _generate_description(crawl_data, user_input),
        "faq_entries": _generate_faqs(crawl_data, user_input),
        "capability_tags": _generate_capability_tags(crawl_data, user_input),
        "schema_org": _generate_schema_org(crawl_data, user_input),
        "keywords_ranked": _rank_keywords(crawl_data, user_input),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return profile
