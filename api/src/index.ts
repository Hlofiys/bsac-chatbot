import express from 'express';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
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
const CHROMA_URL = process.env.CHROMA_URL!;
const DATA_DIRECTORY = path.join(__dirname, '../data');
const CHROMA_COLLECTION_NAME = 'chatbot-collection';

// Initialize clients and models
const model = new ChatGoogleGenerativeAI({apiKey: GOOGLE_API_KEY, model: 'gemini-2.0-flash'});
const embeddings = new CohereEmbeddings({
  apiKey: COHERE_API_KEY,
  model: 'embed-multilingual-v3.0',
});

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
    return await Chroma.fromExistingCollection(embeddings, { collectionName, url: CHROMA_URL});
  } catch (e) {
    console.log(`Collection "${collectionName}" not found, creating a new one.`);
    return new Chroma(embeddings, { collectionName, url: CHROMA_URL });
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
    var context = results.map(r => r.pageContent).join('\n\n');
    context = context + `category,question,answer
lab_number,название лабораторной работы номер 1,"изучение возможностей html и css при создании web-страниц"
lab_goal,цель лабораторной работы номер 1,"сформировать знание о структуре html-документа и основных тегах, сформировать понятие о листах стилей, способах создания и применения стилей для элементов web-страницы."
lab_number,название лабораторной работы номер 2,"изучение особенностей вёрстки макета web-страницы"
lab_goal,цель лабораторной работы номер 2,"закрепить на практике знания и навыки о возможностях использования html5 и css3 для разработки макета web-страницы."
lab_number,название лабораторной работы номер 3,"изучение этапов работы с web-сервером"
lab_goal,цель лабораторной работы номер 3,"сформировать понятие о компонентах web-сервера на базе технологий apache, php, mysql. приобрести умения устанавливать компоненты и конфигурировать web-сервер на базе технологий apache, php, mysql."
lab_number,название лабораторной работы номер 4,"изучение возможностей cms"
lab_goal,цель лабораторной работы номер 4,"сформировать понятие о видах, компонентах, функциональных возможностях cms."
lab_number,название лабораторной работы номер 5,"написание сайта на основе cms"
lab_goal,цель лабораторной работы номер 5,"сформировать навыки создания web-проекта в изученной cms."
lab_number,название лабораторной работы номер 6,"написание обработчиков событий в javascript"
lab_goal,цель лабораторной работы номер 6,"сформировать умения создания и использования обработчиков событий, осуществлять доступ к элементам страницы средствами javascript."
lab_number,название лабораторной работы номер 7,"изучение взаимодействия с элементами формы в javascript"
lab_goal,цель лабораторной работы номер 7,"сформировать навыки разработки скриптов по обработке данных из html-форм."
lab_number,название лабораторной работы номер 8, "написание программ с использованием встроенные объекты в javascript"
lab_goal,цель лабораторной работы номер 8, "сформировать умения создавать скрипты с использованием встроенных объектов в javascript"
lab_number, название лабораторной работы номер 9, "изучение использования объектно-ориентированного программирования в javascript"
lab_goal, цель лабораторной работы номер 9, "сформировать практический навык по реализации объектно-ориентированного программирования в javascript."
lab_number, название лабораторной работы номер 10, "написание web-страниц на php"
lab_goal, цель лабораторной работы номер 10, "сформировать навыки разработки веб-страницы на языке php с использованием массивов и пользовательских функций."
lab_number, название лабораторной работы номер 11, "изучение передачи данных из пользовательских форм"
lab_goal, цель лабораторной работы номер 11, "сформировать навыки получения доступа к данным из пользовательских форм, отправки полученных данных на сервер и обработки."
lab_number, название лабораторной работы номер 12,"изучение использования сессий и cookies"
lab_goal, цель лабораторной работы номер 12,"сформировать навыки получения доступа к данные сеанса работы пользователя при помощи механизмов cookis и сессий."
lab_number, название лабораторной работы номер  13, "написание php-скриптов для работы с субд"
lab_goal, цель лабораторной работы номер  13, "сформировать навыки работы с базами данных,осуществлять выборку данных из базы данных и выводить результат на веб-страницу, а также реализовывать поиск на основе критериев, введенных через html-формы."
lab_number, название лабораторной работы номер 14,"изучение обработки данных в формате json"
lab_goal, цель лабораторной работы номер 14, "сформировать практический навык по обработке данных в формате json."
lab_number, название лабораторной работы номер 15, "изучение использования объектно-ориентированного программирования в php"
lab_goal, цель лабораторной работы номер 15, "сформировать навыки работы с объектно-ориентированным программированием при создании web-страниц."
lab_number, название лабораторной работы номер 16, "изучение работы с программой на java"
lab_goal, цель лабораторной работы номер 16, "сформировать умения установки jdk, а также компиляции и выполнения программ на языке java; сформировать умения программирования линейных алгоритмов на языке java с использованием вывода данных."
lab_number, название лабораторной работы номер 17, "написание основных конструкций языка java"
lab_goal, цель лабораторной работы номер 17, "сформировать умения использовать условные и циклические операторы в языке java."
lab_number, название лабораторной работы номер 18, "исследование инструментов ввода и вывода данных"
lab_goal, цель лабораторной работы номер 18, "научить использовать средства ввода данных языка java scaner и dialogbox, а также организовывать файловый ввод/вывод данны."
lab_number, название лабораторной работы номер 19, "написание программы для работы с массивами в java"
lab_goal, цель лабораторной работы номер 19, "сформировать знания об описании и инициализации, порядке размещения в памяти одно- и двумерных массивов, о доступе к элементам массива, и их обработке в языке java; сформировать навыки решения задач с использованием массивов на языке java."
lab_number, название лабораторной работы номер 20, "написание программы для работы со строками в java"
lab_goal, цель лабораторной работы номер 20, "сформировать знания об особенностях обработки строковых данных в языке java, а также о методах классах java.lang.string по обработке строковых данных; сформировать навыки решения задач по обработке символьных строк на языке java."
lab_number,название лабораторной работы номер 21,"изучение особенностей построения классов в java"
lab_goal,цель лабораторной работы номер 21,"сформировать умения разработки программ с применением пользовательских классов."
lab_number,название лабораторной работы номер 22, "исследование наследования и полиморфизма"
lab_goal,цель лабораторной работы номер 22, "сформировать навыки работы с объектно-ориентированным программированием."
lab_number, название лабораторной работы номер 23, "написание программ с использованием коллекций"
lab_goal,цель лабораторной работы номер 23, "сформировать навыки работы с коллекциями."
lab_number, название лабораторной работы номер 24, "написание графического пользовательского интерфейса"
lab_goal,цель лабораторной работы номер 24, "сформировать навыки работы по созданию графического пользовательского интерфейса."
lab_number, название лабораторной работы номер 25,"изучение обработки событий в java"
lab_goal,цель лабораторной работы номер 25,"сформировать навыки работы по обработке событий."
lab_number, название лабораторной работы номер 26,"изучение работы с базами данных в java"
lab_goal,цель лабораторной работы номер 26,"сформировать навыки работы с базами данных."`

    // Build a prompt using the context and user query
    const prompt = `Инструкции:
- Ты чат бот помощник для студентов. Я предоставлю тебе методические указания для выполнения лабораторных работ, и ты должен помочь, не давая прямых ответов, а лишь наводя на размышления.
- Если речь идёт о предоставленном методическом материале, вместо слова "контекст" используй "методические указания".
- Будь полезен и отвечай, используя предоставленный материал; если не знаешь ответа, скажи "Я не знаю".
- Не давай слишком прямых ответов, наводи студентов на мысли и помогай найти решение
Контекст:
${context}

Вопрос: ${message}
Ответ:`;
    
    const result = await model.invoke(prompt);
    res.json({ response: result.content });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
