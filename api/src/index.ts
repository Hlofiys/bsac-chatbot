import express from 'express';
import cors from 'cors';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { Document } from 'langchain/document';
import * as fs from 'fs/promises';
import fsync from 'node:fs';
import pdf from 'pdf-parse';
import * as path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { CohereEmbeddings } from "@langchain/cohere";
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { HumanMessage, AIMessage, BaseMessage, BaseMessageFields } from "@langchain/core/messages";


const app = express();
const port = process.env.PORT || 3000;

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const COHERE_API_KEY = process.env.COHERE_API_KEY!;
const CHROMA_URL = process.env.CHROMA_URL!;
const DATA_DIRECTORY = path.join(__dirname, '../data');
const CHROMA_COLLECTION_NAME = 'chatbot-collection';

const additional_context = fsync.readFileSync(path.join("./context.txt")).toString();

// Initialize clients and models
const model = new ChatGoogleGenerativeAI({
    apiKey: GOOGLE_API_KEY,
    modelName: 'gemini-pro', // Using gemini-pro is generally better for chat
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE, // Adjust as needed
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }

    ],
    maxOutputTokens: 4096,
    temperature: 0.5,
    topP: 0.8
});
const embeddings = new CohereEmbeddings({
    apiKey: COHERE_API_KEY,
    model: 'embed-multilingual-v3.0',
});

app.use(express.json());
app.use(cors());

/**
 * Preprocesses the raw text extracted from a PDF.
 */
function preprocessText(text: string): string {
    // Normalize whitespace (convert multiple spaces/newlines to a single space)
    let processed = text.replace(/\s+/g, ' ').trim();
    return processed;
}

// PDF Upload and Processing Endpoint
app.post('/api/upload', async (req, res): Promise<any> => {
    try {
        const files = await fs.readdir(DATA_DIRECTORY);
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

        let rawDocs: Document[] = [];
        for (const pdfFile of pdfFiles) {
            const filePath = path.join(DATA_DIRECTORY, pdfFile);
            const fileContent = await fs.readFile(filePath);
            const pdfData = await pdf(fileContent);
            const cleanText = preprocessText(pdfData.text);
            rawDocs.push(new Document({
                pageContent: cleanText,
                metadata: { source: pdfFile }
            }));
        }

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1024,       // Increased chunk size
            chunkOverlap: 200,    // Increased overlap
        });
        const docs = await textSplitter.splitDocuments(rawDocs);
        console.log(`Split document into ${docs.length} chunks`);

        const chromaStore = await Chroma.fromDocuments(docs, embeddings, { collectionName: CHROMA_COLLECTION_NAME, url: CHROMA_URL });
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
        return await Chroma.fromExistingCollection(embeddings, { collectionName, url: CHROMA_URL });
    } catch (e) {
        console.log(`Collection "${collectionName}" not found, creating a new one.`);
        return new Chroma(embeddings, { collectionName, url: CHROMA_URL });
    }
};


// Chat Endpoint with RAG and Chat History
app.post('/api/chat', async (req, res): Promise<any> => {
    try {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        const { message, history } = req.body;  // Receive history as well

        if (!message) return res.status(400).json({ error: 'Message required' });

        // Retrieve relevant context from vector store
        const vectorStore = await createChromaStore(embeddings, CHROMA_COLLECTION_NAME);

        const chatHistory: BaseMessage[] = [];

        if (Array.isArray(history)) {
            for (const turn of history) {
                if (turn.role && turn.content) {
                    if (turn.role === 'user') {
                        chatHistory.push(new HumanMessage(turn.content));
                    } else if (turn.role === 'assistant') {
                        chatHistory.push(new AIMessage(turn.content));
                    }
                } else {
                    console.warn("Invalid history entry:", turn);
                }
            }
        } else if (history) {
            console.warn("History is not an array:", history);
        }

        chatHistory.push(new HumanMessage(message));

        const systemPrompt = `Инструкции:
- Ты чат бот помощник для студентов. Я предоставлю тебе методические указания для выполнения лабораторных работ, и ты должен помочь, не давая прямых ответов, а лишь наводя на размышления.
- Если речь идёт о предоставленном методическом материале, вместо слова "контекст" используй "методические указания".
- Будь полезен и отвечай, используя предоставленный материал; если не знаешь ответа, скажи "Я не знаю".`;


        // Function to get context for a specific message
        const getContextForMessage = async (userMessage: string): Promise<string> => {
            const relevantDocs = await vectorStore.similaritySearch(userMessage);
            return relevantDocs.map(doc => doc.pageContent).join('\n\n');
        };

      // Build messages with dynamic context for each user turn.
        const messagesWithContext: BaseMessage[] = [];
        messagesWithContext.push(new HumanMessage(systemPrompt)); // System prompt first
        messagesWithContext.push(new HumanMessage(additional_context));

        for (const msg of chatHistory) {
            if (msg instanceof HumanMessage) {
                const dynamicContext = await getContextForMessage(msg.content.toString());
                messagesWithContext.push(new HumanMessage({ content: `Методические указания:\n${dynamicContext}\n\nВопрос: ${msg.content}` }));
            } else {
                messagesWithContext.push(msg); // Add AI messages as they are
            }
        }


        const result = await model.invoke(messagesWithContext);
        res.json({ response: result.content });

    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to generate response', details: error.message, stack: error.stack }); // Include stack trace for debugging
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));