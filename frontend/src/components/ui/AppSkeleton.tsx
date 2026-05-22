import { Skeleton, SkeletonProps } from '@mui/material';

export interface AppSkeletonProps extends SkeletonProps {
	variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

/** Loading placeholder with the shimmer animation (Components.html → Skeleton). */
export function AppSkeleton({ variant = 'text', animation = 'wave', ...props }: AppSkeletonProps) {
	return <Skeleton variant={variant} animation={animation} {...props} />;
}
