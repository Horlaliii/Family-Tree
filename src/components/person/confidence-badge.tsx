import { CircleCheck, CircleHelp, MessageCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CONFIDENCE_LABELS, type Confidence } from '@/lib/types';

export function ConfidenceBadge({ confidence }: { confidence: Confidence | null | undefined }) {
  if (!confidence) return null;
  switch (confidence) {
    case 'confirmed':
      return (
        <Badge variant="success">
          <CircleCheck aria-hidden /> {CONFIDENCE_LABELS.confirmed}
        </Badge>
      );
    case 'family_account':
      return (
        <Badge variant="accent">
          <MessageCircle aria-hidden /> {CONFIDENCE_LABELS.family_account}
        </Badge>
      );
    default:
      return (
        <Badge variant="warning">
          <CircleHelp aria-hidden /> {CONFIDENCE_LABELS.uncertain}
        </Badge>
      );
  }
}
