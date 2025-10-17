// 'use server';

// import { connectToDatabase } from '@/lib/db';
// import Event, { IEvent } from '@/models/Event';
// import Students, { IStudent } from '@/models/Students';
// import { sendMail } from '@/lib/email';
// import sharp from 'sharp';
// import { PDFDocument } from 'pdf-lib';
// import qrcode from 'qrcode';
// import path from 'path';
// import fs from 'fs/promises';
// import { Buffer } from 'buffer';

// const toBase64Uri = async (filePath: string, mimeType: string) => {
//   try {
//     const fileBuffer = await fs.readFile(filePath);
//     return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
//   } catch (error) {
//     console.error(`Error reading file for Base64 conversion: ${filePath}`, error);
//     throw new Error(`Could not read file: ${filePath}`);
//   }
// };

// export async function generatePosterBuffer(eventId: string): Promise<Buffer | null> {
//     try {
//         const event = await Event.findById(eventId).lean<IEvent>();
//         if (!event) throw new Error('Event not found');

//         const fontBoldUri = await toBase64Uri(path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf'), 'font/ttf');
//         const fontRegularUri = await toBase64Uri(path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf'), 'font/ttf');
//         const logoUri = await toBase64Uri(path.join(process.cwd(), 'public', 'RTU logo.png'), 'image/png');

//         const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/student-register?eventId=${event._id}`;
//         const qrCodeBuffer = await qrcode.toBuffer(registrationUrl, { width: 300, margin: 2 });
//         const qrCodeUri = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;

//         const svgLayout = `
//         <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
//           <style>
//             @font-face { font-family: 'Inter'; src: url("${fontRegularUri}"); font-weight: normal; }
//             @font-face { font-family: 'Inter'; src: url("${fontBoldUri}"); font-weight: bold; }
//             .title { font-family: 'Inter', sans-serif; font-size: 100px; font-weight: bold; fill: white; text-anchor: middle; }
//             .subtitle { font-family: 'Inter', sans-serif; font-size: 30px; fill: #60a5fa; text-anchor: middle; letter-spacing: 1px; }
//             .details { font-family: 'Inter', sans-serif; font-size: 32px; fill: #e5e7eb; text-anchor: middle; }
//             .motive { font-family: 'Inter', sans-serif; font-size: 40px; fill: #d1d5db; text-anchor: middle; }
//           </style>
//           <image href="${logoUri}" x="480" y="100" height="120" width="120"/>
//           <text x="540" y="280" class="subtitle">RAJASTHAN TECHNICAL UNIVERSITY, KOTA</text>
//           <text x="540" y="420" class="title">${event.eventName}</text>
//           <text x="540" y="520" class="motive">${event.motive}</text>
//           <text x="540" y="620" class="details">🗓️ ${new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</text>
//           <text x="540" y="670" class="details">📍 RTU Campus, Kota</text>
//           ${event.registrationFee ? `<text x="540" y="720" class="details">🎟️ Fee: ${event.registrationFee}</text>` : ''}
//           <text x="540" y="880" class="details">Scan to Register</text>
//           <image href="${qrCodeUri}" x="380" y="920" height="300" width="300"/>
//         </svg>`;
        
//         return sharp({
//             create: { width: 1080, height: 1350, channels: 4, background: { r: 17, g: 24, b: 39 } }
//         })
//         .composite([{ input: Buffer.from(svgLayout) }])
//         .png()
//         .toBuffer();
//       } catch (error) {
//         console.error('Error generating poster buffer:', error);
//         return null;
//       }
// }

// export async function generatePosterAction(eventId: string) {
//     try {
//         const posterBuffer = await generatePosterBuffer(eventId);
//         if (!posterBuffer) throw new Error('Failed to create poster buffer.');
        
//         const event = await Event.findById(eventId).lean<IEvent>();
//         if (!event) return { success: false, error: 'Event not found' };

//         const posterUrl = `data:image/png;base64,${posterBuffer.toString('base64')}`;
//         return { success: true, posterUrl, event: JSON.parse(JSON.stringify(event)) };
//       } catch (error: any) {
//         return { success: false, error: error.message };
//       }
// }

