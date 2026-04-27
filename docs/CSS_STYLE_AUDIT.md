# CSS Style Audit

`css/react_styles.css` is still a large legacy bundle, so this audit acts as a ratchet instead of pretending the file is already perfect.

Current protected baseline:

| Metric | Max allowed |
|---|---:|
| `!important` | 141 |
| `transition: all` | 22 |
| `z-index` declarations | 52 |
| `box-shadow` declarations | 116 |

The goal is simple: UI work may reduce these numbers, but must not increase them. That keeps future button/layout cleanups from turning into CSS whack-a-mole.

Run:

```bash
npm run check:css-style
```
