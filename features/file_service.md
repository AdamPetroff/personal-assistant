# File Service

I have created a fly storage, and I want to use it to store files. I want to be able to upload files to the storage, and then download them. @aws-sdk/client-s3 is already installed for usage of S3Client().

Then I want to add a functionality to add a file to the storage, when a user uploads a file to the telegram bot.

## Analysis

Based on the current state of the project, we need to implement a file service that will:

1. Connect to the existing S3-compatible Fly Storage using the AWS SDK
2. Provide functionality to upload and download files
3. Integrate with the Telegram bot to handle file uploads from users

The project already has:

- The AWS SDK for S3 installed (`@aws-sdk/client-s3`)
- Environment variables configured for S3 access (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `BUCKET_NAME`)
- A Telegram bot implementation that handles text messages
- A service-based architecture where each functionality is implemented as a separate service

However, the current bot implementation doesn't handle file uploads, and there's no file service yet.

## Implementation Plan

1. **Create a File Service**

    - Create a new file `src/services/fileService.ts`
    - Implement S3 client initialization using environment variables
    - Create methods for uploading and downloading files
    - Add utility functions for generating unique file names and handling file metadata

2. **Update Telegram Bot to Handle File Uploads**

    - Modify `src/bot/index.ts` to add event listeners for file uploads (documents, photos, etc.)
    - Implement file download from Telegram servers
    - Integrate with the file service to upload files to S3
    - Generate and send back download links to users

3. **Add File Management Commands**

    - Implement commands for listing, downloading, and deleting files
    - Add help text for file-related commands

4. **Testing**

    - Test file uploads of different types and sizes
    - Test file downloads
    - Test error handling for invalid files or failed uploads

5. **Documentation**
    - Update documentation with file service usage examples
    - Document supported file types and size limits

## Implementation Summary

The file service feature has been successfully implemented with the following components:

1. **File Service (`src/services/fileService.ts`)**

    - Created a TypeScript class that interfaces with S3-compatible storage
    - Implemented methods for file operations: upload, download, delete, and list
    - Added support for both file and buffer uploads
    - Implemented file metadata handling and unique file key generation
    - Created utility functions for file operations
    - Added configuration validation and graceful handling of missing configuration

2. **Environment Configuration (`src/config/constants.ts`)**

    - Added S3 configuration to the centralized constants file
    - Implemented validation for S3 environment variables
    - Created a configuration object for easier access to S3 settings

3. **Telegram Bot Integration (`src/bot/index.ts`)**

    - Added event listeners for various file types:
        - Documents (general files)
        - Photos
        - Audio files
        - Videos
        - Voice messages
    - Implemented file download from Telegram servers
    - Added file upload to S3 storage
    - Implemented file management commands:
        - `/files` - List all stored files
        - `/deletefile [fileKey]` - Delete a specific file
        - `/filehelp` - Show help for file operations

4. **Testing**

    - Created a test script (`scripts/test-file-service.ts`) to verify file service functionality
    - Implemented fallback to local file testing when S3 is not configured
    - Successfully tested all file operations: upload, download, list, and delete

5. **User Experience**
    - Users can upload files by sending them to the bot
    - The bot provides download links for uploaded files
    - Users can manage their files with simple commands
    - Error handling ensures users get meaningful feedback

The implementation uses the AWS SDK for S3 to interact with Fly Storage, and the Telegram Bot API to handle file uploads from users. Files are temporarily stored locally before being uploaded to S3, and then the local copies are deleted to save space.

The service is designed to be resilient, with proper error handling and validation of configuration. It will gracefully handle missing configuration and provide helpful error messages to both users and developers.
