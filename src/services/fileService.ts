import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsCommand
} from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream, promises as fsPromises } from "fs";
import path from "path";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";
import { S3_CONFIG } from "../config/constants";

// S3 client configuration
const s3Client = new S3Client({
    region: S3_CONFIG.region,
    endpoint: S3_CONFIG.endpointUrl,
    credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey
    }
});

// File metadata interface
export interface FileMetadata {
    originalName: string;
    mimeType: string;
    size: number;
    uploadDate: Date;
}

export class FileService {
    private readonly bucketName: string;
    private readonly uploadDir: string;

    constructor() {
        this.bucketName = S3_CONFIG.bucketName;
        this.uploadDir = path.join(process.cwd(), "uploads");

        // Ensure upload directory exists
        this.ensureUploadDirExists();

        // Log configuration status
        if (!this.isConfigured()) {
            logger.warn("File service initialized with incomplete S3 configuration");
        } else {
            logger.info("File service initialized with S3 configuration");
        }
    }

    /**
     * Check if the S3 service is properly configured
     */
    public isConfigured(): boolean {
        return !!(
            S3_CONFIG.accessKeyId &&
            S3_CONFIG.secretAccessKey &&
            S3_CONFIG.endpointUrl &&
            S3_CONFIG.region &&
            S3_CONFIG.bucketName
        );
    }

    private async ensureUploadDirExists(): Promise<void> {
        try {
            await fsPromises.access(this.uploadDir);
        } catch (error) {
            await fsPromises.mkdir(this.uploadDir, { recursive: true });
            logger.info(`Created upload directory: ${this.uploadDir}`);
        }
    }

    /**
     * Generate a unique file key for S3 storage
     */
    private generateFileKey(originalName: string): string {
        const timestamp = Date.now();
        const uuid = uuidv4();
        const extension = path.extname(originalName);
        const sanitizedName = path
            .basename(originalName, extension)
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase();

        return `${timestamp}-${sanitizedName}-${uuid}${extension}`;
    }

    /**
     * Upload a file to S3 from a local file path
     */
    public async uploadFile(
        filePath: string,
        originalName: string,
        mimeType: string
    ): Promise<{ fileKey: string; metadata: FileMetadata }> {
        try {
            // Check if configured
            if (!this.isConfigured()) {
                throw new Error("S3 storage is not properly configured");
            }

            const fileStats = await fsPromises.stat(filePath);
            const fileKey = this.generateFileKey(originalName);

            const fileStream = createReadStream(filePath);

            const uploadParams = {
                Bucket: this.bucketName,
                Key: fileKey,
                Body: fileStream,
                ContentType: mimeType,
                Metadata: {
                    originalName,
                    mimeType,
                    size: fileStats.size.toString(),
                    uploadDate: new Date().toISOString()
                }
            };

            await s3Client.send(new PutObjectCommand(uploadParams));

            const metadata: FileMetadata = {
                originalName,
                mimeType,
                size: fileStats.size,
                uploadDate: new Date()
            };

            logger.info(`File uploaded successfully: ${fileKey}`);
            return { fileKey, metadata };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Error uploading file to S3:", error);
            throw new Error(`Failed to upload file: ${errorMessage}`);
        }
    }

    /**
     * Upload a file to S3 from a buffer
     */
    public async uploadBuffer(
        buffer: Buffer,
        originalName: string,
        mimeType: string
    ): Promise<{ fileKey: string; metadata: FileMetadata }> {
        try {
            // Check if configured
            if (!this.isConfigured()) {
                throw new Error("S3 storage is not properly configured");
            }

            const fileKey = this.generateFileKey(originalName);

            const uploadParams = {
                Bucket: this.bucketName,
                Key: fileKey,
                Body: buffer,
                ContentType: mimeType,
                Metadata: {
                    originalName,
                    mimeType,
                    size: buffer.length.toString(),
                    uploadDate: new Date().toISOString()
                }
            };

            await s3Client.send(new PutObjectCommand(uploadParams));

            const metadata: FileMetadata = {
                originalName,
                mimeType,
                size: buffer.length,
                uploadDate: new Date()
            };

            logger.info(`File uploaded successfully from buffer: ${fileKey}`);
            return { fileKey, metadata };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Error uploading buffer to S3:", error);
            throw new Error(`Failed to upload buffer: ${errorMessage}`);
        }
    }

