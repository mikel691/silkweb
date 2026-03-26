"""Website crawler service for extracting structured business data.

Crawls up to 5 pages of a business website and extracts structured data
for AI indexing: name, description, services, contact info, hours,
social links, location, keywords, schema.org data, and more.
"""

import logging
import re
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Comment

logger = logging.getLogger(__name__)

USER_AGENT = "SilkWebBot/1.0 (+https://silkweb.io/bot)"
REQUEST_TIMEOUT = 10.0
MAX_PAGES = 5

# ── Stop words for keyword extraction ────────────────────────────────────────

STOP_WORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "its", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    "not", "no", "nor", "so", "if", "then", "than", "too", "very", "just",
    "about", "above", "after", "again", "all", "also", "am", "any", "as",
    "because", "before", "between", "both", "each", "few", "get", "got",
    "he", "her", "here", "him", "his", "how", "i", "into", "me", "more",
    "most", "my", "new", "now", "only", "other", "our", "out", "over",
    "own", "re", "s", "same", "she", "some", "such", "t", "that", "their",
    "them", "there", "these", "they", "this", "those", "through", "under",
    "up", "us", "we", "what", "when", "where", "which", "while", "who",
    "whom", "why", "you", "your", "com", "www", "http", "https", "html",
    "page", "home", "site", "website", "click", "here", "learn", "read",
    "view", "see", "back", "next", "prev", "previous", "skip", "main",
    "content", "navigation", "menu", "footer", "header", "sidebar",
    "copyright", "rights", "reserved", "privacy", "policy", "terms",
    "conditions", "contact", "us", "about", "follow",
})

# ── Social media patterns ────────────────────────────────────────────────────

SOCIAL_PLATFORMS = {
    "facebook": re.compile(r"https?://(?:www\.)?facebook\.com/[\w./-]+", re.I),
    "instagram": re.compile(r"https?://(?:www\.)?instagram\.com/[\w./-]+", re.I),
    "twitter": re.compile(r"https?://(?:www\.)?(?:twitter|x)\.com/[\w./-]+", re.I),
    "linkedin": re.compile(r"https?://(?:www\.)?linkedin\.com/[\w./-]+", re.I),
    "youtube": re.compile(r"https?://(?:www\.)?youtube\.com/[\w./@-]+", re.I),
    "tiktok": re.compile(r"https?://(?:www\.)?tiktok\.com/@[\w./-]+", re.I),
}

# ── Contact patterns ─────────────────────────────────────────────────────────

PHONE_PATTERN = re.compile(
    r"(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}"
)
EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
)
ADDRESS_PATTERN = re.compile(
    r"\d{1,5}\s[\w\s]{1,40}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|"
    r"Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle|Pkwy|Parkway|Hwy|Highway)"
    r"[.,]?\s*(?:(?:Suite|Ste|Apt|Unit|#)\s*\w+[.,]?\s*)?"
    r"[\w\s]{1,30},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?",
    re.I,
)

# ── Hours patterns ───────────────────────────────────────────────────────────

HOURS_PATTERN = re.compile(
    r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|"
    r"Saturday|Sunday)[\w\s,/-]*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)"
    r"[\s-]+\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)",
    re.I,
)

# ── US State codes ───────────────────────────────────────────────────────────

US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
}

# ── Industry classification keywords ────────────────────────────────────────

