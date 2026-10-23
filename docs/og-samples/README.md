# Result image samples

Regenerate from the repository root:

```sh
pnpm tsx --tsconfig scripts/tsconfig.json scripts/render-og-samples.ts
```

The fixtures use a fixed timestamp and placeholder avatars, with no OAuth or
AppView requests. Next's image renderer may download fallback glyphs for emoji
and scripts outside the bundled CMU fonts. Samples cover both domain wordmarks,
1, 2, 5 and 10 winners, handles longer than 60 characters, long display names,
Japanese, Cyrillic and emoji. The static home images are not regenerated.

Text first shrinks to its minimum size, then wraps at grapheme boundaries.
Ellipsis is reserved for text that exceeds the available lines at that size.
