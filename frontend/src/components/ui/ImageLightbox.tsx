import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface ImageLightboxState {
	open: boolean;
	slides: { src: string }[];
	index: number;
}

interface ImageLightboxContextValue {
	openLightbox: (images: string[], startIndex?: number) => void;
	closeLightbox: () => void;
}

const ImageLightboxContext = createContext<ImageLightboxContextValue | null>(null);

const INITIAL_STATE: ImageLightboxState = {
	open: false,
	slides: [],
	index: 0,
};

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<ImageLightboxState>(INITIAL_STATE);

	const openLightbox = useCallback((images: string[], startIndex = 0) => {
		const slides = images.filter(Boolean).map((src) => ({ src }));
		if (slides.length === 0) return;

		setState({
			open: true,
			slides,
			index: Math.min(Math.max(startIndex, 0), slides.length - 1),
		});
	}, []);

	const closeLightbox = useCallback(() => {
		setState(INITIAL_STATE);
	}, []);

	const contextValue = useMemo(
		() => ({ openLightbox, closeLightbox }),
		[closeLightbox, openLightbox],
	);

	const hasMultiple = state.slides.length > 1;

	return (
		<ImageLightboxContext.Provider value={contextValue}>
			{children}
			<Lightbox
				open={state.open}
				close={closeLightbox}
				index={state.index}
				slides={state.slides}
				plugins={hasMultiple ? [Thumbnails] : []}
				carousel={{ finite: false }}
				controller={{ closeOnBackdropClick: true }}
				thumbnails={hasMultiple ? { border: 2, gap: 8, padding: 4, imageFit: 'cover' } : undefined}
				on={{
					view: ({ index }) => setState((prev) => ({ ...prev, index })),
				}}
				styles={{
					container: { backgroundColor: 'rgba(15, 20, 26, 0.92)' },
				}}
			/>
		</ImageLightboxContext.Provider>
	);
}

export function useImageLightbox(): ImageLightboxContextValue {
	const ctx = useContext(ImageLightboxContext);
	if (!ctx) {
		throw new Error('useImageLightbox must be used inside ImageLightboxProvider');
	}
	return ctx;
}