INDUSTRY_MAP: dict[str, list[str]] = {
    "Restaurant / Food": [
        "restaurant", "menu", "dining", "chef", "cuisine", "food", "eat",
        "catering", "takeout", "delivery", "brunch", "lunch", "dinner",
        "pizza", "sushi", "burger", "bakery", "cafe", "coffee", "bar",
    ],
    "Legal Services": [
        "attorney", "lawyer", "law firm", "legal", "litigation", "counsel",
        "paralegal", "court", "contract", "injury",
    ],
    "Healthcare / Medical": [
        "doctor", "medical", "health", "clinic", "hospital", "dental",
        "dentist", "therapy", "therapist", "physician", "nurse",
    ],
    "Real Estate": [
        "real estate", "realtor", "property", "homes", "housing", "mortgage",
        "listing", "apartment", "rental", "broker",
    ],
    "Retail / E-Commerce": [
        "shop", "store", "retail", "ecommerce", "product", "buy", "sale",
        "discount", "cart", "checkout",
    ],
    "Technology / Software": [
        "software", "app", "technology", "tech", "developer", "programming",
        "saas", "cloud", "api", "digital",
    ],
    "Finance / Accounting": [
        "finance", "accounting", "tax", "bookkeeping", "cpa", "investment",
        "banking", "financial", "insurance",
    ],
    "Construction / Trades": [
        "construction", "plumbing", "electrical", "hvac", "roofing",
        "contractor", "building", "renovation", "remodel",
    ],
    "Beauty / Wellness": [
        "salon", "spa", "beauty", "hair", "nail", "massage", "skincare",
        "barber", "wellness", "fitness", "gym", "yoga",
    ],
    "Automotive": [
        "auto", "car", "vehicle", "mechanic", "dealership", "tire",
        "oil change", "body shop", "collision", "repair",
    ],
    "Education / Tutoring": [
        "school", "education", "tutoring", "learning", "course", "class",
        "training", "academy", "university", "college",
    ],
    "Marketing / Advertising": [
        "marketing", "advertising", "seo", "social media", "branding",
        "agency", "creative", "design", "web design",
    ],
    "Travel / Hospitality": [
        "hotel", "travel", "tourism", "resort", "booking", "vacation",
        "hospitality", "bed and breakfast", "inn",
    ],
    "Professional Services": [
        "consulting", "consultant", "advisory", "professional", "services",
        "firm", "solutions", "strategy",
    ],
}

# ── Tech stack signatures ────────────────────────────────────────────────────

TECH_SIGNATURES: dict[str, list[str]] = {
    "WordPress": ["wp-content", "wp-includes", "wordpress"],
    "Shopify": ["cdn.shopify.com", "shopify"],
    "Wix": ["wix.com", "wixsite"],
    "Squarespace": ["squarespace.com", "squarespace-cdn"],
    "React": ["react", "__next", "reactDOM"],
    "Next.js": ["__next", "_next/static"],
    "Vue.js": ["vue.js", "vue.min.js", "__vue"],
    "Angular": ["ng-version", "angular"],
    "Webflow": ["webflow.com", "wf-"],
    "GoDaddy": ["godaddy.com", "secureserver.net"],
}


# ── Helper functions ─────────────────────────────────────────────────────────


def _same_domain(base_url: str, target_url: str) -> bool:
    """Check if target_url is on the same domain as base_url."""
    base_host = urlparse(base_url).netloc.lower().lstrip("www.")
    target_host = urlparse(target_url).netloc.lower().lstrip("www.")
    return base_host == target_host


def _clean_text(text: str) -> str:
    """Strip and collapse whitespace."""
    return re.sub(r"\s+", " ", text).strip()


def _extract_text_content(soup: BeautifulSoup) -> str:
    """Extract visible text content from a page, excluding scripts/styles."""
    for element in soup(["script", "style", "noscript", "iframe"]):
        element.decompose()
    # Remove HTML comments
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()
    return _clean_text(soup.get_text(separator=" "))