    /**
     * Download a file from S3 to a local path
     */
    public async downloadFile(fileKey: string, outputPath: string): Promise<string> {
        try {
            // Check if configured
            if (!this.isConfigured()) {
                throw new Error("S3 storage is not properly configured");
            }

            const downloadParams = {
                Bucket: this.bucketName,
                Key: fileKey
            };

            const { Body, Metadata } = await s3Client.send(new GetObjectCommand(downloadParams));

            if (!Body) {
                throw new Error("File body is empty");
            }

            const outputStream = createWriteStream(outputPath);

            if (Body instanceof Readable) {
                await new Promise<void>((resolve, reject) => {
                    Body.pipe(outputStream)
                        .on("finish", () => {
                            logger.info(`File downloaded successfully: ${fileKey} to ${outputPath}`);
                            resolve();
                        })
                        .on("error", (err) => {
                            logger.error(`Error writing file: ${err.message}`);
                            reject(err);
                        });
                });
            } else {
                throw new Error("Unexpected response body type");
            }

            return outputPath;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Error downloading file from S3:", error);
            throw new Error(`Failed to download file: ${errorMessage}`);
        }
    }

    /**
     * Get a file as a buffer from S3
     */
    public async getFileBuffer(
        fileKey: string
    ): Promise<{ buffer: Buffer; metadata: Record<string, string> | undefined }> {
        try {
            // Check if configured
            if (!this.isConfigured()) {
                throw new Error("S3 storage is not properly configured");
            }

            const downloadParams = {
                Bucket: this.bucketName,
                Key: fileKey
            };

            const { Body, Metadata } = await s3Client.send(new GetObjectCommand(downloadParams));

            if (!Body) {
                throw new Error("File body is empty");
            }

            let chunks: Uint8Array[] = [];

            if (Body instanceof Readable) {
                for await (const chunk of Body) {
                    chunks.push(chunk);
                }
            } else {
                throw new Error("Unexpected response body type");
            }

            const buffer = Buffer.concat(chunks);
            logger.info(`File retrieved successfully as buffer: ${fileKey}`);

            return { buffer, metadata: Metadata };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Error getting file buffer from S3:", error);
            throw new Error(`Failed to get file buffer: ${errorMessage}`);
        }
    }

    /**
     * Delete a file from S3
     */
    public async deleteFile(fileKey: string): Promise<void> {
        try {
            // Check if configured
            if (!this.isConfigured()) {
                throw new Error("S3 storage is not properly configured");
            }

            const deleteParams = {
                Bucket: this.bucketName,
                Key: fileKey
            };

            await s3Client.send(new DeleteObjectCommand(deleteParams));
            logger.info(`File deleted successfully: ${fileKey}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Error deleting file from S3:", error);
            throw new Error(`Failed to delete file: ${errorMessage}`);
        }
    }

    /**
     * List all files in the bucket
     */
    public async listFiles(): Promise<{ fileKey: string; metadata: Record<string, string> | undefined }[]> {
        try {
            // Check if configured
            if (!this.isConfigured()) {
                throw new Error("S3 storage is not properly configured");
            }

            const listParams = {
                Bucket: this.bucketName
            };

            const { Contents } = await s3Client.send(new ListObjectsCommand(listParams));

            if (!Contents || Contents.length === 0) {
                return [];
            }

            const fileList = await Promise.all(
                Contents.map(async (item) => {
                    if (!item.Key) return null;

                    try {
                        const getParams = {
                            Bucket: this.bucketName,
                            Key: item.Key
                        };

                        const { Metadata } = await s3Client.send(new GetObjectCommand(getParams));

                        return {
                            fileKey: item.Key,
                            metadata: Metadata
                        };
                    } catch (error) {
                        logger.error(`Error getting metadata for file ${item.Key}:`, error);
                        return {
                            fileKey: item.Key,
                            metadata: {}
                        };
                    }
                })
            );

            // Filter out null values and cast to the correct type
            return fileList.filter(
                (item): item is { fileKey: string; metadata: Record<string, string> | undefined } => item !== null
            );
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Error listing files from S3:", error);
            throw new Error(`Failed to list files: ${errorMessage}`);
        }
    }

    /**
     * Get a public URL for a file (if the bucket is configured for public access)
     */
    public getPublicUrl(fileKey: string): string {
        return `${S3_CONFIG.endpointUrl}/${this.bucketName}/${fileKey}`;
    }
}

// Export a singleton instance
export const fileService = new FileService();
