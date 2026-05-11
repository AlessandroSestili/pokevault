#!/usr/bin/env python3
"""
Enriches cards.element from PokéAPI by Pokémon name.
Only updates cards where element = 'colorless' (the default placeholder).
"""
import json, re, time, urllib.request, urllib.error

SUPABASE_URL = "https://fmkpsuqjbysaxdfbiaht.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZta3BzdXFqYnlzYXhkZmJpYWh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA3NDM4NSwiZXhwIjoyMDkzNjUwMzg1fQ.NYZ4-Mm8GWZ9Yswm4s1-JwdsntVFg2g3SqQiapXJaLM"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# PokéAPI type → TCG element
TYPE_MAP = {
    "fire":     "fire",
    "water":    "water",
    "grass":    "grass",
    "electric": "lightning",
    "psychic":  "psychic",
    "ice":      "water",
    "dragon":   "dragon",
    "dark":     "darkness",
    "steel":    "metal",
    "fairy":    "fairy",
    "fighting": "fighting",
    "poison":   "psychic",
    "ghost":    "psychic",
    "rock":     "fighting",
    "ground":   "fighting",
    "bug":      "grass",
    "flying":   "colorless",
    "normal":   "colorless",
}

# Suffixes to strip from card names before looking up on PokéAPI
STRIP_RE = re.compile(
    r'\s+(ex|EX|GX|V|VMAX|VSTAR|Star|Prime|Radiant|δ|TAG\s+TEAM|Prism\s+Star'
    r'|Legend|SP|GL|C|FB|4|Lv\.X|\(.*\))$',
    re.IGNORECASE
)

NON_POKEMON = re.compile(
    r'\b(trainer|item|stadium|supporter|energy|tool|ace\s+spec)\b',
    re.IGNORECASE
)


def fetch_json(url: str, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code in (404, 403):
            return None
        raise
    except Exception:
        return None


def supabase_get(path: str, params: str = ""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def supabase_patch(path: str, match: str, body: dict):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{match}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={**HEADERS, "Prefer": "return=minimal"}, method="PATCH")
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def pokeapi_type(name: str):
    """Returns TCG element string for a Pokémon name, or None if not found."""
    slug = name.lower().strip()
    # replace spaces with hyphens, remove punctuation except hyphens
    slug = re.sub(r"[''.]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9\-]", "", slug)

    candidates = [slug]
    # Also try stripping trailing suffixes from the original name
    stripped = STRIP_RE.sub("", name).strip()
    if stripped != name:
        s2 = re.sub(r"[''.]", "", stripped.lower())
        s2 = re.sub(r"\s+", "-", s2)
        s2 = re.sub(r"[^a-z0-9\-]", "", s2)
        if s2 not in candidates:
            candidates.append(s2)

    for candidate in candidates:
        data = fetch_json(f"https://pokeapi.co/api/v2/pokemon/{candidate}", headers={"User-Agent": "pokevault-enricher/1.0"})
        if data and "types" in data:
            primary = data["types"][0]["type"]["name"]
            return TYPE_MAP.get(primary, "colorless")
        time.sleep(0.05)

    return None


def main():
    print("Fetching cards with element='colorless'...")
    cards = supabase_get(
        "cards",
        "element=eq.colorless&select=id,name&limit=1000"
    )
    print(f"Found {len(cards)} cards to enrich.")

    updated = 0
    skipped = 0
    not_found = 0

    for i, card in enumerate(cards):
        cid  = card["id"]
        name = card["name"]

        if NON_POKEMON.search(name):
            skipped += 1
            continue

        element = pokeapi_type(name)

        if element is None or element == "colorless":
            not_found += 1
            print(f"  [{i+1}/{len(cards)}] NOT FOUND: {name}")
            continue

        status = supabase_patch("cards", f"id=eq.{cid}", {"element": element})
        updated += 1
        print(f"  [{i+1}/{len(cards)}] {name} → {element}")

        # Polite rate limiting: 20 req/s max on PokéAPI free tier
        time.sleep(0.1)

    print(f"\nDone. Updated: {updated} | Skipped (non-Pokémon): {skipped} | Not found: {not_found}")


if __name__ == "__main__":
    main()
