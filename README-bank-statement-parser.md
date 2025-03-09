# Bank Statement Parser Service

This service allows you to parse PDF bank statements using an LLM (OpenAI's GPT-4o). It extracts structured data including the account balance and detailed transaction information.

## Features

- Upload and parse bank statement PDFs
- List all available bank statement files
- Parse individual bank statements by filename
- Process all bank statements in a batch
- Extract account balance, transaction details, and categorization

## Requirements

- Node.js and npm
- An OpenAI API key with access to GPT-4o model
- PDF bank statements

## Setup

1. Ensure your OpenAI API key is set in your `.env` file:

    ```
    OPENAI_API_KEY=your_openai_api_key
    ```

2. Place your bank statement PDFs in the `uploads/bank_statements` directory, or use the upload API endpoint.

## API Endpoints

### Upload and Parse a Bank Statement

```
POST /api/bank-statements/upload
```

Request:

- Content-Type: `multipart/form-data`
- Form field: `bankStatement` (file)

Response:

```json
{
    "success": true,
    "data": {
        "accountBalance": 12345.67,
        "transactions": [
            {
                "name": "GROCERY STORE PURCHASE",
                "date": "2023-04-15",
                "amount": -45.99,
                "category": "food"
            },
            {
                "name": "SALARY DEPOSIT",
                "date": "2023-04-01",
                "amount": 3000.0,
                "category": "salary"
            }
        ]
    }
}
```

### List Available Bank Statements

```
GET /api/bank-statements/list
```

Response:

```json
{
    "success": true,
    "data": ["bank-statement-april-2023.pdf", "bank-statement-may-2023.pdf"]
}
```

### Parse a Specific Bank Statement

```
GET /api/bank-statements/parse/:filename
```

Parameters:

- `:filename` - The name of the PDF file to parse

Response: Same format as the upload endpoint.

### Parse All Bank Statements

```
GET /api/bank-statements/parse-all
```

Response:

```json
{
    "success": true,
    "data": {
        "bank-statement-april-2023.pdf": {
            "accountBalance": 12345.67,
            "transactions": [
                // ...transactions
            ]
        },
        "bank-statement-may-2023.pdf": {
            "accountBalance": 13456.78,
            "transactions": [
                // ...transactions
            ]
        }
    }
}
```

## JSON Response Format

The parsed bank statement data includes:

```json
{
  "accountBalance": number,
  "transactions": [
    {
      "name": string,
      "date": string,  // in YYYY-MM-DD format
      "amount": number,  // positive for deposits, negative for withdrawals
      "category": string  // e.g., "food", "entertainment", "transportation", etc.
    }
  ],
  "statementDate": string,  // optional
  "accountNumber": string,  // optional
  "bankName": string  // optional
}
```

## Usage Example

Using curl to upload a bank statement:

```bash
curl -X POST -F "bankStatement=@path/to/your/statement.pdf" http://localhost:3000/api/bank-statements/upload
```

## How It Works

The bank statement parser works by:

1. Extracting text content from the PDF using pdf-parse
2. Processing this text with OpenAI's GPT-4o model
3. Extracting structured data from the model's response
4. Returning the data in a consistent JSON format

This approach eliminates the need for image conversion and works with any PDF that contains extractable text.

## Limitations

- The service works best with PDFs that have properly extractable text
- PDFs that are primarily image-based or scanned documents may not work well with this approach
- Very large PDFs may exceed token limits or require chunking
- Processing is done using OpenAI's API and may incur costs
- The quality of extraction depends on the structure and clarity of the PDF text

## Performance Considerations

- Text extraction is generally faster than image-based processing
- Properly formatted PDFs with clear transaction data will yield the best results
- Consider the API usage costs when processing multiple or large PDF documents