// export async function generateAndSendCertificatesAction(eventId: string) {
//     console.log(`[1/5] Starting certificate generation process for event ID: ${eventId}`);
//     try {
//         await connectToDatabase();
//         const event = await Event.findById(eventId).lean<IEvent>();
//         if (!event) {
//             console.error("Certificate generation failed: Event not found.");
//             return { success: false, error: 'Event not found' };
//         }

//         const eventDate = new Date(event.eventDate);
//         eventDate.setHours(0, 0, 0, 0);
        
//         const attendedStudents = await Students.find({
//             eventName: event.eventName,
//             'attendance.date': {
//                 $gte: eventDate,
//                 $lt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)
//             }
//         }).lean<IStudent[]>();

//         console.log(`[2/5] Found ${attendedStudents.length} student(s) with attendance.`);

//         if (attendedStudents.length === 0) {
//             return { success: true, message: 'No students with attendance found. No certificates were sent.' };
//         }

//         // ✨ 1. DEFINE THE DEFAULT TEMPLATE PATH
//         const defaultTemplatePath = path.join(process.cwd(), 'public', 'certificate-template.png');
//         let templatePathToUse = defaultTemplatePath;

//         // ✨ 2. CHECK IF A CUSTOM TEMPLATE EXISTS AND IS ACCESSIBLE
//         if (event.certificateTemplate) {
//             const customTemplatePath = path.join(process.cwd(), 'public', event.certificateTemplate);
//             try {
//                 // This checks if the file exists and we can read it.
//                 await fs.access(customTemplatePath);
//                 templatePathToUse = customTemplatePath;
//                 console.log(`[3/5] Custom template found. Using: ${customTemplatePath}`);
//             } catch {
//                 console.warn(`[3/5] Custom template "${event.certificateTemplate}" not found. Falling back to default.`);
//             }
//         } else {
//             console.log(`[3/5] No custom template set for this event. Using default.`);
//         }
        
//         const templateBuffer = await fs.readFile(templatePathToUse);
//         const fontBoldUri = await toBase64Uri(path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf'), 'font/ttf');
//         const fontRegularUri = await toBase64Uri(path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf'), 'font/ttf');

//         let sentCount = 0;
//         for (const student of attendedStudents) {
//             console.log(`[4/5] Generating certificate for: ${student.name} (${student.email})`);
            
//             const certificateTextSvg = `
//             <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
//                 <style>
//                     @font-face { font-family: 'Inter'; src: url("${fontRegularUri}"); font-weight: normal; }
//                     @font-face { font-family: 'Inter'; src: url("${fontBoldUri}"); font-weight: bold; }
//                     .name { fill: #1E293B; font-size: 52px; font-weight: bold; font-family: 'Inter', sans-serif; text-anchor: middle; }
//                     .event { fill: #475569; font-size: 24px; font-family: 'Inter', sans-serif; text-anchor: middle; }
//                 </style>
//                 <text x="600" y="420" class="name">${student.name}</text>
//                 <text x="600" y="510" class="event">for successfully participating in the event</text>
//                 <text x="600" y="550" class="event">${event.eventName}</text>
//             </svg>
//             `;

//             const certificateImageBuffer = await sharp(templateBuffer)
//                 .resize(1200, 800) 
//                 .composite([{ input: Buffer.from(certificateTextSvg) }])
//                 .png()
//                 .toBuffer();

//             const pdfDoc = await PDFDocument.create();
//             const page = pdfDoc.addPage([1200, 800]);
            
//             const pngImage = await pdfDoc.embedPng(new Uint8Array(certificateImageBuffer));
//             page.drawImage(pngImage, { x: 0, y: 0, width: 1200, height: 800 });

//             const pdfBytes = await pdfDoc.save();

