export interface SpreadsheetFilePayload {
	fileName: string;
	mimeType: string;
	base64: string;
}

export function downloadSpreadsheetFile(file: SpreadsheetFilePayload): void {
	const binary = atob(file.base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}

	const blob = new Blob([bytes], { type: file.mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = file.fileName;
	anchor.click();
	URL.revokeObjectURL(url);
}
