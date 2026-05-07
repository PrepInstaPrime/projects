import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Renders a DOM node to a multi-page A4 PDF and triggers download.
 * Uses the usual html2canvas + jsPDF vertical slice pattern.
 */
export async function downloadReportPdf(
  element,
  filename = 'report.pdf',
  {
    scale,
    marginMm = 12,
    imageType = 'png', // 'png' (best quality) | 'jpeg' (smaller)
    jpegQuality = 0.98,
    pdfCompress = false,
  } = {},
) {
  const effectiveScale =
    scale ?? Math.max(3, Math.ceil((window.devicePixelRatio || 1) * 2))

  const canvas = await html2canvas(element, {
    scale: effectiveScale,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
    // Helps when the element is scrollable / taller than viewport
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const imgFormat = imageType === 'jpeg' ? 'JPEG' : 'PNG'
  const imgData =
    imageType === 'jpeg'
      ? canvas.toDataURL('image/jpeg', jpegQuality)
      : canvas.toDataURL('image/png')

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: pdfCompress,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const marginX = marginMm
  const marginY = marginMm
  const usablePageHeight = pageHeight - 2 * marginY

  const imgWidth = pageWidth - 2 * marginX
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = marginY

  pdf.addImage(imgData, imgFormat, marginX, position, imgWidth, imgHeight, undefined, 'NONE')
  heightLeft -= usablePageHeight

  while (heightLeft > 0) {
    position = marginY - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, imgFormat, marginX, position, imgWidth, imgHeight, undefined, 'NONE')
    heightLeft -= usablePageHeight
  }

  pdf.save(filename)
}