//             await sendMail({
//                 to: student.email,
//                 subject: `Your Certificate for ${event.eventName}`,
//                 html: `
//                     <p>Dear ${student.name},</p>
//                     <p><strong>Thank you for attending the ${event.eventName} session!</strong> We appreciate your participation and hope you found it valuable.</p>
//                     <p>Please find your certificate of participation attached to this email.</p>
//                     <p>Best Regards,<br/>The Event Team</p>
//                 `,
//                 attachments: [{
//                     filename: `Certificate_${event.eventName.replace(/ /g, '_')}.pdf`,
//                     content: Buffer.from(pdfBytes),
//                     contentType: 'application/pdf',
//                 }],
//             });
//             sentCount++;
//             console.log(`✅ Email sent to ${student.email}`);
//         }

//         console.log(`[5/5] Process complete. Sent ${sentCount} certificates successfully!`);
//         return { success: true, message: `Sent ${sentCount} certificates successfully!` };

//     } catch (error: any) {
//         console.error('❌ Error sending certificates:', error);
//         return { success: false, error: 'Certificate generation failed. Check the server terminal for detailed logs.' };
//     }
// }


'use server';

import { connectToDatabase } from '@/lib/db';
import Event, { IEvent } from '@/models/Event';
import Students, { IStudent } from '@/models/Students';
import { sendMail } from '@/lib/email';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import qrcode from 'qrcode';
import { Buffer } from 'buffer';

/**
 * PRODUCTION BASE URL:
 * Prefer reading from env var in Vercel; fallback to your known deployment.
 */
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://shubh-project-repo.vercel.app';

/**
 * Fetch a public asset (fonts/images/templates) from /public and convert to data URI.
 * Works in Vercel serverless environment where filesystem access to /public is not available.
 */
