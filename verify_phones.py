import os
import csv
import re
from collections import defaultdict

FOLDER = r"c:\Users\RD Models\Desktop\yogi\meta ads screper\Facebook Ads Scraper\Meta Ads Library scrape 1"

def clean_phone(raw):
    """Extract and normalize phone number to 10-digit Indian mobile."""
    if not raw:
        return None
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', str(raw))
    
    if not digits:
        return None

    # Case 1: starts with 91 and total length is 12 -> strip 91
    if len(digits) == 12 and digits.startswith('91'):
        core = digits[2:]
    # Case 2: starts with 0 and total length is 11 -> strip leading 0
    elif len(digits) == 11 and digits.startswith('0'):
        core = digits[1:]
    # Case 3: exactly 10 digits
    elif len(digits) == 10:
        core = digits
    # Reject everything else
    else:
        return None

    # Must be exactly 10 digits now
    if len(core) != 10:
        return None

    # Indian mobile numbers start with 6, 7, 8, or 9
    if core[0] not in '6789':
        return None

    return core

# ---- Scan all files ----
all_phones_raw = {}           # phone_10digit -> set of files it appeared in
per_file_stats = {}

files = [f for f in os.listdir(FOLDER) if f.endswith('.csv')]
files.sort()

total_rows = 0
rows_with_phone = 0
invalid_length = 0
non_india_code = 0
invalid_start = 0
duplicate_count = 0

seen_phones = set()
new_phones_per_file = {}

for fname in files:
    fpath = os.path.join(FOLDER, fname)
    file_phones = set()
    file_total = 0
    file_valid = 0
    file_new = 0

    try:
        with open(fpath, encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            
            # Find phone column
            phone_col = None
            for h in headers:
                if h and 'phone' in h.lower():
                    phone_col = h
                    break
            
            if not phone_col:
                print(f"  [SKIP] No phone column in: {fname} (headers: {headers[:5]})")
                per_file_stats[fname] = {'total': 0, 'valid': 0, 'new': 0, 'phone_col': 'NOT FOUND'}
                continue

            for row in reader:
                file_total += 1
                raw = row.get(phone_col, '').strip()
                
                if not raw:
                    continue
                
                rows_with_phone += 1
                
                # Check for non-India country codes BEFORE cleaning
                digits_only = re.sub(r'\D', '', raw)
                
                # Detect non-India: starts with + but not +91
                if re.match(r'^\+(?!91)', raw.strip()):
                    non_india_code += 1
                    continue
                
                # Detect if it's a country code that's NOT 91 (e.g., 1XXXXXXXXXX, 44XXXXXXXXXX etc.)
                # Only check if length > 12 or specific patterns
                if len(digits_only) > 12:
                    non_india_code += 1
                    continue
                
                cleaned = clean_phone(raw)
                
                if cleaned is None:
                    invalid_length += 1
                    continue
                
                file_phones.add(cleaned)
                file_valid += 1
                
                if cleaned not in seen_phones:
                    seen_phones.add(cleaned)
                    file_new += 1
                    if cleaned not in all_phones_raw:
                        all_phones_raw[cleaned] = set()
                    all_phones_raw[cleaned].add(fname)
                else:
                    duplicate_count += 1

        per_file_stats[fname] = {
            'total': file_total,
            'valid': len(file_phones),
            'new': file_new,
            'phone_col': phone_col
        }
        total_rows += file_total

    except Exception as e:
        print(f"  [ERROR] {fname}: {e}")

# ---- Print Results ----
print("\n" + "="*70)
print("  PHONE NUMBER VERIFICATION REPORT")
print("="*70)
print(f"\n{'FILE':<35} {'ROWS':>6} {'VALID':>6} {'NEW UNIQUE':>10}")
print("-"*60)

cumulative = 0
for fname in files:
    s = per_file_stats.get(fname, {})
    if not s:
        continue
    cumulative += s.get('new', 0)
    print(f"{fname:<35} {s.get('total',0):>6,} {s.get('valid',0):>6,} {s.get('new',0):>10,}  (running: {cumulative:,})")

print("-"*60)
print(f"\n{'Total rows scanned:':<35} {total_rows:>10,}")
print(f"{'Rows with any phone value:':<35} {rows_with_phone:>10,}")
print(f"{'Rejected (non-India code):':<35} {non_india_code:>10,}")
print(f"{'Rejected (invalid length/format):':<35} {invalid_length:>10,}")
print(f"{'Duplicate across files:':<35} {duplicate_count:>10,}")
print(f"\n{'*** UNIQUE VALID INDIAN NUMBERS ***':<35} {len(all_phones_raw):>10,}")
print("="*70)

# Show top 5 numbers found in multiple files
multi_file = {p: fs for p, fs in all_phones_raw.items() if len(fs) > 1}
if multi_file:
    print(f"\nNumbers appearing in MULTIPLE files: {len(multi_file):,}")
    for p, fs in list(multi_file.items())[:5]:
        print(f"  +91{p}  ->  {', '.join(sorted(fs))}")
