import type { ReviewResult } from "./Flow";

export function isApproved(review: ReviewResult): boolean { return review.approved; }
