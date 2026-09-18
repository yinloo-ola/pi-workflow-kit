# Progress: up-adventure-milestone-gifts (sample)

<!-- Ephemeral visual-verification artifact for the digest-rendering feature:
     open this file in a markdown preview — the Flow below must render as
     labeled bullets, not the run-on paragraph of the original. Disposed with
     the topic folder at finalize. Content is the real up_adventure digest. -->

Design: docs/plans/<date>-<topic>/up-adventure-design.md
Branch: <branch>
Setup: n/a
Started: 2026-09-18T00:00:00+08:00
Last updated: 2026-09-18T00:00:00+08:00
Feature phase: done

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Per-city milestone gift resolution | — | abc1234 |
| 2 | ✅ | city_gift_ids config wiring | — | abc1234 |
| 3 | ✅ | Displayed reward matches granted reward | — | abc1234 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Per-city milestone gift resolution | `CrossedMilestoneTiers` now resolves the gift via `tier.RewardForCity(city.ID())`, so each city grants its own gift. | |
| 2 | city_gift_ids config wiring | The resolved gift id comes from yaml's `city_gift_ids`; a gift_unlock tier with gift_id 0 missing a configured city fails config load at startup. | |
| 3 | Displayed reward matches granted reward | `buildMilestoneProgress` resolves through the same `RewardForCity`, so the card shows what is actually granted. | |

## Deviation records

## Code digest

### Summary

Milestone tier rewards are now per-city: crossing a tier grants that city's own gift from `city_gift_ids` instead of the tier's fixed gift, and the milestone progress card resolves through the same path so display and grant can't drift. Config is validated at startup — a per-city tier missing its city entry fails load, not a later grant.

### Flow

- **Spine** — gift-send crosses tier 1's threshold -> [R1] `CrossedMilestoneTiers` resolves `tier.RewardForCity(city.ID())` -> `claimAndSend` grants that city's own gift via `UnlockOrExtendPrivilegeGift` -> `notifyMilestoneTier` resolves the same per-city reward for the crossing IM's text -> [R2]/[R3] the resolved gift id comes from yaml's `city_gift_ids` (prod: 7 real gifts; dev: one verified gift reused for every city)
- **Branches**
  - tier has a fixed non-zero gift_id (any tier 2-4, or a non-per-city gift_unlock tier like test.yaml's) -> `RewardForCity` returns `Reward()` unchanged — was: every tier already worked this way before R1
  - gift_unlock tier with gift_id 0 and `city_gift_ids` missing an entry for a configured city -> config load fails at startup, not silently at grant time
  - `TourMapInfo`'s milestone progress card -> `buildMilestoneProgress` also resolves via `RewardForCity(cityID)` [R1], so the displayed reward matches what gets granted
- **Side effects** — reads: `config/up_adventure_2026*.yaml`'s `city_gift_ids` · writes: the shared privilege-gift Redis key (`UnlockOrExtendPrivilegeGift`), the reward-log claim rows

### Gotchas

- The dev config reuses one verified gift for every city — a cross-city drift in dev is config, not code
- The privilege-gift Redis key is shared with the existing gift flow; claims are idempotent through the reward-log rows

### Key files

- `config/up_adventure_2026*.yaml` — `city_gift_ids` now carries the per-city gift mapping (7 real gifts in prod)
