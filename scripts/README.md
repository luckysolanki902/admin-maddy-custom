# Database Sync Script

This script clears all test database collections and copies all collections from production database to test database.

## Prerequisites

- Node.js installed
- MongoDB connection strings for both production and test databases
- Environment variables properly configured

## Setup

1. Create a `.env` or `.env.local` file in the project root with:
   ```
   PROD_DB_URI=mongodb+srv://username:password@prod-cluster.mongodb.net/prod-db
   TEST_DB_URI=mongodb+srv://username:password@test-cluster.mongodb.net/test-db
   ```

2. Ensure the MongoDB connection strings have the necessary permissions:
   - Read access to production database
   - Read/Write access to test database

## Usage

### Method 1: Using npm script (Recommended)
```bash
npm run sync-db
```

### Method 2: Direct execution
```bash
node scripts/sync-prod-to-test.js
```

### Method 3: Using PowerShell
```powershell
node scripts\sync-prod-to-test.js
```

## What it does

1. **Connects** to both production and test databases
2. **Clears** all collections in the test database
3. **Copies** all collections from production to test database
4. **Maintains** collection structure even for empty collections
5. **Reports** detailed statistics about the sync process

## Safety Features

- ✅ Only affects the TEST database (never touches production)
- ✅ Validates environment variables before execution
- ✅ Provides detailed logging of all operations
- ✅ Handles errors gracefully with cleanup
- ✅ Shows progress and statistics

## Output Example

```
🚀 Starting database sync process...

✅ Environment variables loaded successfully
📊 Production DB: mongodb+srv://***:***@prod-cluster.mongodb.net/prod-db
🧪 Test DB: mongodb+srv://***:***@test-cluster.mongodb.net/test-db

🔗 Connecting to production database...
✅ Connected to production database
🔗 Connecting to test database...
✅ Connected to test database

🧹 Step 1: Clearing test database...
📝 Found 15 collections to drop
   ✅ Dropped collection: users
   ✅ Dropped collection: products
   ...

📋 Step 2: Copying collections from production...
📝 Found 15 collections in production
   📊 Processing collection 1/15: users
   ✅ Copied 1,234 documents to users
   ...

📊 Sync Summary:
   📁 Collections copied: 15
   📄 Total documents copied: 12,345
   ⏱️  Total time: 45.67s

🎉 Database sync completed successfully!
```

## Error Handling

If the script fails, it will:
- Display a clear error message
- Clean up any open database connections
- Exit with error code 1

## Security Notes

- Database credentials are loaded from environment files
- Connection strings with credentials are masked in console output
- Script requires explicit environment variables (no hardcoded URIs)

## Troubleshooting

1. **"Environment variable not set"**: Ensure PROD_DB_URI and TEST_DB_URI are in your .env file
2. **Connection errors**: Verify your MongoDB connection strings and network access
3. **Permission errors**: Ensure your database user has appropriate read/write permissions
4. **Memory issues**: For very large databases, the script processes collections one at a time to minimize memory usage
