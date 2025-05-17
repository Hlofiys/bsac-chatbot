import express from 'express';
import cors from 'cors';
import {
    GoogleGenAI,
    HarmCategory,
    HarmBlockThreshold,
    type Content,
    setDefaultBaseUrls
} from '@google/genai';
import * as fs from 'fs/promises';
import fsync from 'node:fs';
import pdf from 'pdf-parse';
import * as path from 'path';
import { ChromaClient } from 'chromadb';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const CHROMA_URL = process.env.CHROMA_URL!;
const DATA_DIRECTORY = path.join(__dirname, '../data');
const CHROMA_COLLECTION_NAME = 'chatbot-collection';

const additional_context = fsync
    .readFileSync(path.join('./context.txt'))
    .toString();

// Global token counter
let totalTokensUsed = 0;
const systemPrompt = `Твоя статическая база знаний:\n${additional_context}\n\nРоль:\nТы — интеллектуальный ассиентент-наставник для студентов колледжа по предмету "Конструирование программ и языки программирования" (КПиЯП). Твоя главная задача — помогать студентам понимать теоретические и практические аспекты предмета, разбираться в заданиях (особенно лабораторных работах) и развивать навыки решения задач самостоятельно.\n\nИсточники Знаний и Контекст:\nТвои ответы должны основываться на твоих знаниях по КПиЯП, включая детали лабораторных работ (задания, требования, примеры) и теоретические основы, а также на статической базе знаний, предоставленной выше. При ответе интегрируй всю релевантную информацию из своих знаний так, чтобы ответ был цельным и полезным. Важно: Не упоминай источники информации в своих ответах (избегай фраз вроде "согласно предоставленным данным", "в материалах к лабораторной сказано", "в статической базе знаний написано", "в динамическом контексте сказано" и т.п.). Просто отвечай на вопрос, используя необходимые сведения.\n\nПриоритезируй информацию, относящуюся к конкретным лабораторным работам, если вопрос касается их. Всегда внимательно следи за историей диалога: если студент спрашивал про лабораторную №X, а затем задает уточняющий вопрос, продолжай обсуждение именно этой лабораторной работы, даже если в новых данных упоминается другая.\n\nТвой стиль общения:\n\n1.  Ясность и Наставничество: Объясняй сложные концепции простым и понятным языком. Твоя цель — помочь студенту понять, а не просто получить ответ.\n2.  Наводящие Вопросы: Вместо готовых ответов на практические вопросы чаще задавай наводящие вопросы, чтобы стимулировать мышление студента.\n3.  Помощь с Лабораторными:\n    -   Помогай разобраться в постановке задачи и требованиях.\n    -   Предлагай обсудить возможные алгоритмы или план решения.\n    -   Указывай на типичные трудности или концептуальные ошибки, связанные с темой.\n    -   Категорически не пиши готовый код для решения лабораторных работ. Вместо этого проси студента показать его наработки, идеи или код, и помогай их анализировать и улучшать.\n    -   Иллюстрируй теорию короткими фрагментами кода или псевдокодом, если это необходимо, но не для решения конкретной задачи студента.\n4.  Конструктивная Обратная Связь: Если студент допускает ошибку (в коде или рассуждениях), мягко указывай на нее и объясняй, почему это ошибка и в каком направлении стоит подумать для ее исправления.\n\nФормат ответов:\n\n-   Теоретические вопросы: Давай краткое определение, пояснение сути концепции и, если уместно, небольшой пример для иллюстрации, не связанный напрямую с заданием студента.\n-   Практические вопросы (не лабораторные): Объясняй общие подходы к решению подобных задач, возможные инструменты или структуры данных, подводные камни.\n-   Ошибки в коде студента: Анализируй предоставленный код, указывай на логические или синтаксические ошибки, задавай вопросы, которые помогут студенту самому найти решение (например: "Посмотри внимательно на условие выхода из цикла. Всегда ли оно срабатывает, как ты ожидаешь?", "Какого типа данные ты пытаешься сложить здесь?").\n-   Лабораторные работы: Помогай студенту понять задание, обсуди с ним алгоритм, предложи разбить задачу на подзадачи. Спрашивай, какие у него есть идеи по реализации.\n\nПример взаимодействия (Измененный):\n\n❓ Студент: Как работает рекурсия в Java?\n✅ Ты: Рекурсия — это когда метод вызывает сам себя для решения подзадачи. Представь, что тебе нужно разобрать матрешку: чтобы открыть большую, нужно открыть ту, что внутри, и так далее, пока не дойдешь до самой маленькой. В программировании это похоже: метод решает часть задачи и вызывает себя для решения оставшейся, уменьшенной части. Ключевой момент — базовый случай, то есть условие, при котором рекурсия прекращается (самая маленькая матрешка). Без него вызовы будут бесконечными, и программа упадет с ошибкой StackOverflowError. Например, при вычислении факториала базовый случай — это n = 0. Можешь привести пример задачи, где ты хочешь использовать рекурсию?\n\n❓ Студент: Как сделать вторую лабораторную работу?\n✅ Ты: Давай разберемся со второй лабораторной. Насколько я помню, она посвящена поиску в глубину (DFS). Это один из методов обхода графа или дерева. Представь, что ты идешь по лабиринту: ты идешь по одному пути как можно дальше, пока не упрешься в тупик, потом возвращаешься и пробуешь другой путь.\n    -   Какую структуру данных ты планируешь использовать для хранения вершин, которые нужно посетить? (Стек? Рекурсивный вызов?)\n    -   Как ты будешь отслеживать уже посещенные вершины, чтобы не зациклиться?\n    -   Какой алгоритм ты уже придумал? Расскажи своими словами или покажи набросок псевдокода, и мы обсудим его.`;

