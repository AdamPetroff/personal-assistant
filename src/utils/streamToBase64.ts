import { Stream } from "stream";
import { ReadableStream } from "stream/web";

/**
 * Helper method to convert a ReadableStream to base64
 */
export default async function streamToBase64(stream: ReadableStream | Stream): Promise<string> {
    const reader =
        stream instanceof ReadableStream
            ? stream.getReader()
            : new ReadableStream({
                  start(controller) {
                      stream.on("data", (chunk) => controller.enqueue(chunk));
                      stream.on("end", () => controller.close());
                      stream.on("error", (err) => controller.error(err));
                  }
              }).getReader();
    const chunks: Uint8Array[] = [];

    let done = false;
    while (!done) {
        const { value, done: isDone } = await reader.read();
        if (isDone) {
            done = true;
        } else if (value) {
            chunks.push(value);
        }
    }

    const concatenated = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        concatenated.set(chunk, offset);
        offset += chunk.length;
    }

    return Buffer.from(concatenated).toString("base64");
}
