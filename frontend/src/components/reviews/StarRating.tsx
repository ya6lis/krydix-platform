import { Box } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';

interface StarRatingProps {
	rating: number;
	size?: number;
	interactive?: boolean;
	onChange?: (rating: number) => void;
}

export function StarRating({ rating, size = 14, interactive = false, onChange }: StarRatingProps) {
	return (
		<Box
			sx={{
				display: 'inline-flex',
				gap: 0.25,
				color: tokens.amber,
				cursor: interactive ? 'pointer' : 'default',
			}}
		>
			{Array.from({ length: 5 }, (_, i) => {
				const diff = rating - i;
				const icon = diff >= 1 ? Icons.star : diff >= 0.5 ? Icons.starHalf : Icons.starEmpty;
				return (
					<Box
						key={i}
						component={interactive ? 'button' : 'span'}
						type={interactive ? 'button' : undefined}
						onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
						sx={{
							p: 0,
							border: 0,
							bgcolor: 'transparent',
							color: 'inherit',
							cursor: interactive ? 'pointer' : 'default',
							lineHeight: 1,
						}}
					>
						<FontAwesomeIcon icon={icon} style={{ fontSize: size }} />
					</Box>
				);
			})}
		</Box>
	);
}