async def _fetch_robots_txt(client: httpx.AsyncClient, base_url: str) -> set[str]:
    """Fetch robots.txt and return set of disallowed paths for our user agent."""
    disallowed: set[str] = set()
    try:
        parsed = urlparse(base_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        resp = await client.get(robots_url, timeout=5.0)
        if resp.status_code == 200:
            applies = False
            for line in resp.text.splitlines():
                line = line.strip()
                if line.lower().startswith("user-agent:"):
                    agent = line.split(":", 1)[1].strip().lower()
                    applies = agent == "*" or "silkweb" in agent
                elif applies and line.lower().startswith("disallow:"):
                    path = line.split(":", 1)[1].strip()
                    if path:
                        disallowed.add(path)
    except Exception:
        pass  # If we can't fetch robots.txt, proceed anyway
    return disallowed


def _is_allowed(url: str, disallowed_paths: set[str]) -> bool:
    """Check if a URL is allowed by robots.txt rules."""
    path = urlparse(url).path
    for d in disallowed_paths:
        if path.startswith(d):
            return False
    return True


def _find_priority_pages(soup: BeautifulSoup, base_url: str) -> list[str]:
    """Find priority internal pages to crawl: about, services, contact, menu."""
    priority_patterns = {
        "about": re.compile(r"\babout\b", re.I),
        "services": re.compile(r"\b(?:services?|what-we-do|offerings?)\b", re.I),
        "menu": re.compile(r"\b(?:menu|pricing|rates|packages)\b", re.I),
        "contact": re.compile(r"\bcontact\b", re.I),
    }

    found: dict[str, str] = {}
    all_internal: list[str] = []

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        full_url = urljoin(base_url, href)

        # Skip non-http, anchors, files
        if not full_url.startswith(("http://", "https://")):
            continue
        if not _same_domain(base_url, full_url):
            continue
        # Skip common non-content paths
        if re.search(r"\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|mp4|mp3)$", full_url, re.I):
            continue

        # Remove fragment
        full_url = full_url.split("#")[0]
        if full_url == base_url or full_url == base_url.rstrip("/"):
            continue

        link_text = _clean_text(a_tag.get_text())
        href_lower = href.lower()

        for page_type, pattern in priority_patterns.items():
            if page_type not in found:
                if pattern.search(href_lower) or pattern.search(link_text):
                    found[page_type] = full_url

        if full_url not in all_internal:
            all_internal.append(full_url)

    # Build ordered list: prioritized pages first, then fill up to MAX_PAGES-1
    result: list[str] = []
    for page_type in ["about", "services", "menu", "contact"]:
        if page_type in found and found[page_type] not in result:
            result.append(found[page_type])
            if len(result) >= MAX_PAGES - 1:
                break

    # Fill remaining slots with other internal links
    for url in all_internal:
        if len(result) >= MAX_PAGES - 1:
            break
        if url not in result:
            result.append(url)

    return result


def _extract_business_name(soup: BeautifulSoup) -> str | None:
    """Extract business name from multiple sources."""
    # Try og:site_name first — most reliable for business name
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        return _clean_text(og_site["content"])

    # Try title tag, clean common suffixes
    title = soup.find("title")
    if title and title.string:
        name = title.string.strip()
        # Remove common suffixes like " | Home", " - Welcome", etc.
        name = re.split(r"\s*[|–—-]\s*(?:Home|Welcome|Official|Website|Site)\s*$", name, flags=re.I)[0]
        name = name.strip()
        if name and len(name) < 100:
            return name

    # Try first h1
    h1 = soup.find("h1")
    if h1:
        text = _clean_text(h1.get_text())
        if text and len(text) < 100:
            return text

    return None


def _extract_description(soup: BeautifulSoup) -> str | None:
    """Extract business description."""
    # og:description
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        return _clean_text(og_desc["content"])[:500]

    # meta description
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        return _clean_text(meta_desc["content"])[:500]

    # First paragraph with meaningful content
    for p in soup.find_all("p"):
        text = _clean_text(p.get_text())
        if len(text) > 50:
            return text[:500]

    return None


def _extract_services(soups: list[BeautifulSoup]) -> list[str]:
    """Extract services/products from headings and nav links across pages."""
    services: list[str] = []
    seen: set[str] = set()

    for soup in soups:
        # From h2/h3 headings
        for tag in soup.find_all(["h2", "h3"]):
            text = _clean_text(tag.get_text())
            if text and 3 < len(text) < 80 and text.lower() not in seen:
                seen.add(text.lower())
                services.append(text)

        # From nav links
        for nav in soup.find_all("nav"):
            for a_tag in nav.find_all("a"):
                text = _clean_text(a_tag.get_text())
                if text and 2 < len(text) < 60 and text.lower() not in seen:
                    seen.add(text.lower())
                    services.append(text)

    # Filter out generic navigation items
    generic = {"home", "about", "contact", "blog", "news", "login", "sign up",
               "register", "cart", "search", "faq", "help", "terms", "privacy"}
    services = [s for s in services if s.lower() not in generic]

    return services[:30]  # Cap at 30


def _extract_contact(text_content: str, soups: list[BeautifulSoup]) -> dict:
    """Extract contact information from page text."""
    contact: dict = {}

    # Phone
    phones = PHONE_PATTERN.findall(text_content)
    if phones:
        # Pick the most common phone number (likely the main one)
        contact["phone"] = Counter(phones).most_common(1)[0][0]

    # Email — skip generic/bot emails
    emails = EMAIL_PATTERN.findall(text_content)
    skip_emails = {"noreply", "no-reply", "donotreply", "example", "test", "wix"}
    valid_emails = [
        e for e in emails
        if not any(skip in e.lower() for skip in skip_emails)
    ]
    if valid_emails:
        contact["email"] = Counter(valid_emails).most_common(1)[0][0]

    # Address
    addresses = ADDRESS_PATTERN.findall(text_content)
    if addresses:
        contact["address"] = _clean_text(addresses[0])

    # Also look for mailto: links
    if "email" not in contact:
        for soup in soups:
            mailto = soup.find("a", href=re.compile(r"^mailto:", re.I))
            if mailto:
                email = mailto["href"].replace("mailto:", "").split("?")[0]
                if "@" in email:
                    contact["email"] = email
                    break

    # Also look for tel: links
    if "phone" not in contact:
        for soup in soups:
            tel = soup.find("a", href=re.compile(r"^tel:", re.I))
            if tel:
                phone = tel["href"].replace("tel:", "").strip()
                if phone:
                    contact["phone"] = phone
                    break

    return contact


def _extract_hours(text_content: str) -> str | None:
    """Extract business hours from page text."""
    matches = HOURS_PATTERN.findall(text_content)
    if matches:
        # Return the longest match (most complete)
        return max(matches, key=len)
    return None


def _extract_social(soups: list[BeautifulSoup]) -> dict[str, str]:
    """Extract social media links."""
    social: dict[str, str] = {}

    for soup in soups:
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            for platform, pattern in SOCIAL_PLATFORMS.items():
                if platform not in social and pattern.match(href):
                    # Clean trailing slashes and query params
                    clean = href.split("?")[0].rstrip("/")
                    social[platform] = clean

    return social


def _extract_location(text_content: str, contact: dict) -> dict:
    """Extract location data from address and page content."""
    location: dict = {}

    # Parse from contact address if available
    if "address" in contact:
        addr = contact["address"]
        # Try to extract city, state, zip from end of address
        m = re.search(r"([\w\s]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)", addr)
        if m:
            location["city"] = m.group(1).strip()
            location["state"] = m.group(2)
            location["zip"] = m.group(3)
            # Address is everything before city
            addr_part = addr[:m.start()].rstrip(", ")
            if addr_part:
                location["address"] = addr_part

    # Fallback: look for city/state pattern in text
    if "state" not in location:
        m = re.search(r"([\w\s]+),\s*([A-Z]{2})\s+(\d{5})", text_content)
        if m and m.group(2) in US_STATES:
            location["city"] = m.group(1).strip().split("\n")[-1].strip()
            location["state"] = m.group(2)
            location["zip"] = m.group(3)

    return location


def _extract_schema_org(soups: list[BeautifulSoup]) -> list[dict]:
    """Extract JSON-LD / schema.org structured data."""
    import json as json_module

    schemas: list[dict] = []

    for soup in soups:
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json_module.loads(script.string or "")
                if isinstance(data, list):
                    schemas.extend(data)
                elif isinstance(data, dict):
                    schemas.append(data)
            except (json_module.JSONDecodeError, TypeError):
                continue

    return schemas


def _extract_tech_stack(soups: list[BeautifulSoup], headers: dict | None = None) -> list[str]:
    """Detect technology stack from page content and headers."""
    detected: list[str] = []
    # Combine all page HTML for searching
    combined_html = " ".join(str(soup) for soup in soups).lower()

    for tech, signatures in TECH_SIGNATURES.items():
        for sig in signatures:
            if sig.lower() in combined_html:
                if tech not in detected:
                    detected.append(tech)
                break

    # Check meta generator
    for soup in soups:
        gen = soup.find("meta", attrs={"name": "generator"})
        if gen and gen.get("content"):
            content = gen["content"]
            if content not in detected:
                detected.append(content)

    # Check headers
    if headers:
        powered_by = headers.get("x-powered-by", "")
        if powered_by and powered_by not in detected:
            detected.append(powered_by)
        server = headers.get("server", "")
        if server and server not in detected:
            detected.append(server)

    return detected


def _extract_keywords(text_content: str) -> list[str]:
    """Extract top 20 keywords from page content, excluding stop words."""
    # Tokenize and filter
    words = re.findall(r"[a-zA-Z]{3,}", text_content.lower())
    filtered = [w for w in words if w not in STOP_WORDS and len(w) <= 30]

    # Count and return top 20
    counter = Counter(filtered)
    return [word for word, _ in counter.most_common(20)]


def _extract_logo(soups: list[BeautifulSoup], base_url: str) -> str | None:
    """Extract logo URL from various sources."""
    soup = soups[0] if soups else None
    if not soup:
        return None

    # og:image
    og_img = soup.find("meta", property="og:image")
    if og_img and og_img.get("content"):
        return urljoin(base_url, og_img["content"])

    # apple-touch-icon
    apple = soup.find("link", rel=re.compile(r"apple-touch-icon", re.I))
    if apple and apple.get("href"):
        return urljoin(base_url, apple["href"])

    # Standard favicon
    icon = soup.find("link", rel=re.compile(r"icon", re.I))
    if icon and icon.get("href"):
        return urljoin(base_url, icon["href"])

    # Look for img tags with "logo" in class/id/alt/src
    for img in soup.find_all("img"):
        attrs_text = " ".join([
            img.get("class", [""])[0] if isinstance(img.get("class"), list) else str(img.get("class", "")),
            str(img.get("id", "")),
            str(img.get("alt", "")),
            str(img.get("src", "")),
        ]).lower()
        if "logo" in attrs_text and img.get("src"):
            return urljoin(base_url, img["src"])

    return None


def _detect_menu_pricing_links(soups: list[BeautifulSoup], base_url: str) -> dict[str, str]:
    """Detect links to menu, pricing, services, rates pages."""
    result: dict[str, str] = {}
    patterns = {
        "menu_url": re.compile(r"\b(?:menu|food-menu)\b", re.I),
        "pricing_url": re.compile(r"\b(?:pricing|prices|rates|packages|plans)\b", re.I),
        "services_url": re.compile(r"\b(?:services|what-we-do|offerings)\b", re.I),
    }

    for soup in soups:
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            full_url = urljoin(base_url, href)
            if not _same_domain(base_url, full_url):
                continue
            link_text = _clean_text(a_tag.get_text()).lower()
            href_lower = href.lower()

            for key, pattern in patterns.items():
                if key not in result:
                    if pattern.search(href_lower) or pattern.search(link_text):
                        result[key] = full_url

    return result


def _detect_reviews(soups: list[BeautifulSoup]) -> bool:
    """Check if the site has reviews or testimonials sections."""
    review_patterns = re.compile(
        r"\b(?:review|testimonial|rating|stars?|feedback|what (?:our |)(?:customers?|clients?) say)\b",
        re.I,
    )
    for soup in soups:
        # Check headings
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "section"]):
            text = tag.get_text()
            attrs_text = " ".join([
                str(tag.get("class", "")),
                str(tag.get("id", "")),
            ])
            if review_patterns.search(text) or review_patterns.search(attrs_text):
                return True
    return False


