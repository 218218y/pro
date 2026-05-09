# CSS Style Audit

Budget: `tools/wp_css_style_budget.json`  
File: `css/react_styles.css`

CSS cascade debt ratchet. Counts may stay at or below these limits; z-index declarations must use shared --wp-z-\* layer tokens so stacking order stays reviewable.

| Metric          | Current | Max | Status | Note                                                                                             |
| --------------- | ------: | --: | ------ | ------------------------------------------------------------------------------------------------ |
| important       |       1 |   1 | ok     | Locks the current !important count so cascade exceptions do not grow silently.                   |
| transitionAll   |       0 |   0 | ok     | Locks transition: all usage; new transitions should name concrete properties.                    |
| zIndex          |      41 |  41 | ok     | Locks the total z-index declaration count while layering is centralized through tokens.          |
| boxShadow       |       0 |   0 | ok     | Requires every non-none box-shadow declaration to use a shared shadow token.                     |
| zIndexTokenless |       0 |   0 | ok     | Requires every z-index declaration to use a shared --wp-z-\* token instead of raw magic numbers. |
