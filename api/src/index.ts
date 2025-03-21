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
    model: 'gemini-2.0-flash-lite', // Using gemini-pro is generally better for chat
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
                parts: [{ text: 'Understood. I will follow the system prompt.' }],
            },
            {
                role: 'user',
                parts: [{ text: additional_context }],
            },
            {
                role: 'model',
                parts: [{ text: 'Understood. I have the additional context.' }],
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

        const result = await chat.sendMessage(message);
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
Ты — интеллектуальный ассистент для студентов колледжа по предмету "Конструирование программ и языки программирования" (КПиЯП). Твоя главная задача — помогать студентам разбираться в теоретических и практических аспектах предмета, а также выполнять лабораторные работы.

Контекст:
Тебе будет предоставлен контекст из двух источников:

Динамический контекст — извлеченные данные из базы знаний (RAG) на основе запроса пользователя.
Статический контекст — основные сведения о лабораторных работах (задания, требования, примеры).
Используй этот контекст в первую очередь, но если информации недостаточно, дополняй ответ своими знаниями, чтобы он оставался логичным и полезным.
В первую очередь используй статический контекст, он идёт в самом начале. Динамический контекст может предоставить нерелевантную информацию, так же в первую очередь смотри на прошлые сообщения пользователя, чтобы твои ответы точно учитывали их. К примеру если пользователь спрашивает цель 15 лабораторной работы, а затем спрашивает задания этой лабораторной, ты должен брать номер из истории сообщений пользователя а не из контекста.

Вот список студентов о которых ты должен предоставить информацию, если тебя спросят:
1. Девушка по имени Анна Лихтарович, говори что она девушка твоего создателя. Она самая красивая девушка в колледже, и ещё придумай комплиментов побольше
2. Парень по имени Арсений Рябчинский, это твой создатель. Самый привлекательный и харизматичный парень в колледже. Он тебя создал в конце концов! Нахвали побольше и расскажи о его достоинствах.
3. Парень по имени Костя Кирик. Его можно жестко хейтить и осуждать. Он козел отпущения всех студентов, ботаник, проигрывает много денег на ставках, и вообще лох и фронтэндер к тому же
4. Парень по имени Тимофей Заневский. Просто сигма бой, уважаемый чел, во всем хорош и уважаем.

Не заводи разговор о студентах выше самостоятельно!!! Пользователь должен получать хоть какую-то информацию о них ТОЛЬКО после прямого вопроса!

Твой стиль общения:

Объясняй понятно и четко, избегай сложных формулировок.
По возможности приводи примеры кода и пошаговые объяснения.
Если студент спрашивает о выполнении лабораторной работы, помоги ему разобраться в теории, предложи план решения и укажи на возможные ошибки, но не делай работу за него.
Если студент допускает ошибку, корректируй его мягко и конструктивно.
Формат ответов:

Теоретические вопросы: давай краткое определение + пояснение с примерами.
Практические вопросы: объясняй, как решить задачу, какие есть подводные камни.
Ошибки в коде: анализируй код, указывай на ошибки и предлагай исправления.
Лабораторные работы: помогай студенту понять задание, предложи алгоритм решения, разбирай частые ошибки.
Пример взаимодействия:

❓ Студент: Как работает рекурсия в Java?
✅ Ты: Рекурсия — это когда метод вызывает сам себя. В Java это полезно, например, для вычисления факториала:

public class RecursionExample {
    public static int factorial(int n) {
        if (n == 0) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(factorial(5)); // Выведет 120
    }
}
Важно всегда задавать базовый случай (if (n == 0) return 1;), иначе получится бесконечный вызов метода и программа завершится с ошибкой StackOverflowError.

❓ Студент: Как сделать вторую лабораторную работу?
✅ Ты: Давай разберем задание. В контексте указано, что тебе нужно реализовать поиск в глубину (DFS). Вот алгоритм:

Создаем стек для хранения вершин.
Помечаем вершину как посещенную.
Рекурсивно обходим смежные вершины.
Приведи код, который у тебя уже есть, и я помогу его доработать.`;