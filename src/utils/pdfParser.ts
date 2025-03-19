import { ReadableStream } from "stream/web";
import { Stream } from "stream";
import pdfParse from "pdf-parse";

/**
 * Parse a PDF stream into text using pdf-parse
 * @param pdfStream The PDF stream to parse
 * @returns Parsed PDF data as text
 */
export async function parsePDF(pdfStream: ReadableStream | Stream): Promise<string> {
    let buffer: Buffer;

    if (pdfStream instanceof ReadableStream) {
        // Convert ReadableStream to Buffer
        const reader = pdfStream.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
        }

        buffer = Buffer.concat(chunks);
    } else {
        // Handle Node.js Stream
        buffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            pdfStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
            pdfStream.on("error", reject);
        });
    }

    const data = await pdfParse(buffer);
    return data.text;
}
