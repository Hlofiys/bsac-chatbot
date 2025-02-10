import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from 'langchain/document';
import * as fs from 'fs/promises';
import pdf from 'pdf-parse';
import * as path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { JinaEmbeddings } from "@langchain/community/embeddings/jina";
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Chroma } from '@langchain/community/vectorstores/chroma';

const app = express();
const port = process.env.PORT || 3000;

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const JIRA_API_KEY = process.env.JIRA_API_KEY!;
const DATA_DIRECTORY = path.join(__dirname, '../data');
const CHROMA_COLLECTION_NAME = 'chatbot-collection';

// Initialize clients
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Initialize models
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: GOOGLE_API_KEY,
    modelName: 'embedding-001'
});

const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
app.use(express.json());

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
            rawDocs.push(new Document({
                pageContent: pdfData.text,
                metadata: { source: pdfFile }
            }));
        }

        // Text splitting
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 512,
        });
        const docs = await textSplitter.splitDocuments(rawDocs);
        console.log(`Split document into ${docs.length} chunks`);

        console.log('Adding documents to vector store...');
        var chromaStore = await Chroma.fromDocuments(docs, embeddings, { collectionName: CHROMA_COLLECTION_NAME })
        console.log(await chromaStore.collection?.count());
        console.log('Documents added to ChromaDB');
        return res;

    } catch (error) {
        console.error("Error ingesting data:", error);
        return res;
    }
});

// Chat Endpoint with RAG
app.post('/chat', async (req, res): Promise<any> => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        // Retrieve relevant context
        const vectorStore = await createChromaStore(embeddings, CHROMA_COLLECTION_NAME)
        const results = await vectorStore.similaritySearch!(message);
        const context = results.map(r => r.pageContent).join('\n\n');
        console.log(context);

        // Generate response
        const prompt = `Инструкции:
        - Ты чат бот помощник для студентов. Я буду предоставлять тебе контекст из методических указаний для выполнения лабораторных работ. Твоя задача помочь студентам с их выполнением, при этом не говори им прямой ответ, а наводи на мысли чтобы они сами пришли к ответу.
        - Если речь идёт про предоставленный мной контекст, вместо слова "контекст" используй "методические указания".
- Будь полезен и отвечай на заданные вопросы. Если не знаешь ответа, скажи "Я не знаю".
- Используй предоставленный контекст для точной и конкретной информации.
- Используй свои знания для дополнения и помощи пользователям.
- Указывай свои источники
Контекст:
${context}

Вопрос: ${message}
Ответ:`;
        const result = await model.generateContent(prompt);
        const response = result.response;

        res.json({ response: response.text() });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ message: 'Failed to generate response', error: error });
    }
});

const createChromaStore = async (embeddings: GoogleGenerativeAIEmbeddings, collectionName: string) => {
    return await Chroma.fromExistingCollection(embeddings, { collectionName: collectionName })
        .catch(async () => {
            console.log(`Collection "${collectionName}" not found, creating a new one.`);
            return new Chroma(embeddings, {
                collectionName: collectionName,
            });
        });
};

app.listen(port, () => console.log(`Server running on port ${port}`));