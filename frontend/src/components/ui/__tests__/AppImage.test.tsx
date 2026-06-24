import { fireEvent, render, screen } from '@testing-library/react';
import { AppImage } from '../AppImage';
import { ImageLightboxProvider } from '../ImageLightbox';

function renderWithLightbox(ui: React.ReactElement) {
	return render(<ImageLightboxProvider>{ui}</ImageLightboxProvider>);
}

describe('AppImage', () => {
	it('opens lightbox with gallery slider on click', () => {
		renderWithLightbox(
			<AppImage
				src="https://example.com/1.jpg"
				gallery={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
				galleryIndex={0}
				alt="Preview"
			/>
		);

		fireEvent.click(screen.getByRole('img', { name: 'Preview' }));

		expect(document.querySelector('.yarl__container')).toBeInTheDocument();
		expect(document.querySelector('.yarl__thumbnails')).toBeInTheDocument();
	});
});
