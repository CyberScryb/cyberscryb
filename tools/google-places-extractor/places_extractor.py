"""
Google Places Data Extractor
=============================
Searches Google Places API for businesses matching a query and extracts:
  - Business Name
  - Phone Number
  - Website URL
  - HTTPS status (flagged if missing)
  - Load time in seconds (flagged if > 5s)

Results are written to a timestamped CSV file.

SETUP
-----
1. Install dependencies (see README or run the install command below).
2. Paste your Google Places API key into the GOOGLE_API_KEY variable below.
3. Run: python places_extractor.py
"""

import csv
import os
import sys
import time
import datetime
import requests

# =============================================================================
# PASTE YOUR GOOGLE PLACES API KEY HERE
# =============================================================================
GOOGLE_API_KEY = "YOUR_API_KEY_HERE"
# =============================================================================

PLACES_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

LOAD_TIME_THRESHOLD = 5.0  # seconds
REQUEST_TIMEOUT = 10        # seconds for website probe requests


def search_places(query: str) -> list[dict]:
    """Return all place results for a query, following next_page_token pagination."""
    results = []
    params = {
        "query": query,
        "key": GOOGLE_API_KEY,
    }

    while True:
        response = requests.get(PLACES_SEARCH_URL, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        status = data.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            print(f"[ERROR] Places API returned status: {status}")
            print(f"        Message: {data.get('error_message', 'No message provided.')}")
            sys.exit(1)

        results.extend(data.get("results", []))

        next_token = data.get("next_page_token")
        if not next_token:
            break

        # Google requires a short delay before using a next_page_token
        time.sleep(2)
        params = {"pagetoken": next_token, "key": GOOGLE_API_KEY}

    return results


def get_place_details(place_id: str) -> dict:
    """Fetch phone number and website for a given place_id."""
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,website",
        "key": GOOGLE_API_KEY,
    }
    response = requests.get(PLACES_DETAILS_URL, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    data = response.json()

    result = data.get("result", {})
    return {
        "phone": result.get("formatted_phone_number", "N/A"),
        "website": result.get("website", "N/A"),
    }


def probe_website(url: str) -> dict:
    """
    Check a website URL for:
      - Whether it uses HTTPS
      - How long it takes to load (first byte, with redirect following)

    Returns a dict with keys: has_https, load_time, https_flag, load_flag, error
    """
    if url == "N/A":
        return {
            "has_https": "N/A",
            "load_time": "N/A",
            "https_flag": "N/A",
            "load_flag": "N/A",
            "error": "No website listed",
        }

    has_https = url.lower().startswith("https://")

    try:
        start = time.monotonic()
        resp = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; PlacesExtractor/1.0)"},
        )
        load_time = round(time.monotonic() - start, 3)

        # After redirects, recheck whether the final URL is HTTPS
        final_url = resp.url
        has_https = final_url.lower().startswith("https://")

        https_flag = "" if has_https else "FLAG: No HTTPS"
        load_flag = "" if load_time <= LOAD_TIME_THRESHOLD else f"FLAG: Slow ({load_time}s)"

        return {
            "has_https": has_https,
            "load_time": load_time,
            "https_flag": https_flag,
            "load_flag": load_flag,
            "error": "",
        }

    except requests.exceptions.Timeout:
        return {
            "has_https": has_https,
            "load_time": f"> {REQUEST_TIMEOUT}s (timeout)",
            "https_flag": "" if has_https else "FLAG: No HTTPS",
            "load_flag": "FLAG: Timeout (> 10s)",
            "error": "Request timed out",
        }
    except requests.exceptions.SSLError as exc:
        return {
            "has_https": False,
            "load_time": "N/A",
            "https_flag": "FLAG: SSL Error",
            "load_flag": "N/A",
            "error": f"SSL error: {exc}",
        }
    except requests.exceptions.RequestException as exc:
        return {
            "has_https": has_https,
            "load_time": "N/A",
            "https_flag": "" if has_https else "FLAG: No HTTPS",
            "load_flag": "N/A",
            "error": str(exc),
        }


def write_csv(rows: list[dict], filename: str) -> None:
    """Write extracted data to a CSV file."""
    fieldnames = [
        "Business Name",
        "Phone Number",
        "Website URL",
        "Has HTTPS",
        "Load Time (s)",
        "HTTPS Flag",
        "Load Time Flag",
        "Error",
    ]
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    if GOOGLE_API_KEY == "YOUR_API_KEY_HERE":
        print("[ERROR] You must set your Google Places API key in the GOOGLE_API_KEY variable.")
        print("        Open places_extractor.py and replace 'YOUR_API_KEY_HERE' with your key.")
        sys.exit(1)

    query = input("Enter your search term (e.g., 'Commercial Roofers in Idaho'): ").strip()
    if not query:
        print("[ERROR] Search term cannot be empty.")
        sys.exit(1)

    print(f"\nSearching Google Places for: {query!r}")
    places = search_places(query)
    total = len(places)
    print(f"Found {total} result(s). Fetching details and probing websites...\n")

    rows = []
    for i, place in enumerate(places, start=1):
        name = place.get("name", "N/A")
        place_id = place.get("place_id", "")

        print(f"  [{i}/{total}] {name}")

        details = get_place_details(place_id)
        probe = probe_website(details["website"])

        rows.append(
            {
                "Business Name": name,
                "Phone Number": details["phone"],
                "Website URL": details["website"],
                "Has HTTPS": probe["has_https"],
                "Load Time (s)": probe["load_time"],
                "HTTPS Flag": probe["https_flag"],
                "Load Time Flag": probe["load_flag"],
                "Error": probe["error"],
            }
        )

        # Be polite to the Places API — avoid hitting rate limits
        time.sleep(0.2)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_query = "".join(c if c.isalnum() else "_" for c in query)[:40]
    filename = f"results_{safe_query}_{timestamp}.csv"

    write_csv(rows, filename)
    print(f"\nDone! Results saved to: {filename}")

    flagged = [
        r for r in rows if r["HTTPS Flag"].startswith("FLAG") or r["Load Time Flag"].startswith("FLAG")
    ]
    print(f"Total results : {total}")
    print(f"Flagged sites : {len(flagged)}")


if __name__ == "__main__":
    main()
