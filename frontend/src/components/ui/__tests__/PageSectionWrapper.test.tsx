import { render, screen } from '@testing-library/react';
import { PageSectionWrapper } from '../PageSectionWrapper';

describe('PageSectionWrapper', () => {
	it('renders title and children', () => {
		render(
			<PageSectionWrapper title="Products">
				<p>content</p>
			</PageSectionWrapper>
		);
		expect(screen.getByText('Products')).toBeInTheDocument();
		expect(screen.getByText('content')).toBeInTheDocument();
	});

	it('renders subtitle', () => {
		render(
			<PageSectionWrapper title="Title" subtitle="Some subtitle">
				content
			</PageSectionWrapper>
		);
		expect(screen.getByText('Some subtitle')).toBeInTheDocument();
	});

	it('renders actions slot', () => {
		render(<PageSectionWrapper actions={<button>Add</button>}>content</PageSectionWrapper>);
		expect(screen.getByText('Add')).toBeInTheDocument();
	});

	it('renders without header when no title/subtitle/actions', () => {
		const { container } = render(<PageSectionWrapper>content</PageSectionWrapper>);
		expect(container.querySelectorAll('.MuiStack-root')).toHaveLength(0);
	});
});
