interface LightboxSlide {
	src: string;
}

interface LightboxProps {
	open: boolean;
	slides: LightboxSlide[];
	index: number;
	plugins?: unknown[];
}

export default function Lightbox({ open, slides, index, plugins = [] }: LightboxProps) {
	if (!open) return null;

	const hasThumbnails = plugins.length > 0;

	return (
		<div className="yarl__container" data-testid="image-lightbox">
			<img src={slides[index]?.src} alt="" />
			{hasThumbnails ? <div className="yarl__thumbnails" /> : null}
		</div>
	);
}
