import { Box, BoxProps } from '@mui/material';
import { useImageLightbox } from './ImageLightbox';

export interface AppImageProps extends Omit<BoxProps<'img'>, 'component'> {
	src: string;
	alt?: string;
	gallery?: string[];
	galleryIndex?: number;
	zoomable?: boolean;
}

export function AppImage({
	src,
	alt = '',
	gallery,
	galleryIndex,
	zoomable = true,
	onClick,
	sx,
	...props
}: AppImageProps) {
	const { openLightbox } = useImageLightbox();

	const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
		onClick?.(event);
		if (!zoomable || !src || event.defaultPrevented) return;

		event.preventDefault();
		event.stopPropagation();

		const images = gallery && gallery.length > 0 ? gallery.filter(Boolean) : [src];
		const resolvedIndex =
			galleryIndex ??
			(gallery && gallery.length > 0 ? gallery.findIndex((item) => item === src) : 0);

		openLightbox(images, Math.max(resolvedIndex, 0));
	};

	return (
		<Box
			component="img"
			src={src}
			alt={alt}
			onClick={handleClick}
			sx={{
				...(zoomable && src ? { cursor: 'zoom-in' } : {}),
				...sx,
			}}
			{...props}
		/>
	);
}
