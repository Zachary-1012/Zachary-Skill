# TrendHub source implementation matrix

This document separates runtime adapters from the professional source catalog.
Listing a source in the catalog does not mean that a hosted service may fetch it
without the source's approved access method.

## Current runtime inventory

- 38 existing domestic/international adapters remain compatible.
- Bluesky public AppView search is now included in the runtime inventory.
- 10 public RSS/Atom editorial adapters are included.
- GDELT DOC global-news evidence is included and accepts `TRENTHUB_GDELT_QUERY`.
- Apple Podcasts public catalog search is included and accepts `TRENTHUB_APPLE_PODCAST_QUERY`.
- Runtime inventory is therefore 51 unique platform IDs.

## Semantics

RSS adapters return recent editorial publications, ordered by publication time.
They do not invent likes, views, SOV, or platform popularity. GDELT returns
near-real-time global news coverage for a query. Apple returns public catalog
search results. These meanings are carried in each result's `note` and must be
preserved by downstream trend, brand, and campaign analysis.

## Access-boundary work still required

Sources such as YouTube, TikTok, Instagram, X, LinkedIn, WeChat Channels,
marketplaces, Podcast Index, Bloomberg, FT, WSJ and WARC require official API,
OAuth, local user session, or a licensed connector. They must be implemented
behind those contracts and remain `auth_required`/`licensed` until credentials
are present. CAPTCHA, paywall, private-client, and access-control bypasses are
out of scope.

The professional catalog remains the source of truth for those setup modes;
the runtime list is the source of truth for adapters that can be called now.
