declare module 'pdf2pic' {
  export interface PdfToPicOptions {
    density?: number;
    savePath?: string;
    saveFilename?: string;
    format?: string;
    width?: number;
    height?: number;
    quality?: number;
  }

  export interface PdfToPicResult {
    path: string;
    name: string;
    size: number;
    page: number;
    base64?: string;
  }

  export type ConvertMethod = (
    pageNumber: number,
    saveToFile?: boolean
  ) => Promise<PdfToPicResult>;

  export type FromPathMethod = (
    pdfPath: string,
    options: PdfToPicOptions
  ) => ConvertMethod;

  export const fromPath: FromPathMethod;
} 