#!/usr/bin/env python3
"""
Second-pass enrichment: handles prefixed card names (Giovanni's X, Dark X,
Hisuian X, Paldean X, etc.) and form-variant Pokémon.
Only touches cards still at element='colorless'.
"""
import json, re, time, urllib.request, urllib.error

SUPABASE_URL = "https://fmkpsuqjbysaxdfbiaht.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZta3BzdXFqYnlzYXhkZmJpYWh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA3NDM4NSwiZXhwIjoyMDkzNjUwMzg1fQ.NYZ4-Mm8GWZ9Yswm4s1-JwdsntVFg2g3SqQiapXJaLM"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

TYPE_MAP = {
    "fire": "fire", "water": "water", "grass": "grass",
    "electric": "lightning", "psychic": "psychic", "ice": "water",
    "dragon": "dragon", "dark": "darkness", "steel": "metal",
    "fairy": "fairy", "fighting": "fighting", "poison": "psychic",
    "ghost": "psychic", "rock": "fighting", "ground": "fighting",
    "bug": "grass", "flying": "colorless", "normal": "colorless",
}

# Form suffixes to try for Pokémon that PokéAPI only serves as a form slug
FORM_SUFFIXES = [
    "-incarnate", "-solo", "-midday", "-baile", "-red-meteor",
    "-male", "-average", "-altered", "-land",
]

# Patterns to extract base Pokémon name from card name prefixes
PREFIX_RE = re.compile(
    r"^(?:"
    r"(?:Giovanni|Misty|Brock|Lt\.\s*Surge|Erika|Koga|Blaine|Sabrina|Janine"
    r"|Giovanni|Norman|Rika|Roark|Shauntal|Mela|Larry|Tulip|N|Hop|Iono"
    r"|Team\s+Rocket|Team\s+Magma|Team\s+Aqua|Cipher|Team\s+Galactic"
    r")\s*'s?\s+"
    r"|Dark\s+|Light\s+|Rocket's\s+|Shadow\s+"
    r")",
    re.IGNORECASE
)

# Regional prefixes → PokéAPI suffix
REGIONAL_RE = re.compile(
    r"^(Hisuian|Paldean|Galarian|Alolan|Kantonian)\s+(.+)",
    re.IGNORECASE
)
REGIONAL_SUFFIX = {
    "hisuian": "hisui", "paldean": "paldea",
    "galarian": "galar", "alolan": "alola", "kantonian": "kantonian",
}

# TCG suffixes to strip
STRIP_RE = re.compile(
    r"\s+(ex|EX|GX|V|VMAX|VSTAR|Star|Prime|Radiant|Lv\.\d+|TAG\s+TEAM"
    r"|Prism\s+Star|Legend|SP|GL|C|FB|\(.*?\))$",
    re.IGNORECASE
)


def fetch_pokeapi(slug: str):
    url = f"https://pokeapi.co/api/v2/pokemon/{slug}"
    req = urllib.request.Request(url, headers={"User-Agent": "pokevault-enricher/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None


def to_slug(name: str) -> str:
    s = re.sub(r"[''.]", "", name.lower().strip())
    s = re.sub(r"\s+", "-", s)
    return re.sub(r"[^a-z0-9\-]", "", s)


def get_element(name: str):
    """Returns TCG element or None. Tries multiple slug candidates."""
    # Strip TCG card suffixes
    base = STRIP_RE.sub("", name).strip()

    candidates = []

    # Regional form?
    m = REGIONAL_RE.match(base)
    if m:
        region_key = m.group(1).lower()
        pokemon_name = m.group(2).strip()
        suffix = REGIONAL_SUFFIX.get(region_key, region_key)
        candidates.append(to_slug(pokemon_name) + "-" + suffix)
        candidates.append(to_slug(pokemon_name))  # fallback

    # Owner prefix (Giovanni's X, Dark X, etc.)
    stripped = PREFIX_RE.sub("", base).strip()
    if stripped != base:
        candidates.append(to_slug(stripped))

    # Always try the base slug too
    candidates.append(to_slug(base))

    for slug in candidates:
        if not slug:
            continue
        data = fetch_pokeapi(slug)
        if data and "types" in data:
            primary = data["types"][0]["type"]["name"]
            return TYPE_MAP.get(primary, "colorless")
        time.sleep(0.05)

        # For form-variant Pokémon, try appending form suffixes
        for fsuffix in FORM_SUFFIXES:
            data = fetch_pokeapi(slug + fsuffix)
            if data and "types" in data:
                primary = data["types"][0]["type"]["name"]
                return TYPE_MAP.get(primary, "colorless")
            time.sleep(0.05)

    return None


def supabase_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def supabase_patch(path, match, body):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{match}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="PATCH"
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


NON_POKEMON = re.compile(
    r"\b(trainer|item|stadium|supporter|energy|tool|ace\s+spec"
    r"|professor|pokégear|potion|pokedex|court|cape|catcher"
    r"|scenario|vitality)\b",
    re.IGNORECASE
)

# Known trainer/character names that won't be in PokéAPI
KNOWN_TRAINERS = {
    "larry", "mela", "norman", "parasol lady", "roark", "shauntal",
    "rika", "tulip", "hop", "misty", "brock", "erika", "koga",
    "blaine", "sabrina", "janine", "giovanni",
}


def is_trainer(name: str) -> bool:
    if NON_POKEMON.search(name):
        return True
    lower = name.lower().strip()
    for t in KNOWN_TRAINERS:
        if lower == t or lower.startswith(t + "'s ") or lower.startswith(t + " "):
            # If it's just the trainer name (no Pokémon after), skip
            # But "Giovanni's Nidoqueen" should NOT be skipped
            pass
    return False


def main():
    cards = supabase_get("cards", "element=eq.colorless&select=id,name&limit=1000")
    print(f"Remaining colorless: {len(cards)}")

    updated = 0
    still_missing = []

    for i, card in enumerate(cards):
        cid  = card["id"]
        name = card["name"]

        if NON_POKEMON.search(name):
            continue

        element = get_element(name)

        if element is None or element == "colorless":
            still_missing.append(name)
            print(f"  [{i+1}] STILL NOT FOUND: {name}")
            continue

        supabase_patch("cards", f"id=eq.{cid}", {"element": element})
        updated += 1
        print(f"  [{i+1}] {name} → {element}")
        time.sleep(0.05)

    print(f"\nUpdated: {updated}")
    print(f"Still unresolved ({len(still_missing)}):")
    for n in still_missing:
        print(f"  - {n}")


if __name__ == "__main__":
    main()
