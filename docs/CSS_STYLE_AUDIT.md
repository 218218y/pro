# CSS Style Audit

Budget: `tools/wp_css_style_budget.json`  
File: `css/react_styles.css`

CSS cascade debt ratchet. Counts may stay at or below these limits; lower a limit only after cleanup lands, and raise it only with an explicit product/design reason.

| Metric        | Current | Max | Status | Note                                                                           |
| ------------- | ------: | --: | ------ | ------------------------------------------------------------------------------ |
| important     |     141 | 141 | ok     | Locks the current !important count so cascade exceptions do not grow silently. |
| transitionAll |      22 |  22 | ok     | Locks transition: all usage; new transitions should name concrete properties.  |
| zIndex        |      52 |  52 | ok     | Locks stacking-context pressure until z-index layers are tokenized.            |
| boxShadow     |     116 | 116 | ok     | Locks one-off shadow count until shadows move to shared tokens.                |
