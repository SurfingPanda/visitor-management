import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Capture options shared by both exports. A higher pixel ratio keeps the QR and
// text crisp; cacheBust avoids stale cached images (logo/signatures).
const shot = (node, backgroundColor) =>
    toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor });

function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

/**
 * Download a DOM node as a transparent-corner PNG.
 */
export async function downloadPng(node, filename) {
    if (!node) return;
    const dataUrl = await shot(node);
    triggerDownload(dataUrl, `${filename}.png`);
}

/**
 * Download a DOM node as a PDF sized exactly to the card (white background).
 */
export async function downloadPdf(node, filename) {
    if (!node) return;
    const dataUrl = await shot(node, '#ffffff');

    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    const pdf = new jsPDF({
        orientation: img.width >= img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
    pdf.save(`${filename}.pdf`);
}
