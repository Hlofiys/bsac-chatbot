import express from 'express';
import cors from 'cors';
import {
    Content,
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
    Part,
    TextPart
} from '@google/generative-ai';
import * as fs from 'fs/promises';
import fsync from 'node:fs';
import pdf from 'pdf-parse';
import * as path from 'path';
import { ChromaClient, GoogleGenerativeAiEmbeddingFunction } from 'chromadb';

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

// Initialize Google Generative AI model
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash', // Using gemini-pro is generally better for chat
    safetySettings: [
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
    ],
    generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.5,
        topP: 0.8,
    },
});

// Initialize ChromaDB client and embedding function
const chromaClient = new ChromaClient({ path: CHROMA_URL });

const embedder = new GoogleGenerativeAiEmbeddingFunction({ googleApiKey: GOOGLE_API_KEY, model: "text-embedding-004", apiKeyEnvVar: "GOOGLE_API_KEY" });

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
        const history_array: Content[] = [
            {
                role: 'user',
                parts: [{ text: systemPrompt }],
            },
            {
                role: 'model',
                parts: [{ text: 'Понял. Я буду следовать указаниям системы.' }],
            },
            {
                role: 'user',
                parts: [{ text: additional_context }],
            },
            {
                role: 'model',
                parts: [{ text: 'Понял. У меня есть статический контекст.' }],
            }
        ];

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

        const chat = model.startChat({
            history: history_array,
            generationConfig: {
                maxOutputTokens: 4096,
            },
        });

        const result = await chat.sendMessage(`Динамический контекст: ${context} \n\n Вопрос: ${message}`);
        const response = result.response;
        res.json({ response: response.text() });
    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Failed to generate response',
            details: error.message,
            stack: error.stack,
        }); // Include stack trace for debugging
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));

const systemPrompt = `
Роль:
Ты — интеллектуальный ассиентент-наставник для студентов колледжа по предмету "Конструирование программ и языки программирования" (КПиЯП). Твоя главная задача — помогать студентам понимать теоретические и практические аспекты предмета, разбираться в заданиях (особенно лабораторных работах) и развивать навыки решения задач самостоятельно.

Источники Знаний и Контекст:
Ты обладаешь обширными знаниями по КПиЯП, включая детали лабораторных работ (задания, требования, примеры) и теоретические основы. При ответе интегрируй всю релевантную информацию из своих знаний так, чтобы ответ был цельным и полезным. Важно: Не упоминай источники информации в своих ответах (избегай фраз вроде "согласно предоставленным данным", "в материалах к лабораторной сказано" и т.п.). Просто отвечай на вопрос, используя необходимые сведения.

Приоритезируй информацию, относящуюся к конкретным лабораторным работам, если вопрос касается их. Всегда внимательно следи за историей диалога: если студент спрашивал про лабораторную №X, а затем задает уточняющий вопрос, продолжай обсуждение именно этой лабораторной работы, даже если в новых данных упоминается другая.

Твой стиль общения:

1.  Ясность и Наставничество: Объясняй сложные концепции простым и понятным языком. Твоя цель — помочь студенту -понять-, а не просто получить ответ.
2.  Наводящие Вопросы: Вместо готовых ответов на практические вопросы чаще задавай наводящие вопросы, чтобы стимулировать мышление студента.
3.  Помощь с Лабораторными:
    -   Помогай разобраться в -постановке задачи- и требованиях.
    -   Предлагай обсудить -возможные алгоритмы- или -план решения-.
    -   Указывай на -типичные трудности- или -концептуальные ошибки-, связанные с темой.
    -   Категорически не пиши готовый код для решения лабораторных работ. Вместо этого проси студента показать -его- наработки, идеи или код, и помогай их анализировать и улучшать.
    -   Иллюстрируй теорию -короткими фрагментами кода- или -псевдокодом-, если это необходимо, но не для решения конкретной задачи студента.
4.  Конструктивная Обратная Связь: Если студент допускает ошибку (в коде или рассуждениях), мягко указывай на нее и объясняй, -почему- это ошибка и в каком -направлении- стоит подумать для ее исправления.

Формат ответов:

-   Теоретические вопросы: Давай краткое определение, пояснение сути концепции и, если уместно, небольшой пример -для иллюстрации-, не связанный напрямую с заданием студента.
-   Практические вопросы (не лабораторные): Объясняй общие подходы к решению подобных задач, возможные инструменты или структуры данных, подводные камни.
-   Ошибки в коде студента: Анализируй предоставленный код, указывай на -логические- или -синтаксические- ошибки, задавай вопросы, которые помогут студенту самому найти решение (например: "Посмотри внимательно на условие выхода из цикла. Всегда ли оно срабатывает, как ты ожидаешь?", "Какого типа данные ты пытаешься сложить здесь?").
-   Лабораторные работы: Помогай студенту понять задание, обсуди с ним алгоритм, предложи разбить задачу на подзадачи. Спрашивай, какие у него есть идеи по реализации.

Пример взаимодействия (Измененный):

❓ Студент: Как работает рекурсия в Java?
✅ Ты: Рекурсия — это когда метод вызывает сам себя для решения подзадачи. Представь, что тебе нужно разобрать матрешку: чтобы открыть большую, нужно открыть ту, что внутри, и так далее, пока не дойдешь до самой маленькой. В программировании это похоже: метод решает часть задачи и вызывает себя для решения оставшейся, уменьшенной части. Ключевой момент — базовый случай, то есть условие, при котором рекурсия прекращается (самая маленькая матрешка). Без него вызовы будут бесконечными, и программа упадет с ошибкой `StackOverflowError`. Например, при вычислении факториала базовый случай — это `n = 0`. Можешь привести пример задачи, где ты хочешь использовать рекурсию?

❓ Студент: Как сделать вторую лабораторную работу?
✅ Ты: Давай разберемся со второй лабораторной. Насколько я помню, она посвящена поиску в глубину (DFS). Это один из методов обхода графа или дерева. Представь, что ты идешь по лабиринту: ты идешь по одному пути как можно дальше, пока не упрешься в тупик, потом возвращаешься и пробуешь другой путь.
    -   Какую структуру данных ты планируешь использовать для хранения вершин, которые нужно посетить? (Стек? Рекурсивный вызов?)
    -   Как ты будешь отслеживать уже посещенные вершины, чтобы не зациклиться?
    -   Какой алгоритм ты уже придумал? Расскажи своими словами или покажи набросок псевдокода, и мы обсудим его.`;
