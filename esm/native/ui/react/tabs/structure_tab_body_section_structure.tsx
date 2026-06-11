import type { ReactElement } from 'react';

import { InlineNotice } from '../components/index.js';
import type { CommitStructural } from './structure_tab_body_section_contracts.js';
import type { StructurePattern } from './structure_tab_saved_models_patterns.js';
import { StructureBodyTypeOptionButton } from './structure_tab_body_section_controls.js';

export function StructureBodyStructureControls(props: {
  isSliding: boolean;
  shouldShowStructureButtons: boolean;
  patterns: StructurePattern[];
  structureSelect: string;
  onCommitStructural: CommitStructural;
}): ReactElement | null {
  if (props.isSliding) {
    return <InlineNotice>בארון הזזה אין חלוקת גוף (רק רוחב/גובה/עומק/דלתות).</InlineNotice>;
  }

  if (!props.shouldShowStructureButtons) {
    return null;
  }

  return (
    <div className="wp-field">
      <div className="wp-field-label">חלוקת גוף הארון</div>
      <div className="type-selector wp-r-type-selector wp-r-structure-selector">
        {props.patterns.map(pattern => {
          const value = JSON.stringify(pattern.structure);
          return (
            <StructureBodyTypeOptionButton
              key={value}
              selected={value === props.structureSelect}
              label={pattern.label}
              title={pattern.label}
              onClick={() => props.onCommitStructural({ structureSelect: value }, 'react:structure:pattern')}
            />
          );
        })}
      </div>
    </div>
  );
}