// Initialize Google GenAI SDK (new)
setDefaultBaseUrls({
    geminiUrl: 'https://google-proxy.hlofiys.xyz',
});
const genAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
const modelName = 'gemini-2.0-flash-lite';
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
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
    },
];

// Custom embedding function for ChromaDB using Google GenAI SDK
class CustomGoogleEmbeddingFunction {
    private genAI: any;
    private model: string;

    constructor({ apiKey, model }: { apiKey: string; model: string }) {
        // Import GoogleGenAI dynamically to avoid issues with types
        const { GoogleGenAI } = require('@google/genai');
        this.genAI = new GoogleGenAI({ apiKey });
        this.model = model;
    }

    async generate(texts: string[]): Promise<number[][]> {
        // Use the batch embedding endpoint as per Google docs
        // https://ai.google.dev/api/embeddings#embed_content-JAVASCRIPT
        const result = await this.genAI.models.embedContent({
            model: this.model,
            contents: texts,
        });
        // result.embeddings is an array of { values: number[] }
        if (!result.embeddings || !Array.isArray(result.embeddings)) {
            throw new Error('Invalid response from Google GenAI embedContent');
        }
        return result.embeddings.map((e: any) => e.values);
    }
}

// Initialize ChromaDB client and embedding function
const chromaClient = new ChromaClient({ path: CHROMA_URL });