def _classify_industry(keywords: list[str], text_content: str) -> str | None:
    """Classify business industry based on keywords found."""
    text_lower = text_content.lower()
    scores: dict[str, int] = {}

    for industry, terms in INDUSTRY_MAP.items():
        score = 0
        for term in terms:
            if term in text_lower:
                score += 2
            # Also check keywords list
            for kw in keywords:
                if term in kw or kw in term:
                    score += 1
        if score > 0:
            scores[industry] = score

    if scores:
        return max(scores, key=scores.get)
    return None


# ── Main crawl function ──────────────────────────────────────────────────────


async def crawl_business(url: str) -> dict:
    """Crawl a business website and extract structured data for AI indexing.

    Crawls up to 5 pages (homepage + priority internal pages).
    Extracts business name, description, services, contact info, hours,
    social links, location, keywords, schema.org data, and more.

    Args:
        url: The homepage URL of the business to crawl.

    Returns:
        A dict with all extracted structured data.
    """
    # Normalize URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    url = url.rstrip("/")

    result: dict = {
        "url": url,
        "business_name": None,
        "description": None,
        "services": [],
        "contact": {},
        "hours": None,
        "social": {},
        "location": {},
        "keywords": [],
        "industry": None,
        "logo_url": None,
        "menu_url": None,
        "pricing_url": None,
        "services_url": None,
        "schema_org": [],
        "tech_stack": [],
        "has_reviews": False,
        "pages_crawled": 0,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "errors": [],
    }

    try:
        async with httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=REQUEST_TIMEOUT,
        ) as client:
            # Respect robots.txt
            disallowed = await _fetch_robots_txt(client, url)

            # Track first response headers for tech detection
            first_headers: dict | None = None

            # ── Crawl homepage ───────────────────────────────────────────
            soups: list[BeautifulSoup] = []
            all_text = ""
            pages_to_crawl = [url]

            try:
                resp = await client.get(url)
                resp.raise_for_status()
                first_headers = dict(resp.headers)
                soup = BeautifulSoup(resp.text, "lxml")
                soups.append(soup)
                result["pages_crawled"] = 1

                # Extract text from homepage
                all_text = _extract_text_content(BeautifulSoup(resp.text, "lxml"))

                # Find priority pages to crawl
                priority_pages = _find_priority_pages(soup, url)
                pages_to_crawl.extend(priority_pages)

            except httpx.HTTPStatusError as e:
                result["errors"].append(f"Homepage returned {e.response.status_code}")
                return result
            except httpx.RequestError as e:
                result["errors"].append(f"Could not reach {url}: {str(e)}")
                return result

            # ── Crawl additional pages ───────────────────────────────────
            for page_url in pages_to_crawl[1:MAX_PAGES]:
                if not _is_allowed(page_url, disallowed):
                    continue
                try:
                    resp = await client.get(page_url)
                    if resp.status_code == 200:
                        page_soup = BeautifulSoup(resp.text, "lxml")
                        soups.append(page_soup)
                        all_text += " " + _extract_text_content(
                            BeautifulSoup(resp.text, "lxml")
                        )
                        result["pages_crawled"] += 1
                except Exception as e:
                    result["errors"].append(f"Error crawling {page_url}: {str(e)}")
                    continue

            # ── Extract all data ─────────────────────────────────────────
            result["business_name"] = _extract_business_name(soups[0])
            result["description"] = _extract_description(soups[0])
            result["services"] = _extract_services(soups)
            result["contact"] = _extract_contact(all_text, soups)
            result["hours"] = _extract_hours(all_text)
            result["social"] = _extract_social(soups)
            result["location"] = _extract_location(all_text, result["contact"])
            result["schema_org"] = _extract_schema_org(soups)
            result["tech_stack"] = _extract_tech_stack(soups, first_headers)
            result["keywords"] = _extract_keywords(all_text)
            result["logo_url"] = _extract_logo(soups, url)
            result["has_reviews"] = _detect_reviews(soups)
            result["industry"] = _classify_industry(result["keywords"], all_text)

            # Menu/pricing/services links
            links = _detect_menu_pricing_links(soups, url)
            result.update(links)

            # Enrich from schema.org if available
            for schema in result["schema_org"]:
                if isinstance(schema, dict):
                    # Get name from schema if we don't have one
                    if not result["business_name"] and schema.get("name"):
                        result["business_name"] = schema["name"]
                    # Get description
                    if not result["description"] and schema.get("description"):
                        result["description"] = schema["description"][:500]
                    # Get address from schema
                    addr = schema.get("address", {})
                    if isinstance(addr, dict) and not result["location"].get("city"):
                        if addr.get("addressLocality"):
                            result["location"]["city"] = addr["addressLocality"]
                        if addr.get("addressRegion"):
                            result["location"]["state"] = addr["addressRegion"]
                        if addr.get("postalCode"):
                            result["location"]["zip"] = addr["postalCode"]
                        if addr.get("streetAddress"):
                            result["location"]["address"] = addr["streetAddress"]
                    # Get phone from schema
                    if not result["contact"].get("phone") and schema.get("telephone"):
                        result["contact"]["phone"] = schema["telephone"]
                    # Get email from schema
                    if not result["contact"].get("email") and schema.get("email"):
                        result["contact"]["email"] = schema["email"]
                    # Get hours
                    if not result["hours"] and schema.get("openingHours"):
                        hours = schema["openingHours"]
                        if isinstance(hours, list):
                            result["hours"] = ", ".join(hours)
                        elif isinstance(hours, str):
                            result["hours"] = hours

    except Exception as e:
        logger.error(f"Crawl failed for {url}: {e}", exc_info=True)
        result["errors"].append(f"Crawl failed: {str(e)}")

    return result
