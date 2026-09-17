from pathlib import Path

path = Path('trendhub-mcp/scripts/test.mjs')
text = path.read_text(encoding='utf-8')
replacements = {
    'assert.match(rootLicense, /MIT License/);': 'assert.match(rootLicense, /TrendHub Free Use License 1\\.0/);',
    'assert.match(governance, /MIT permits recipients/);': 'assert.match(governance, /TrendHub Free Use License 1\\.0/);',
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'expected license assertion missing: {old}')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('LICENSE TEST ASSERTIONS UPDATED')
