import type { AppContainer, BuilderCallable } from '../../../types';

type StackSplitFrameTopology = 'inactive' | 'unified' | 'separate';

type StackSplitFrameFeedbackState = {
  topology: StackSplitFrameTopology;
};

export type StackSplitFrameFeedbackArgs = {
  App: AppContainer;
  stackSplitActive: boolean;
  stackSplitUnifiedFrame: boolean;
  removablePartInteractionActive: boolean;
  showToast: BuilderCallable | null | undefined;
};

const feedbackStateByApp = new WeakMap<object, StackSplitFrameFeedbackState>();

const STACK_SPLIT_INTERACTION_SEPARATE_MESSAGE =
  'הארון על ארון נבנה זמנית עם שתי מסגרות נפרדות כדי לאפשר הסרת דופן מהארון העליון או התחתון בנפרד.';
const STACK_SPLIT_STRUCTURAL_SEPARATE_MESSAGE =
  'הארון על ארון נבנה עם שתי מסגרות נפרדות בגלל שינוי במידות או במבנה בין החלק העליון לתחתון.';
const STACK_SPLIT_UNIFIED_MESSAGE =
  'הארון על ארון חזר למסגרת אחת, כי אין כעת שינוי שמחייב הפרדה בין החלק העליון לתחתון.';

function resolveStackSplitFrameTopology(args: StackSplitFrameFeedbackArgs): StackSplitFrameTopology {
  if (!args.stackSplitActive) return 'inactive';
  return args.stackSplitUnifiedFrame ? 'unified' : 'separate';
}

export function resolveStackSplitFrameTransitionMessage(args: {
  previous: StackSplitFrameTopology | null;
  next: StackSplitFrameTopology;
  removablePartInteractionActive: boolean;
}): string | null {
  if (args.previous === args.next) return null;

  if (args.next === 'separate') {
    if (args.previous == null && !args.removablePartInteractionActive) return null;
    return args.removablePartInteractionActive
      ? STACK_SPLIT_INTERACTION_SEPARATE_MESSAGE
      : STACK_SPLIT_STRUCTURAL_SEPARATE_MESSAGE;
  }

  if (args.next === 'unified' && args.previous === 'separate') {
    return STACK_SPLIT_UNIFIED_MESSAGE;
  }

  return null;
}

export function notifyStackSplitFrameTopologyTransition(args: StackSplitFrameFeedbackArgs): string | null {
  const owner = args.App && typeof args.App === 'object' ? (args.App as object) : null;
  if (!owner) return null;

  const next = resolveStackSplitFrameTopology(args);
  const previous = feedbackStateByApp.get(owner)?.topology ?? null;
  feedbackStateByApp.set(owner, { topology: next });

  const message = resolveStackSplitFrameTransitionMessage({
    previous,
    next,
    removablePartInteractionActive: !!args.removablePartInteractionActive,
  });
  if (!message || typeof args.showToast !== 'function') return message;

  try {
    args.showToast(message, 'info');
  } catch (error) {
    // Feedback is best-effort and must never make a successful wardrobe build fail.
    void error;
  }
  return message;
}
