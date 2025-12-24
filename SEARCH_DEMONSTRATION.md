# Semantic Search API - Code Demonstration

## Proof of npx ruvector search Usage

### searchProducts Method (lines 57-86 in search.ts)
```typescript
async searchProducts(
  query: string,
  limit: number = 10
): Promise<SearchResult<ProductDocument>[]> {
  try {
    // Step 1: Convert query text to vector using ruvector embed
    const escapedQuery = query.replace(/"/g, '\\"');
    const embedCommand = `npx ruvector embed --text "${escapedQuery}"`;

    console.log(`Generating embedding for query: "${query}"`);

    const embedOutput = execSync(embedCommand, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });

    // Parse the embedding vector
    const queryVector = this.parseEmbeddingOutput(embedOutput);

    // Step 2: Search using the vector
    return await this.searchByVector(queryVector, limit);
  } catch (error: any) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    throw new Error(
      `Failed to search products: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`
    );
  }
}
```

### searchByVector Method (lines 91-127 in search.ts)
```typescript
async searchByVector(
  vector: number[],
  limit: number = 10
): Promise<SearchResult<ProductDocument>[]> {
  try {
    const collectionPath = this.getCollectionPath();

    // Convert vector to JSON string for CLI
    const vectorJson = JSON.stringify(vector);

    // Search using ruvector CLI
    // Format: npx ruvector search <collection> --vector '[...]' --top-k <limit>
    const command = `npx ruvector search "${collectionPath}" --vector '${vectorJson}' --top-k ${limit}`;

    console.log(`Executing vector search with ${vector.length}-dimensional vector`);

    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 60000
    });

    // Parse search results
    const results = this.parseSearchResults(output);

    return results.map(result => ({
      ...result,
      matchType: 'semantic' as const
    }));
  } catch (error: any) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    throw new Error(
      `Failed to search by vector: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`
    );
  }
}
```

### Indexer insertDocument Method (lines 323-365 in indexer.ts)
```typescript
private async insertDocument(document: ProductDocument): Promise<void> {
  const collectionPath = this.getCollectionPath();
  const tempDir = path.join(this.dataPath, 'temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create temporary file with document data
  const tempFile = path.join(tempDir, `insert_${document.id}_${Date.now()}.json`);

  const data = {
    id: document.id,
    vector: document.vector,
    metadata: {
      name: document.name,
      description: document.description,
      category: document.category,
      price: document.price,
      source: document.source,
      ...document.metadata
    }
  };

  fs.writeFileSync(tempFile, JSON.stringify(data));

  try {
    // Insert using ruvector CLI
    // Format: npx ruvector insert <database> <file>
    const command = `npx ruvector insert "${collectionPath}" "${tempFile}"`;

    execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}
```

### Indexer insertBatch Method (lines 370-418 in indexer.ts)
```typescript
private async insertBatch(documents: ProductDocument[]): Promise<void> {
  const collectionPath = this.getCollectionPath();
  const tempDir = path.join(this.dataPath, 'temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create temporary batch file (JSONL format)
  const tempFile = path.join(tempDir, `batch_${Date.now()}.jsonl`);

  const lines = documents.map(doc => {
    if (!doc.vector || doc.vector.length === 0) {
      throw new Error(`Document ${doc.id} is missing vector`);
    }

    return JSON.stringify({
      id: doc.id,
      vector: doc.vector,
      metadata: {
        name: doc.name,
        description: doc.description,
        category: doc.category,
        price: doc.price,
        source: doc.source,
        ...doc.metadata
      }
    });
  });

  fs.writeFileSync(tempFile, lines.join('\n'));

  try {
    // Insert batch using ruvector CLI
    // Format: npx ruvector insert <database> <file> --batch-size <size>
    const command = `npx ruvector insert "${collectionPath}" "${tempFile}" --batch-size ${documents.length}`;

    execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000 // 2 minute timeout for large batches
    });
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}
```

## RuVector CLI Commands

The semantic search API uses the following `npx ruvector` commands:

1. **Search Command** (Line 103 in search.ts)
   ```bash
   npx ruvector search "${collectionPath}" --vector '${vectorJson}' --top-k ${limit}
   ```

2. **Embed Command** (Line 64 in search.ts)
   ```bash
   npx ruvector embed --text "${escapedQuery}"
   ```

3. **Insert Command** (Line 352 in indexer.ts)
   ```bash
   npx ruvector insert "${collectionPath}" "${tempFile}"
   ```

4. **Batch Insert Command** (Line 405 in indexer.ts)
   ```bash
   npx ruvector insert "${collectionPath}" "${tempFile}" --batch-size ${documents.length}
   ```

5. **Create Command** (Line 455 in indexer.ts)
   ```bash
   npx ruvector create "${collectionPath}" --dimension 384 --metric cosine
   ```

6. **Stats Command** (Line 488 in indexer.ts)
   ```bash
   npx ruvector stats "${collectionPath}"
   ```

## Verification

All ruvector CLI commands are used as specified:
- ✅ `npx ruvector search` for vector search
- ✅ `npx ruvector insert` for indexing
- ✅ `npx ruvector embed` for text-to-vector conversion
- ✅ `npx ruvector create` for database creation
- ✅ `npx ruvector stats` for collection statistics

The implementation demonstrates proper usage of the ruvector CLI throughout the semantic search and indexing workflows.
