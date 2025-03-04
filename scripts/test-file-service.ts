import { fileService } from "../src/services/fileService";
import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function testFileService() {
    console.log("Testing file service...");

    // Check if S3 is configured
    if (!fileService.isConfigured()) {
        console.log("S3 is not configured. Running local file test instead.");
        await runLocalFileTest();
        return;
    }

    try {
        // Create a test file
        const testFilePath = path.join(process.cwd(), "uploads", "test-file.txt");
        const testFileContent = "This is a test file for the file service.";

        // Ensure uploads directory exists
        await fsPromises.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

        // Write test file
        await fsPromises.writeFile(testFilePath, testFileContent);
        console.log(`Created test file at ${testFilePath}`);

        // Upload the file
        console.log("Uploading file...");
        const { fileKey, metadata } = await fileService.uploadFile(testFilePath, "test-file.txt", "text/plain");
        console.log(`File uploaded successfully with key: ${fileKey}`);
        console.log("Metadata:", metadata);

        // Get the file as a buffer
        console.log("Getting file as buffer...");
        const { buffer } = await fileService.getFileBuffer(fileKey);
        console.log(`Retrieved file buffer (${buffer.length} bytes)`);
        console.log("File content:", buffer.toString());

        // Download the file
        console.log("Downloading file...");
        const downloadPath = path.join(process.cwd(), "uploads", "downloaded-test-file.txt");
        await fileService.downloadFile(fileKey, downloadPath);
        console.log(`File downloaded to ${downloadPath}`);

        // List all files
        console.log("Listing all files...");
        const files = await fileService.listFiles();
        console.log(`Found ${files.length} files:`);
        files.forEach((file, index) => {
            console.log(`${index + 1}. ${file.fileKey}`);
        });

        // Delete the file
        console.log("Deleting file...");
        await fileService.deleteFile(fileKey);
        console.log(`File deleted: ${fileKey}`);

        // Clean up local files
        await fsPromises.unlink(testFilePath);
        await fsPromises.unlink(downloadPath);
        console.log("Cleaned up local test files");

        console.log("All tests completed successfully!");
    } catch (error) {
        console.error("Error testing file service:", error);
    }
}

/**
 * Run a simple local file test that doesn't require S3
 */
async function runLocalFileTest() {
    try {
        // Create test files directory
        const testDir = path.join(process.cwd(), "uploads", "test-files");
        await fsPromises.mkdir(testDir, { recursive: true });

        // Create source file
        const sourceFile = path.join(testDir, "source.txt");
        const content = "This is a local file test. No S3 required.";
        await fsPromises.writeFile(sourceFile, content);
        console.log(`Created source file at ${sourceFile}`);

        // Copy to destination
        const destFile = path.join(testDir, "destination.txt");
        await fsPromises.copyFile(sourceFile, destFile);
        console.log(`Copied to destination file at ${destFile}`);

        // Read destination file
        const readContent = await fsPromises.readFile(destFile, "utf8");
        console.log(`Read content from destination: "${readContent}"`);

        // Clean up
        await fsPromises.unlink(sourceFile);
        await fsPromises.unlink(destFile);
        console.log("Cleaned up test files");

        console.log("Local file test completed successfully!");
    } catch (error) {
        console.error("Error in local file test:", error);
    }
}

// Run the test
testFileService();
