const quoteRequestForm = document.querySelector('#quote-request-form');

if (quoteRequestForm) {
  const photoInput = document.querySelector('#quote-package-photo');
  const photoName = document.querySelector('#quote-photo-name');
  const photoPreview = document.querySelector('#quote-photo-preview');
  const status = document.querySelector('#quote-request-status');
  const submitButton = document.querySelector('#quote-submit-button');
  const emailButton = document.querySelector('#quote-email-button');
  let previewUrl;
  let currentPdfUrl;
  let currentPdfName;
  let currentWhatsAppUrl;

  window.addEventListener('beforeunload', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
  }, { once: true });

  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    photoPreview.hidden = true;

    if (!file) {
      photoName.textContent = 'No picture selected';
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      photoInput.setCustomValidity('Choose a JPG, PNG, or WebP image up to 8 MB.');
      photoInput.reportValidity();
      photoInput.value = '';
      photoName.textContent = 'No picture selected';
      return;
    }

    photoInput.setCustomValidity('');
    photoName.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    previewUrl = URL.createObjectURL(file);
    photoPreview.src = previewUrl;
    photoPreview.hidden = false;
  });

  function wrapText(context, text, maxWidth, maxLines = Infinity) {
    const words = String(text || 'Not provided').split(/\s+/);
    const lines = [];
    let line = '';
    let truncated = false;

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
        if (lines.length === maxLines) {
          truncated = true;
          break;
        }
      } else {
        line = candidate;
      }
    }
    if (!truncated && line) lines.push(line);
    if (truncated && lines.length) {
      let last = `${lines[lines.length - 1]}…`;
      while (last.length > 1 && context.measureText(last).width > maxWidth) last = `${last.slice(0, -2)}…`;
      lines[lines.length - 1] = last;
    }
    return lines;
  }

  function loadImage(source, errorMessage) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(errorMessage));
      image.src = source;
    });
  }

  function drawImageContain(context, image, x, y, width, height) {
    const ratio = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function showManualShareLinks() {
    const pdfLink = document.createElement('a');
    pdfLink.href = currentPdfUrl;
    pdfLink.download = currentPdfName;
    pdfLink.textContent = 'Download PDF';
    const whatsappLink = document.createElement('a');
    whatsappLink.href = currentWhatsAppUrl;
    whatsappLink.target = '_blank';
    whatsappLink.rel = 'noopener noreferrer';
    whatsappLink.textContent = 'Open WhatsApp';
    status.replaceChildren(pdfLink, document.createTextNode(' · '), whatsappLink);
  }

  emailButton.addEventListener('click', () => {
    status.textContent = '';
    if (!quoteRequestForm.reportValidity()) return;

    const packagePhoto = photoInput.files[0];
    if (!packagePhoto || !['image/jpeg', 'image/png', 'image/webp'].includes(packagePhoto.type) || packagePhoto.size > 8 * 1024 * 1024) {
      photoInput.setCustomValidity('Select a JPG, PNG, or WebP package picture up to 8 MB.');
      photoInput.reportValidity();
      return;
    }

    const formData = new FormData(quoteRequestForm);
    const details = Object.fromEntries(['name', 'email', 'phone', 'origin', 'destination'].map((name) => [
      name,
      String(formData.get(name) || '').trim()
    ]));
    const reference = `Q-${Date.now().toString(36).toUpperCase()}`;
    const subject = `Quote request ${reference}`;
    const body = [
      `Quote request reference: ${reference}`,
      `Full name: ${details.name}`,
      `Email address: ${details.email}`,
      `Contact number: ${details.phone}`,
      `Pickup point: ${details.origin}`,
      `Destination: ${details.destination}`,
      `Package picture to attach: ${packagePhoto.name}`,
      '',
      'Please review these delivery details and provide a quotation.'
    ].join('\n');
    const gmailUrl = new URL('https://mail.google.com/mail/');
    gmailUrl.search = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: 'info@nyamilaexpress.co.za',
      cc: details.email,
      su: subject,
      body
    }).toString();

    const composeLink = document.createElement('a');
    composeLink.href = gmailUrl.href;
    composeLink.target = '_blank';
    composeLink.rel = 'noopener noreferrer';
    composeLink.click();
    status.textContent = 'Gmail draft opened with your address in CC. Attach the package picture before sending.';
  });

  function makePdfBlob(jpegBytes, width, height) {
    const encoder = new TextEncoder();
    const encode = (value) => encoder.encode(value);
    const imageObject = 5;
    const content = encode('q 595 0 0 842 0 0 cm /Im0 Do Q');
    const objects = [
      null,
      encode('<< /Type /Catalog /Pages 2 0 R >>'),
      encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
      encode('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>'),
      encode(`<< /Length ${content.length} >>\nstream\nq 595 0 0 842 0 0 cm /Im0 Do Q\nendstream`),
      {
        prefix: encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
        bytes: jpegBytes,
        suffix: encode('\nendstream')
      }
    ];
    const header = encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const parts = [header];
    const offsets = [0];
    let byteLength = header.length;

    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = byteLength;
      const object = objects[index];
      const start = encode(`${index} 0 obj\n`);
      const end = encode('\nendobj\n');
      if (object instanceof Uint8Array) {
        parts.push(start, object, end);
        byteLength += start.length + object.length + end.length;
      } else {
        parts.push(start, object.prefix, object.bytes, object.suffix, end);
        byteLength += start.length + object.prefix.length + object.bytes.length + object.suffix.length + end.length;
      }
    }

    const xrefOffset = byteLength;
    const xref = [`xref\n0 ${objects.length}\n`, '0000000000 65535 f \n'];
    for (let index = 1; index < objects.length; index += 1) {
      xref.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
    }
    xref.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    parts.push(encode(xref.join('')));
    return new Blob(parts, { type: 'application/pdf' });
  }

  async function canvasToJpeg(canvas) {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('The browser could not render the quote request PDF.'));
      }, 'image/jpeg', 0.92);
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function createQuotePdf(data, packagePhoto, reference, preparedDate) {
    const logo = await loadImage('images/logo-cropped.png', 'The company logo could not be loaded. The PDF was not created.');
    const packagePhotoUrl = URL.createObjectURL(packagePhoto);
    let packageImage;
    try {
      packageImage = await loadImage(packagePhotoUrl, 'The selected package picture could not be opened. Choose a JPG, PNG, or WebP image.');
    } finally {
      URL.revokeObjectURL(packagePhotoUrl);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not create the quote request PDF.');

    const width = canvas.width;
    const margin = 82;
    const contentWidth = width - margin * 2;
    const navy = '#202833';
    const blue = '#1677ff';
    const cyan = '#42cbf5';
    const gold = '#f2cf4a';
    const ink = '#1c2431';
    const muted = '#596574';

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = navy;
    context.fillRect(0, 0, width, 20);
    context.fillStyle = blue;
    context.fillRect(0, 20, width, 7);

    context.fillStyle = '#f6f8fb';
    context.beginPath();
    context.roundRect(margin, 52, 112, 112, 18);
    context.fill();
    drawImageContain(context, logo, margin + 7, 57, 98, 102);

    context.fillStyle = navy;
    context.font = '900 43px "Barlow Condensed", Inter, Arial, sans-serif';
    context.fillText('QUOTE REQUEST', 228, 98);
    context.fillStyle = muted;
    context.font = '500 19px Inter, Arial, sans-serif';
    context.fillText('Nyamira Express (McArek International)', 230, 132);
    context.fillText('Courier | Logistics | Freight', 230, 160);

    context.textAlign = 'right';
    context.fillStyle = ink;
    context.font = '700 20px Inter, Arial, sans-serif';
    context.fillText('Nyamira Express (McArek International)', width - margin, 72);
    context.font = '400 16px Inter, Arial, sans-serif';
    context.fillStyle = muted;
    context.fillText('7 Duvenhage Avenue, Edleen, Kempton Park', width - margin, 100);
    context.fillText('Gauteng, South Africa', width - margin, 125);
    context.fillText('074 444 0102  |  info@nyamilaexpress.co.za', width - margin, 150);
    context.textAlign = 'left';

    context.fillStyle = cyan;
    context.fillRect(margin, 190, contentWidth, 4);
    context.fillStyle = muted;
    context.font = '500 16px Inter, Arial, sans-serif';
    context.fillText(`Prepared by: ${data.name}`, margin, 224);
    context.fillText(`Date: ${preparedDate}`, margin + 370, 224);
    context.fillText(`Quote number: ${reference}`, margin + 690, 224);
    context.fillText('Customer ID: Not assigned', margin, 252);
    context.fillText('Valid until: Confirmed with formal quote', margin + 370, 252);

    let y = 282;
    const drawSectionBar = (title) => {
      context.fillStyle = gold;
      context.fillRect(margin, y, contentWidth, 35);
      context.fillStyle = navy;
      context.font = '700 17px Inter, Arial, sans-serif';
      context.fillText(title, margin + 12, y + 23);
      y += 48;
    };
    const drawClientField = (label, value, x, fieldY, fieldWidth) => {
      context.fillStyle = muted;
      context.font = '700 14px Inter, Arial, sans-serif';
      context.fillText(label, x, fieldY);
      context.fillStyle = ink;
      context.font = '500 17px Inter, Arial, sans-serif';
      const lines = wrapText(context, value, fieldWidth - 12, 2);
      lines.forEach((line, index) => context.fillText(line, x + 112, fieldY + index * 22));
    };

    drawSectionBar("Client's Information");
    const colWidth = contentWidth / 2;
    drawClientField('Name:', data.name, margin + 10, y, colWidth - 10);
    drawClientField('Email:', data.email, margin + colWidth, y, colWidth - 10);
    y += 38;
    drawClientField('Contact Number:', data.phone, margin + 10, y, colWidth - 10);
    drawClientField('Pickup Point:', data.origin, margin + colWidth, y, colWidth - 10);
    y += 38;
    drawClientField('Destination:', data.destination, margin + 10, y, contentWidth - 10);
    y += 53;

    drawSectionBar('Quote for');
    context.fillStyle = ink;
    context.font = '500 17px Inter, Arial, sans-serif';
    context.fillText('Courier / freight delivery request', margin + 10, y);
    y += 36;

    const columns = [
      { title: 'DESCRIPTION', width: 470, value: `Package photo: ${packagePhoto.name}` },
      { title: 'QUANTITY', width: 110, value: '1' },
      { title: 'UNIT PRICE', width: 130, value: 'To be quoted' },
      { title: 'COST', width: 120, value: 'To be quoted' },
      { title: 'TAX', width: 90, value: 'TBC' },
      { title: 'TOTAL AMOUNT', width: 156, value: 'To be quoted' }
    ];
    const tableX = margin;
    const tableWidth = columns.reduce((total, column) => total + column.width, 0);
    context.fillStyle = navy;
    context.fillRect(tableX, y, tableWidth, 42);
    context.font = '700 12px Inter, Arial, sans-serif';
    let x = tableX;
    columns.forEach((column) => {
      context.fillStyle = '#ffffff';
      context.fillText(column.title, x + 9, y + 26);
      x += column.width;
    });
    y += 42;
    context.fillStyle = '#f6f8fb';
    context.fillRect(tableX, y, tableWidth, 58);
    context.strokeStyle = '#d9e0e9';
    context.strokeRect(tableX, y, tableWidth, 58);
    context.font = '500 13px Inter, Arial, sans-serif';
    x = tableX;
    columns.forEach((column) => {
      context.fillStyle = ink;
      wrapText(context, column.value, column.width - 16, 2).forEach((line, index) => {
        context.fillText(line, x + 8, y + 23 + index * 17);
      });
      context.strokeStyle = '#d9e0e9';
      context.beginPath();
      context.moveTo(x, y - 42);
      context.lineTo(x, y + 58);
      context.stroke();
      x += column.width;
    });
    y += 58;
    context.fillStyle = gold;
    context.fillRect(tableX, y, tableWidth, 38);
    context.fillStyle = navy;
    context.font = '700 15px Inter, Arial, sans-serif';
    context.fillText('TOTAL', tableX + 10, y + 25);
    context.textAlign = 'right';
    context.fillText('To be quoted by Nyamira Express', tableX + tableWidth - 10, y + 25);
    context.textAlign = 'left';
    y += 56;

    const imageBoxWidth = 280;
    const imageBoxHeight = 240;
    context.fillStyle = '#f6f8fb';
    context.fillRect(margin, y, imageBoxWidth, imageBoxHeight);
    context.strokeStyle = '#d9e0e9';
    context.strokeRect(margin, y, imageBoxWidth, imageBoxHeight);
    drawImageContain(context, packageImage, margin + 12, y + 12, imageBoxWidth - 24, imageBoxHeight - 24);

    const photoInfoX = margin + imageBoxWidth + 28;
    context.fillStyle = blue;
    context.font = '700 15px Inter, Arial, sans-serif';
    context.fillText('PACKAGE PHOTO', photoInfoX, y + 26);
    context.fillStyle = ink;
    context.font = '500 16px Inter, Arial, sans-serif';
    wrapText(context, packagePhoto.name, contentWidth - imageBoxWidth - 45, 3).forEach((line, index) => {
      context.fillText(line, photoInfoX, y + 56 + index * 23);
    });
    context.fillStyle = muted;
    context.font = '400 15px Inter, Arial, sans-serif';
    context.fillText('Pickup point', photoInfoX, y + 145);
    context.fillStyle = ink;
    context.font = '500 17px Inter, Arial, sans-serif';
    wrapText(context, data.origin, contentWidth - imageBoxWidth - 45, 2).forEach((line, index) => {
      context.fillText(line, photoInfoX, y + 172 + index * 23);
    });
    y += imageBoxHeight + 25;

    drawSectionBar('Terms and Conditions');
    context.fillStyle = ink;
    context.font = '400 15px Inter, Arial, sans-serif';
    context.fillText('This document is a quote request, not a final quotation or confirmed booking.', margin, y);
    context.fillText('The client will be billed only after accepting the formal quotation.', margin, y + 24);
    y += 66;

    context.fillStyle = ink;
    context.font = '500 15px Inter, Arial, sans-serif';
    context.fillText(`Name: ${data.name}`, margin, y);
    context.fillText('Signature: ______________________________', margin, y + 38);
    context.fillText(`Date signed: ${preparedDate}`, margin + 560, y + 38);

    context.fillStyle = '#f2cf4a';
    context.fillRect(0, canvas.height - 18, width, 18);
    context.fillStyle = blue;
    context.fillRect(0, canvas.height - 18, width, 5);
    context.fillStyle = muted;
    context.font = '400 12px Inter, Arial, sans-serif';
    context.textAlign = 'right';
    context.fillText('Nyamira Express (McArek International) · Quote request', width - margin, canvas.height - 34);
    context.textAlign = 'left';

    return makePdfBlob(await canvasToJpeg(canvas), canvas.width, canvas.height);
  }

  quoteRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    submitButton.disabled = true;
    const packagePhoto = photoInput.files[0];
    if (!packagePhoto || !['image/jpeg', 'image/png', 'image/webp'].includes(packagePhoto.type) || packagePhoto.size > 8 * 1024 * 1024) {
      photoInput.setCustomValidity('Select a JPG, PNG, or WebP package picture up to 8 MB.');
      photoInput.reportValidity();
      submitButton.disabled = false;
      return;
    }

    status.textContent = 'Preparing your branded quote request PDF…';
    const formData = new FormData(quoteRequestForm);
    const data = Object.fromEntries(['name', 'email', 'phone', 'origin', 'destination'].map((name) => [
      name,
      String(formData.get(name) || '').trim()
    ]));
    const reference = `Q-${Date.now().toString(36).toUpperCase()}`;
    const preparedDate = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long' }).format(new Date());
    const fileName = `Nyamira-Express-Quote-Request-${reference}.pdf`;
    const whatsappMessage = `Hello Nyamira Express, please find my quote request. Reference: ${reference}.`;
    currentWhatsAppUrl = `https://wa.me/27719406303?text=${encodeURIComponent(whatsappMessage)}`;

    try {
      const pdfBlob = await createQuotePdf(data, packagePhoto, reference, preparedDate);
      if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
      currentPdfUrl = URL.createObjectURL(pdfBlob);
      currentPdfName = fileName;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [pdfFile] }) && navigator.share) {
        await navigator.share({
          files: [pdfFile],
          title: 'Nyamira Express quote request',
          text: whatsappMessage
        });
        status.textContent = 'PDF shared.';
      } else {
        const downloadLink = document.createElement('a');
        downloadLink.href = currentPdfUrl;
        downloadLink.download = fileName;
        downloadLink.click();
        showManualShareLinks();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        status.textContent = 'Sharing cancelled.';
        if (currentPdfUrl) showManualShareLinks();
      } else if (currentPdfUrl) {
        showManualShareLinks();
      } else {
        status.textContent = error instanceof Error ? error.message : 'The PDF could not be created. Please try again.';
      }
    } finally {
      submitButton.disabled = false;
    }
  });
}
