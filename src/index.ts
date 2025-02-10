import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from 'langchain/document';
import * as fs from 'fs/promises';
import pdf from 'pdf-parse';
import * as path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { CohereEmbeddings } from "@langchain/cohere";
import { Chroma } from '@langchain/community/vectorstores/chroma';

const app = express();
const port = process.env.PORT || 3000;

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const COHERE_API_KEY = process.env.COHERE_API_KEY!;
const DATA_DIRECTORY = path.join(__dirname, '../data');
const CHROMA_COLLECTION_NAME = 'chatbot-collection';

// Initialize clients and models
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const embeddings = new CohereEmbeddings({
  apiKey: COHERE_API_KEY,
  model: 'embed-multilingual-v3.0',
});
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

app.use(express.json());

/**
 * Preprocesses the raw text extracted from a PDF.
 * - Normalizes whitespace.
 * - Removes non-printable characters.
 * - Optionally removes known header/footer patterns.
 *
 * Modern embeddings are trained on minimally processed text;
 * therefore, we avoid heavy processing (such as stripping punctuation or stop words).
 */
function preprocessText(text: string): string {
  // Normalize whitespace (convert multiple spaces/newlines to a single space)
  let processed = text.replace(/\s+/g, ' ').trim();
  return processed;
}

// PDF Upload and Processing Endpoint
app.post('/upload', async (req, res): Promise<any> => {
  try {
    const files = await fs.readdir(DATA_DIRECTORY);
    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

    let rawDocs: Document[] = [];
    for (const pdfFile of pdfFiles) {
      const filePath = path.join(DATA_DIRECTORY, pdfFile);
      const fileContent = await fs.readFile(filePath);
      const pdfData = await pdf(fileContent);
      // Preprocess extracted text to remove extraneous whitespace and artifacts
      const cleanText = preprocessText(pdfData.text);
      rawDocs.push(new Document({
        pageContent: cleanText,
        metadata: { source: pdfFile }
      }));
    }

    // Text splitting: adjust chunk size/overlap as needed for your use case
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,       // Adjust this based on token limits and document length
      chunkOverlap: 100,    // Overlap helps preserve context between chunks
    });
    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log(`Split document into ${docs.length} chunks`);

    // Add documents to the vector store
    const chromaStore = await Chroma.fromDocuments(docs, embeddings, { collectionName: CHROMA_COLLECTION_NAME });
    const count = await chromaStore.collection?.count();
    console.log(`Documents in collection: ${count}`);
    console.log('Documents added to ChromaDB');
    return res.json({ success: true, chunksAdded: docs.length });
  } catch (error: any) {
    console.error("Error ingesting data:", error);
    return res.status(500).json({ error: 'Failed to ingest data', details: error.message });
  }
});

// Helper function to retrieve (or create) a Chroma vector store
const createChromaStore = async (embeddings: CohereEmbeddings, collectionName: string) => {
  try {
    return await Chroma.fromExistingCollection(embeddings, { collectionName });
  } catch (e) {
    console.log(`Collection "${collectionName}" not found, creating a new one.`);
    return new Chroma(embeddings, { collectionName });
  }
};

// Chat Endpoint with RAG
app.post('/chat', async (req, res): Promise<any> => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Retrieve relevant context from vector store
    const vectorStore = await createChromaStore(embeddings, CHROMA_COLLECTION_NAME);
    const results = await vectorStore.similaritySearch(message);
    const context = results.map(r => r.pageContent).join('\n\n');
    console.log("Retrieved context:", context);

    // Build a prompt using the context and user query
    const prompt = `Инструкции:
- Ты чат бот помощник для студентов. Я предоставлю тебе методические указания для выполнения лабораторных работ, и ты должен помочь, не давая прямых ответов, а лишь наводя на размышления.
- Если речь идёт о предоставленном методическом материале, вместо слова "контекст" используй "методические указания".
- Будь полезен и отвечай, используя предоставленный материал; если не знаешь ответа, скажи "Я не знаю".
Контекст:
${context}

Вопрос: ${message}
Ответ:`;
    
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