const toBase64Uri = async (url: string, mimeType: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url} (status ${res.status})`);
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('toBase64Uri error for url:', url, error);
    throw error;
  }
};

/**
 * Helper: safe fetch arrayBuffer -> Buffer
 */
const fetchBuffer = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (status ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

/**
 * Generate poster buffer (PNG) using serverless-friendly public asset loading.
 */
export async function generatePosterBuffer(eventId: string): Promise<Buffer | null> {
  try {
    await connectToDatabase();

    const event = await Event.findById(eventId).lean<IEvent>();
    if (!event) throw new Error('Event not found');

    // Compose public URLs (ensure these files are in /public)
    const fontBoldUrl = `${BASE_URL}/fonts/Inter-Bold.ttf`;
    const fontRegularUrl = `${BASE_URL}/fonts/Inter-Regular.ttf`;
    const logoUrl = `${BASE_URL}/RTU%20logo.png`; // percent-encode spaces in filenames if present

    // Convert fonts/logo to data URIs
    const [fontBoldUri, fontRegularUri, logoUri] = await Promise.all([
      toBase64Uri(fontBoldUrl, 'font/ttf').catch((e) => { console.warn('Could not load bold font:', e); return ''; }),
      toBase64Uri(fontRegularUrl, 'font/ttf').catch((e) => { console.warn('Could not load regular font:', e); return ''; }),
      toBase64Uri(logoUrl, 'image/png').catch((e) => { console.warn('Could not load logo:', e); return ''; }),
    ]);

    const registrationUrl = `${BASE_URL}/student-register?eventId=${event._id}`;
    const qrCodeBuffer = await qrcode.toBuffer(registrationUrl, { width: 300, margin: 2 });
    const qrCodeUri = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;

    const eventDateText = event.eventDate
      ? new Date(event.eventDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const svgLayout = `
      <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
        <style>
          ${fontRegularUri ? `@font-face { font-family: 'Inter'; src: url("${fontRegularUri}"); font-weight: normal; }` : ''}
          ${fontBoldUri ? `@font-face { font-family: 'Inter'; src: url("${fontBoldUri}"); font-weight: bold; }` : ''}
          .title { font-family: 'Inter', sans-serif; font-size: 100px; font-weight: bold; fill: white; text-anchor: middle; }
          .subtitle { font-family: 'Inter', sans-serif; font-size: 30px; fill: #60a5fa; text-anchor: middle; letter-spacing: 1px; }
          .details { font-family: 'Inter', sans-serif; font-size: 32px; fill: #e5e7eb; text-anchor: middle; }
          .motive { font-family: 'Inter', sans-serif; font-size: 40px; fill: #d1d5db; text-anchor: middle; }
        </style>
        ${logoUri ? `<image href="${logoUri}" x="480" y="100" height="120" width="120"/>` : ''}
        <text x="540" y="280" class="subtitle">RAJASTHAN TECHNICAL UNIVERSITY, KOTA</text>
        <text x="540" y="420" class="title">${escapeXml(event.eventName || '')}</text>
        <text x="540" y="520" class="motive">${escapeXml(event.motive || '')}</text>
        <text x="540" y="620" class="details">🗓️ ${escapeXml(eventDateText)}</text>
        <text x="540" y="670" class="details">📍 RTU Campus, Kota</text>
        ${event.registrationFee ? `<text x="540" y="720" class="details">🎟️ Fee: ${escapeXml(String(event.registrationFee))}</text>` : ''}
        <text x="540" y="880" class="details">Scan to Register</text>
        <image href="${qrCodeUri}" x="380" y="920" height="300" width="300"/>
      </svg>`;

    // Render PNG using sharp (serverless-friendly)
    const pngBuffer = await sharp({
      create: { width: 1080, height: 1350, channels: 4, background: { r: 17, g: 24, b: 39 } },
    })
      .composite([{ input: Buffer.from(svgLayout) }])
      .png()
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    console.error('Error generating poster buffer:', error);
    return null;
  }
}

/**
 * Generates poster and returns data URL + event object.
 */
export async function generatePosterAction(eventId: string) {
  try {
    const posterBuffer = await generatePosterBuffer(eventId);
    if (!posterBuffer) throw new Error('Failed to create poster buffer.');

    await connectToDatabase();
    const event = await Event.findById(eventId).lean<IEvent>();
    if (!event) return { success: false, error: 'Event not found' };

    const posterUrl = `data:image/png;base64,${posterBuffer.toString('base64')}`;
    return { success: true, posterUrl, event: JSON.parse(JSON.stringify(event)) };
  } catch (error: any) {
    console.error('generatePosterAction error:', error);
    return { success: false, error: error.message || 'Poster generation failed' };
  }
}

/**
 * Generate certificates (PDFs) and email to attended students.
 * Uses fetch to load certificate template & fonts from /public on your deployed site.
 */
export async function generateAndSendCertificatesAction(eventId: string) {
  console.log(`[1/5] Starting certificate generation process for event ID: ${eventId}`);
  try {
    await connectToDatabase();
    const event = await Event.findById(eventId).lean<IEvent>();
    if (!event) {
      console.error('Certificate generation failed: Event not found.');
      return { success: false, error: 'Event not found' };
    }

    const eventDate = new Date(event.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const attendedStudents = await Students.find({
      eventName: event.eventName,
      'attendance.date': {
        $gte: eventDate,
        $lt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
      },
    }).lean<IStudent[]>();

    console.log(`[2/5] Found ${attendedStudents.length} student(s) with attendance.`);

    if (attendedStudents.length === 0) {
      return { success: true, message: 'No students with attendance found. No certificates were sent.' };
    }

    // Default template URL
    const defaultTemplateUrl = `${BASE_URL}/certificate-template.png`;
    let templateBuffer: Buffer | null = null;

    // Try custom template if provided; otherwise use default
    if (event.certificateTemplate) {
      const customUrl = `${BASE_URL}/${encodeURI(event.certificateTemplate)}`;
      try {
        templateBuffer = await fetchBuffer(customUrl);
        console.log(`[3/5] Using custom template: ${customUrl}`);
      } catch (e) {
        console.warn(`[3/5] Custom template not found or failed to fetch: ${customUrl}. Falling back to default.`, e);
      }
    }

    if (!templateBuffer) {
      // fetch default template
      try {
        templateBuffer = await fetchBuffer(defaultTemplateUrl);
        console.log(`[3/5] Using default template: ${defaultTemplateUrl}`);
      } catch (e) {
        console.error(`[3/5] Failed to load default template at ${defaultTemplateUrl}`, e);
        throw new Error('Certificate template not available. Ensure certificate-template.png is in /public.');
      }
    }

    // Load fonts as data URIs for SVG overlay
    const fontBoldUrl = `${BASE_URL}/fonts/Inter-Bold.ttf`;
    const fontRegularUrl = `${BASE_URL}/fonts/Inter-Regular.ttf`;
    const [fontBoldUri, fontRegularUri] = await Promise.all([
      toBase64Uri(fontBoldUrl, 'font/ttf').catch((e) => { console.warn('Could not load bold font:', e); return ''; }),
      toBase64Uri(fontRegularUrl, 'font/ttf').catch((e) => { console.warn('Could not load regular font:', e); return ''; }),
    ]);

    let sentCount = 0;

    for (const student of attendedStudents) {
      console.log(`[4/5] Generating certificate for: ${student.name} (${student.email})`);

      const certificateTextSvg = `
        <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
          <style>
            ${fontRegularUri ? `@font-face { font-family: 'Inter'; src: url("${fontRegularUri}"); font-weight: normal; }` : ''}
            ${fontBoldUri ? `@font-face { font-family: 'Inter'; src: url("${fontBoldUri}"); font-weight: bold; }` : ''}
            .name { fill: #1E293B; font-size: 52px; font-weight: bold; font-family: 'Inter', sans-serif; text-anchor: middle; }
            .event { fill: #475569; font-size: 24px; font-family: 'Inter', sans-serif; text-anchor: middle; }
          </style>
          <text x="600" y="420" class="name">${escapeXml(student.name || '')}</text>
          <text x="600" y="510" class="event">for successfully participating in the event</text>
          <text x="600" y="550" class="event">${escapeXml(event.eventName || '')}</text>
        </svg>`;

      // Compose final certificate image from template + SVG overlay
      const certificateImageBuffer = await sharp(templateBuffer)
        .resize(1200, 800) // ensure consistent size
        .composite([{ input: Buffer.from(certificateTextSvg) }])
        .png()
        .toBuffer();

      // Embed into PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([1200, 800]);
      const pngImage = await pdfDoc.embedPng(new Uint8Array(certificateImageBuffer));
      page.drawImage(pngImage, { x: 0, y: 0, width: 1200, height: 800 });

      const pdfBytes = await pdfDoc.save();

      // Send mail with certificate attached
      await sendMail({
        to: student.email,
        subject: `Your Certificate for ${event.eventName}`,
        html: `
          <p>Dear ${escapeHtml(student.name || '')},</p>
          <p><strong>Thank you for attending the ${escapeHtml(event.eventName || '')} session!</strong></p>
          <p>Please find your certificate of participation attached to this email.</p>
          <p>Best Regards,<br/>The Event Team</p>
        `,
        attachments: [
          {
            filename: `Certificate_${(event.eventName || 'event').replace(/\s+/g, '_')}_${sanitizeFileName(student.name)}.pdf`,
            content: Buffer.from(pdfBytes),
            contentType: 'application/pdf',
          },
        ],
      });

      sentCount++;
      console.log(`✅ Email sent to ${student.email}`);
    }

    console.log(`[5/5] Process complete. Sent ${sentCount} certificates successfully!`);
    return { success: true, message: `Sent ${sentCount} certificates successfully!` };
  } catch (error: any) {
    console.error('❌ Error sending certificates:', error);
    return { success: false, error: error.message || 'Certificate generation failed. Check logs.' };
  }
}

/**
 * Utility helpers
 */
function escapeXml(input: string) {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeHtml(input: string) {
  return escapeXml(input);
}

function sanitizeFileName(name?: string) {
  if (!name) return 'unknown';
  return name.replace(/[\\/:"*?<>|]+/g, '').replace(/\s+/g, '_').slice(0, 100);
}