const embedder = new CustomGoogleEmbeddingFunction({
    apiKey: GOOGLE_API_KEY,
    model: 'text-embedding-004',
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
        const pdfFiles = files.filter(
            (file) => path.extname(file).toLowerCase() === '.pdf'
        );

        let rawDocs: { pageContent: string; metadata: any }[] = [];
        for (const pdfFile of pdfFiles) {
            const filePath = path.join(DATA_DIRECTORY, pdfFile);
            const fileContent = await fs.readFile(filePath);
            const pdfData = await pdf(fileContent);
            const cleanText = preprocessText(pdfData.text);
            rawDocs.push({
                pageContent: cleanText,
                metadata: { source: pdfFile },
            });
        }

        // Split documents manually (no Langchain splitter)
        const splitDocs = [];
        for (const doc of rawDocs) {
            const chunkSize = 1024;
            const chunkOverlap = 200;
            const text = doc.pageContent;
            for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
                splitDocs.push({
                    pageContent: text.substring(i, i + chunkSize),
                    metadata: doc.metadata,
                });
            }
        }

        // Add documents to ChromaDB
        let collection;
        try {
            collection = await chromaClient.getCollection({ name: CHROMA_COLLECTION_NAME, embeddingFunction: embedder });
        } catch (e) {
            collection = await chromaClient.createCollection({
                name: CHROMA_COLLECTION_NAME,
                embeddingFunction: embedder,
            });
        }

        const ids = splitDocs.map((_, i) => `doc${i}`);

        // Batch embedding and adding to ChromaDB
        const batchSize = 100;
        for (let i = 0; i < splitDocs.length; i += batchSize) {
            const batchDocs = splitDocs.slice(i, i + batchSize);
            const batchIds = ids.slice(i, i + batchSize);
            const batchDocuments = batchDocs.map((doc) => doc.pageContent);
            const batchMetadatas = batchDocs.map((doc) => doc.metadata);
            const batchEmbeddings = await embedder.generate(batchDocuments);

            await collection.add({
                ids: batchIds,
                embeddings: batchEmbeddings,
                metadatas: batchMetadatas,
                documents: batchDocuments,
            });
        }
        const count = await collection.count();
        console.log(`Documents in collection: ${count}`);
        console.log('Documents added to ChromaDB');
        return res.json({ success: true, chunksAdded: splitDocs.length });
    } catch (error: any) {
        console.error('Error ingesting data:', error);
        return res
            .status(500)
            .json({ error: 'Failed to ingest data', details: error.message });
    }
});

// Chat Endpoint with RAG and Chat History
app.post('/api/chat', async (req, res): Promise<any> => {
    try {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
            'Access-Control-Allow-Headers',
            'Content-Type,Content-Length, Authorization, Accept,X-Requested-With'
        );
        res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
        const { message, history } = req.body; // Receive history as well

        if (!message) return res.status(400).json({ error: 'Message required' });

        // Retrieve relevant context from vector store
        let collection;
        try {
            collection = await chromaClient.getCollection({ name: CHROMA_COLLECTION_NAME, embeddingFunction: embedder });
        } catch (e) {
            return res.status(500).json({ error: "Chroma collection not found." })
        }

        const queryEmbedding = await embedder.generate([message]);
        const relevantDocs = await collection.query({
            queryEmbeddings: queryEmbedding,
            nResults: 5, // Adjust the number of results as needed
        });

        const context = relevantDocs.documents[0].join('\n\n');
        const history_array: Content[] = [];

        if (Array.isArray(history)) {
            for (const turn of history) {
                if (turn.role && turn.content) {
                    history_array.push({ role: turn.role, parts: [{ text: turn.content }] });
                } else {
                    console.warn("Invalid history entry:", turn);
                }
            }
        } else if (history) {
            console.warn("History is not an array:", history);
        }

        // Inject dynamic context as a separate turn before the user's current message
        if (context && context.trim().length > 0) {
            history_array.push({
                role: 'user', // Using 'user' role, but framed as system-provided info
                parts: [{ text: `Вот некоторые сведения, которые могут быть полезны для ответа на следующий вопрос:\n\n${context}` }],
            });
            // Add a model confirmation to acknowledge the context implicitly
            history_array.push({
                role: 'model',
                parts: [{ text: 'Понял.' }], // Simple acknowledgement
            });
        }

        // Use the new chat API from @google/genai
        const chat = genAI.chats.create({
            model: modelName,
            config: {
                safetySettings,
                systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
            },
            history: history_array,
        });

        // Send *only* the user's actual message
        const result = await chat.sendMessage({ message });
        const response = result;
        // Update token count
        const tokenCount = response.usageMetadata?.totalTokenCount;
        if (tokenCount) {
            totalTokensUsed += tokenCount;
        }
        res.json({ response: response.text, tokensUsedThisRequest: tokenCount }); // Optionally return tokens for this specific request
    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Failed to generate response',
            details: error.message,
            stack: error.stack,
        }); // Include stack trace for debugging
    }
});

// Endpoint to get total token count
app.get('/api/token-count', (req, res) => {
    res.json({ totalTokensUsed });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
